# Client-Side LLM Data Anonymizer

Client-Side LLM Data Anonymizer is an experimental local web app for finding and masking personal or sensitive data before files are shared with an LLM or another external system.

The project is built around a privacy-first idea: source files are imported in the browser, analyzed locally with Chrome's Prompt API, reviewed by a human, and only written back out when the user explicitly exports anonymized results or an audit report.

## Current Scope

The current implementation focuses on the first complete workflow for JSON documents:

1. Import a JSON file.
2. Parse primitive values and track their JSON paths.
3. Check whether Chrome's local Prompt API is available.
4. Ask the local model to suggest personal or sensitive data findings.
5. Let the user approve, ignore, or change the action for each finding.
6. Export anonymized JSON and a JSON report.

The design documents also describe future image and PDF support, but this repository currently implements the JSON foundation.

## Tech Stack

- React
- TypeScript
- Vite
- Vitest
- React Testing Library
- Chrome Prompt API integration through a small local adapter

## Development Commands

Install dependencies:

```sh
npm install
```

Start the Vite development server:

```sh
npm run dev
```

Run all tests once:

```sh
npm test
```

Run tests in watch mode:

```sh
npm run test:watch
```

Create a production build:

```sh
npm run build
```

Run a specific test file:

```sh
npm test -- src/ai/jsonPiiAnalyzer.test.ts
```

## Local AI Requirements

Analysis depends on Chrome's experimental Prompt API. In browsers or environments where `LanguageModel` is unsupported, unavailable, or still downloading, the app still allows JSON import and preview, but Prompt API analysis is blocked.

The app does not include a cloud fallback. That is intentional: the prototype is meant to keep source data and model analysis inside the user's local browser session.

## Useful Project Areas

- `src/App.tsx` wires the import, analysis, review, preview, and export workflow.
- `src/ai/promptApi.ts` contains the Chrome Prompt API availability and session boundary.
- `src/ai/jsonPiiAnalyzer.ts` builds the JSON analysis prompt and validates model responses.
- `src/documents/json/jsonAdapter.ts` parses JSON and records analyzable JSON paths.
- `src/review/reviewReducer.ts` manages human review state and replacement values.
- `src/export/jsonMasker.ts` applies approved anonymization actions.
- `src/export/report.ts` builds the export report.
- `docs/superpowers/specs/2026-06-25-client-side-data-anonymizer-design.md` captures the larger product direction.
