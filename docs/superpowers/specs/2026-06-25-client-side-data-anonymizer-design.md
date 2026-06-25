# Client-Side Data Anonymizer Design

Date: 2026-06-25

## Goal

Build an experimental, fully client-side data anonymizer and masker as a local web app using Chrome's Prompt API. The app accepts PDFs, images, and JSON files, identifies personal or sensitive information, and lets the user approve either redaction or replacement before exporting anonymized outputs.

The first version is a privacy-preserving prototype, not a hosted service. Source files, extracted text, findings, and replacement maps live only in memory. The app only writes data when the user explicitly exports anonymized files or reports.

## Product Decisions

- App shape: local web app.
- Workflow: human-approved changes only.
- Architecture: pipeline app.
- Supported initial inputs: PDF, images, JSON.
- Output strategy: JSON and images export transformed files; PDFs export as page-image redacted PDFs.
- Replacement options: redact, replace with type label, replace with consistent fake value, or ignore.
- AI support: Chrome Prompt API only. If the API or model is unavailable, analysis is blocked.
- Locale scope: English plus German/EU data patterns and categories.
- Persistence: export-only. No history or project storage between sessions.

## Architecture

The app has five layers.

### Document Adapters

Document adapters ingest each supported file type and turn it into a common document model.

- PDF adapter renders pages to images and extracts text when a text layer is available.
- Image adapter loads images and prepares them for visual analysis and masking.
- JSON adapter parses structured data and tracks stable JSON paths for each analyzable value.

### Prompt API Analyzer

The Prompt API analyzer is the only AI analyzer in version 1.

On startup, the app checks `LanguageModel.availability()` with the text and image options needed by the analyzer. If the model is unavailable, unsupported, or still downloading, the UI shows the readiness state and blocks analysis until the model is ready.

The analyzer sends scoped prompts per document unit:

- JSON: key/value chunks with JSON path context.
- PDF: extracted page text when available, plus rendered page images for visual-only content.
- Image: image inputs for visual analysis.

The app treats AI output as suggestions. It validates and normalizes findings before showing them to the user.

### Finding Model

All document types normalize detected sensitive data into a shared finding model.

Each finding includes:

- Category, such as name, address, phone, email, IBAN, BIC, credit card, government ID, date of birth, organization, or other sensitive value.
- Original value when textual and available.
- Confidence when supplied or inferred.
- Source document and source unit.
- Location, using JSON path, text range, page bounding region, or image bounding region depending on document type.
- Detection source: JSON path analysis, text analysis, or visual analysis.
- Review status: pending, approved, ignored, or needs location review.
- Suggested action and selected action.

### Review Workspace

The review workspace is the main user experience. It groups findings by document and category, shows source previews, and lets the user approve changes before export.

Supported actions are:

- Redact.
- Replace with type label, such as `[NAME]`, `[ADDRESS]`, or `[IBAN]`.
- Replace with consistent fake value.
- Ignore.

Findings start as pending. Selecting a finding highlights its source location when possible. The user can approve individual findings, bulk approve by category, ignore findings, or change the selected action.

### Export Engine

The export engine applies only approved actions.

- JSON exports as anonymized JSON plus a report.
- Images export as masked images plus a report.
- PDFs export as page-image redacted PDFs plus a report.

PDF export in version 1 does not attempt to preserve editable text or original layout internals. It renders pages, applies masks or overlays, and writes a new visual PDF.

## Data Flow

1. The user drops one or more files into the app.
2. The app validates supported file types: PDF, image, and JSON.
3. Each file adapter creates a local document source.
4. The Prompt API analyzer runs per document unit once the model is available.
5. Analyzer responses are parsed, validated, and normalized into findings.
6. Invalid categories, impossible paths, unusable coordinates, and malformed responses are rejected or flagged.
7. The user reviews findings and chooses actions.
8. The masking engine applies only approved actions.
9. The user exports anonymized files and an audit report.

Consistent replacements use an in-memory map keyed by normalized original value plus category. The same detected person, IBAN, phone number, or address receives the same fake replacement throughout the current browser session. The map disappears when the tab closes.

## User Interface

The first screen is the tool itself, not a landing page. The interface should feel like a quiet workbench for sensitive documents.

Primary regions:

- Import area and Prompt API readiness status.
- Document preview with file and page switching.
- Findings panel grouped by category and document.
- Filters for pending, approved, ignored, and needs location review.
- Bulk actions by category.
- Export controls and export readiness summary.

Before export, the app shows a compact summary:

- Number of findings.
- Number of approved findings.
- Number of ignored findings.
- Findings that cannot be applied automatically.
- Output files that will be generated.

For PDFs and images, visual masking should be obvious. Redaction uses black rectangles. Label and fake-value replacements use overlay text where practical. For JSON, the app shows a tree or table preview with modified values clearly marked.

## Error Handling And Trust

The app should be explicit whenever it cannot make a trustworthy transformation.

- If the Prompt API is unavailable, unsupported, disabled, or downloading, analysis is blocked with setup and status messaging.
- If a file cannot be parsed, it remains in the file list with an error state and no analysis runs for that file.
- If PDF text extraction and visual analysis disagree, both findings can appear. The UI marks duplicates and overlaps for review instead of aggressively merging them.
- If an AI finding cannot be mapped back to a source location, it appears in a needs-location-review state for textual documents.
- Findings without usable regions cannot be automatically applied to image or PDF outputs in version 1.
- If export fails for one document, other ready documents can still export, and the report notes the failure.

Every report includes:

- Source filename.
- Finding category.
- Original value when available.
- Chosen action.
- Replacement value when applicable.
- Detection source: text, visual, or JSON path.
- Export status or failure details.

Reports are generated only when the user exports.

## Milestones

### Milestone 1: Foundation And JSON

Build the app shell, Prompt API availability gate, file import, shared document/finding/action models, JSON adapter, review flow, JSON masking, and report export.

This milestone proves the first complete loop: JSON in, Prompt API findings, human review, anonymized JSON and report out.

### Milestone 2: Images

Add the image adapter, image Prompt API input, region-based findings, preview highlighting, redaction and replacement overlays, and masked image export.

### Milestone 3: PDFs

Add PDF page rendering, text extraction where available, page-image Prompt API analysis, page preview review, page overlays, and page-image redacted PDF export.

## Testing Strategy

Tests should focus on deterministic app behavior rather than trying to test Gemini Nano itself.

Unit tests:

- Prompt API availability state handling.
- Finding normalization and validation.
- Replacement consistency.
- Action application.
- JSON path masking.
- Report generation.
- Export readiness summaries.

Adapter tests:

- JSON parsing and path tracking with small fixtures.
- Image metadata and canvas preparation.
- PDF page extraction and rendering boundaries once PDF support is added.

Integration tests:

- JSON import, fake analyzer response, review actions, anonymized export, and report export.
- Image import, fake region findings, approved masking, and export readiness.
- PDF import, fake page findings, approved masking, and redacted PDF export once PDF support exists.

Browser smoke tests:

- File import.
- Prompt API readiness gate.
- Review state changes.
- Bulk category action.
- Export readiness and export trigger.

The Prompt API sits behind an analyzer interface so tests can inject fake analyzer responses.

## Out Of Scope For Version 1

- Hosted processing or server-side AI.
- Persistent project history.
- Browser extension packaging.
- Fully editable PDF preservation.
- Manual region drawing for unmapped image or PDF findings.
- Non-PDF office document formats.
- Automatic application of findings without user review.
- Rule-based or cloud fallback when Prompt API is unavailable.

## Open Implementation Notes

- The app should check the current Chrome Prompt API surface during implementation because the API is experimental and may change.
- The UI should clearly state that all analysis is local to supported Chrome environments.
- `.superpowers/` should be ignored if the visual brainstorming companion is used later.
