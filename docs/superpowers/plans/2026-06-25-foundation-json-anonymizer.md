# Foundation JSON Anonymizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first shippable loop for the client-side anonymizer: JSON import, Chrome Prompt API readiness, AI-suggested findings, human review, anonymized JSON export, and report export.

**Architecture:** Create a Vite React TypeScript app with a small domain core, a Prompt API adapter boundary, a JSON document adapter, a review reducer, and export utilities. The Chrome Prompt API is accessed only through `src/ai/promptApi.ts`, so tests can use fake analyzer responses and never depend on Gemini Nano.

**Tech Stack:** Vite, React, TypeScript, Vitest, React Testing Library, jsdom, `lucide-react`, and a local Prompt API type subset for the exact Chrome AI surface used by the app.

---

## Scope

This plan implements Milestone 1 from the approved design spec: Foundation And JSON.

Included:

- Project scaffold.
- Prompt API availability gate.
- JSON file import and parsing.
- Shared finding/action models.
- Prompt API JSON analyzer boundary.
- Human review state.
- JSON masking.
- Report generation.
- Basic workbench UI.
- Unit and integration tests for deterministic behavior.

Excluded from this plan:

- Image analysis and image export.
- PDF rendering, text extraction, and PDF export.
- Persistent project history.
- Rule-based fallback when Prompt API is unavailable.
- Browser extension packaging.

Reference checked during planning:

- Chrome Prompt API docs: `https://developer.chrome.com/docs/ai/prompt-api`
- Current API notes used in this plan: `LanguageModel.availability(options)`, `LanguageModel.create(options)`, `expectedInputs`, `expectedOutputs`, text/image modality options, download progress through `monitor`, and text-only output.

## File Structure

Create these files:

- `package.json`: scripts and dependencies.
- `index.html`: Vite entry HTML.
- `tsconfig.json`: TypeScript project settings.
- `tsconfig.node.json`: Vite config TypeScript settings.
- `vite.config.ts`: Vite and Vitest config.
- `src/main.tsx`: React entry point.
- `src/App.tsx`: top-level app composition.
- `src/App.test.tsx`: workbench smoke tests.
- `src/styles.css`: application styling.
- `src/types/chrome-ai.d.ts`: local Prompt API typing for the subset the app uses.
- `src/domain/types.ts`: document, finding, review action, export report types.
- `src/domain/findingValidation.ts`: finding validation and normalization.
- `src/domain/findingValidation.test.ts`: validation tests.
- `src/ai/promptApi.ts`: Prompt API availability and session wrapper.
- `src/ai/promptApi.test.ts`: availability and session tests with mocked `LanguageModel`.
- `src/ai/jsonPiiAnalyzer.ts`: JSON prompt construction and response parsing.
- `src/ai/jsonPiiAnalyzer.test.ts`: analyzer tests using a fake session.
- `src/documents/json/jsonAdapter.ts`: JSON parsing and path flattening.
- `src/documents/json/jsonAdapter.test.ts`: JSON adapter tests.
- `src/review/reviewReducer.ts`: review state transitions and replacement map behavior.
- `src/review/reviewReducer.test.ts`: review reducer tests.
- `src/export/jsonMasker.ts`: apply approved actions to JSON values.
- `src/export/jsonMasker.test.ts`: masking tests.
- `src/export/report.ts`: export report generation.
- `src/export/report.test.ts`: report tests.
- `src/ui/FileImporter.tsx`: JSON import control.
- `src/ui/PromptStatus.tsx`: Prompt API readiness display.
- `src/ui/JsonPreview.tsx`: original/anonymized JSON preview.
- `src/ui/FindingsPanel.tsx`: review controls.
- `src/ui/ExportPanel.tsx`: export controls.

The workspace is not a git repository at planning time. If the worker wants commits, run `git init` before Task 1 and commit after each task. If no repository is initialized, skip commit steps and continue recording completed checkboxes in this plan.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/App.test.tsx`
- Create: `src/styles.css`

- [ ] **Step 1: Create package metadata and scripts**

Create `package.json`:

```json
{
  "name": "client-side-llm-data-anonymizer",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "lucide-react": "^1.21.0",
    "react": "^19.2.7",
    "react-dom": "^19.2.7"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.3",
    "jsdom": "^29.1.1",
    "typescript": "^6.0.3",
    "vite": "^8.1.0",
    "vitest": "^4.1.9"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 3: Add TypeScript and Vite config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

Create `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

- [ ] **Step 4: Add the initial React app shell test**

Create `src/App.test.tsx`:

```tsx
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('renders the anonymizer workbench', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /client-side data anonymizer/i })).toBeInTheDocument();
    expect(screen.getByText(/prompt api status/i)).toBeInTheDocument();
    expect(screen.getByText(/import json/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run the shell test and verify it fails**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL because `src/App.tsx` does not exist yet.

- [ ] **Step 6: Add the minimal app shell**

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Client-Side Data Anonymizer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Create `src/App.tsx`:

```tsx
export function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Local Chrome AI experiment</p>
          <h1>Client-Side Data Anonymizer</h1>
        </div>
        <section aria-label="Prompt API Status" className="status-pill">
          Prompt API status: checking
        </section>
      </header>

      <section className="workbench-grid">
        <section className="panel">
          <h2>Import JSON</h2>
          <p>Drop or choose a JSON file to start a local review session.</p>
        </section>
        <section className="panel">
          <h2>Document Preview</h2>
          <pre>{'{}'}</pre>
        </section>
        <section className="panel">
          <h2>Findings</h2>
          <p>No findings yet.</p>
        </section>
      </section>
    </main>
  );
}
```

Create `src/styles.css`:

```css
:root {
  color: #17201a;
  background: #f6f7f2;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
}

body {
  margin: 0;
  min-width: 320px;
}

button,
input,
select {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
  padding: 24px;
}

.app-header {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  margin: 0 auto 24px;
  max-width: 1280px;
}

.app-header h1 {
  font-size: 32px;
  letter-spacing: 0;
  margin: 4px 0 0;
}

.eyebrow {
  color: #56705c;
  font-size: 13px;
  font-weight: 700;
  margin: 0;
  text-transform: uppercase;
}

.status-pill {
  background: #e7efe5;
  border: 1px solid #bfd0bc;
  border-radius: 999px;
  color: #223b27;
  padding: 10px 14px;
}

.workbench-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(240px, 320px) minmax(0, 1fr) minmax(280px, 360px);
  margin: 0 auto;
  max-width: 1280px;
}

.panel {
  background: #ffffff;
  border: 1px solid #d8ded2;
  border-radius: 8px;
  min-height: 220px;
  padding: 16px;
}

.panel h2 {
  font-size: 18px;
  letter-spacing: 0;
  margin: 0 0 12px;
}

pre {
  background: #111814;
  border-radius: 6px;
  color: #edf5ec;
  overflow: auto;
  padding: 12px;
}

@media (max-width: 900px) {
  .app-header,
  .workbench-grid {
    grid-template-columns: 1fr;
  }

  .app-header {
    align-items: stretch;
    flex-direction: column;
  }
}
```

- [ ] **Step 7: Add Vitest setup file**

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 8: Run scaffold verification**

Run: `npm test -- src/App.test.tsx`

Expected: PASS.

Run: `npm run build`

Expected: PASS and `dist/` is created.

- [ ] **Step 9: Commit scaffold if git is initialized**

Run:

```bash
git add package.json package-lock.json index.html tsconfig.json tsconfig.node.json vite.config.ts src
git commit -m "chore: scaffold client-side anonymizer app"
```

Expected: commit succeeds if the repository was initialized.

---

### Task 2: Domain Types And Finding Validation

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/findingValidation.ts`
- Create: `src/domain/findingValidation.test.ts`

- [ ] **Step 1: Write finding validation tests**

Create `src/domain/findingValidation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { normalizeFinding } from './findingValidation';

describe('normalizeFinding', () => {
  it('accepts a valid JSON path finding', () => {
    const finding = normalizeFinding({
      id: 'raw-1',
      category: 'iban',
      originalValue: 'DE89370400440532013000',
      confidence: 0.92,
      location: { kind: 'json-path', path: '$.customer.iban' },
      detectionSource: 'json-path',
    });

    expect(finding).toEqual({
      id: 'raw-1',
      category: 'iban',
      originalValue: 'DE89370400440532013000',
      confidence: 0.92,
      location: { kind: 'json-path', path: '$.customer.iban' },
      detectionSource: 'json-path',
      reviewStatus: 'pending',
      selectedAction: 'replace-label',
      replacementValue: undefined,
    });
  });

  it('rejects unsupported categories', () => {
    expect(() =>
      normalizeFinding({
        id: 'raw-2',
        category: 'favorite_color',
        originalValue: 'green',
        confidence: 0.7,
        location: { kind: 'json-path', path: '$.favoriteColor' },
        detectionSource: 'json-path',
      }),
    ).toThrow(/unsupported category/i);
  });

  it('rejects JSON findings without JSON paths', () => {
    expect(() =>
      normalizeFinding({
        id: 'raw-3',
        category: 'email',
        originalValue: 'nora@example.test',
        confidence: 0.8,
        location: { kind: 'none' },
        detectionSource: 'json-path',
      }),
    ).toThrow(/json path/i);
  });
});
```

- [ ] **Step 2: Run the validation test and verify it fails**

Run: `npm test -- src/domain/findingValidation.test.ts`

Expected: FAIL because domain files do not exist.

- [ ] **Step 3: Add shared domain types**

Create `src/domain/types.ts`:

```ts
export const PII_CATEGORIES = [
  'name',
  'address',
  'phone',
  'email',
  'iban',
  'bic',
  'credit-card',
  'government-id',
  'date-of-birth',
  'organization',
  'other-sensitive',
] as const;

export type PiiCategory = (typeof PII_CATEGORIES)[number];

export type DetectionSource = 'json-path' | 'text' | 'visual';

export type ReviewStatus = 'pending' | 'approved' | 'ignored' | 'needs-location-review';

export type MaskingAction = 'redact' | 'replace-label' | 'replace-fake' | 'ignore';

export type FindingLocation =
  | { kind: 'json-path'; path: string }
  | { kind: 'text-range'; start: number; end: number }
  | { kind: 'region'; page?: number; x: number; y: number; width: number; height: number }
  | { kind: 'none' };

export interface Finding {
  id: string;
  category: PiiCategory;
  originalValue?: string;
  confidence: number;
  location: FindingLocation;
  detectionSource: DetectionSource;
  reviewStatus: ReviewStatus;
  selectedAction: MaskingAction;
  replacementValue?: string;
}

export interface DocumentSource {
  id: string;
  fileName: string;
  mediaType: 'application/json' | 'image' | 'application/pdf';
}

export interface JsonDocumentSource extends DocumentSource {
  mediaType: 'application/json';
  rawText: string;
  data: unknown;
  values: JsonValueNode[];
}

export interface JsonValueNode {
  path: string;
  value: string | number | boolean | null;
  parentKey?: string;
}

export interface ExportReportEntry {
  sourceFileName: string;
  findingId: string;
  category: PiiCategory;
  originalValue?: string;
  action: MaskingAction;
  replacementValue?: string;
  detectionSource: DetectionSource;
  status: 'exported' | 'ignored' | 'not-applied';
}
```

- [ ] **Step 4: Add finding validation implementation**

Create `src/domain/findingValidation.ts`:

```ts
import {
  Finding,
  FindingLocation,
  MaskingAction,
  PII_CATEGORIES,
  PiiCategory,
} from './types';

interface RawFinding {
  id?: unknown;
  category?: unknown;
  originalValue?: unknown;
  confidence?: unknown;
  location?: unknown;
  detectionSource?: unknown;
  selectedAction?: unknown;
}

const DEFAULT_ACTION_BY_CATEGORY: Record<PiiCategory, MaskingAction> = {
  name: 'replace-fake',
  address: 'replace-fake',
  phone: 'replace-label',
  email: 'replace-label',
  iban: 'replace-label',
  bic: 'replace-label',
  'credit-card': 'redact',
  'government-id': 'redact',
  'date-of-birth': 'replace-label',
  organization: 'replace-fake',
  'other-sensitive': 'redact',
};

export function normalizeFinding(raw: RawFinding): Finding {
  const category = normalizeCategory(raw.category);
  const location = normalizeLocation(raw.location);
  const detectionSource = normalizeDetectionSource(raw.detectionSource);

  if (detectionSource === 'json-path' && location.kind !== 'json-path') {
    throw new Error('JSON path findings must include a JSON path location.');
  }

  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : crypto.randomUUID(),
    category,
    originalValue: typeof raw.originalValue === 'string' ? raw.originalValue : undefined,
    confidence: normalizeConfidence(raw.confidence),
    location,
    detectionSource,
    reviewStatus: 'pending',
    selectedAction: normalizeAction(raw.selectedAction, category),
    replacementValue: undefined,
  };
}

function normalizeCategory(value: unknown): PiiCategory {
  if (typeof value !== 'string') {
    throw new Error('Finding category must be a string.');
  }

  if (!PII_CATEGORIES.includes(value as PiiCategory)) {
    throw new Error(`Unsupported category: ${value}`);
  }

  return value as PiiCategory;
}

function normalizeConfidence(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0.5;
  }

  return Math.min(1, Math.max(0, value));
}

function normalizeDetectionSource(value: unknown): Finding['detectionSource'] {
  if (value === 'json-path' || value === 'text' || value === 'visual') {
    return value;
  }

  throw new Error('Finding detection source must be json-path, text, or visual.');
}

function normalizeAction(value: unknown, category: PiiCategory): MaskingAction {
  if (value === 'redact' || value === 'replace-label' || value === 'replace-fake' || value === 'ignore') {
    return value;
  }

  return DEFAULT_ACTION_BY_CATEGORY[category];
}

function normalizeLocation(value: unknown): FindingLocation {
  if (!value || typeof value !== 'object') {
    return { kind: 'none' };
  }

  const candidate = value as Record<string, unknown>;

  if (candidate.kind === 'json-path' && typeof candidate.path === 'string' && candidate.path.startsWith('$')) {
    return { kind: 'json-path', path: candidate.path };
  }

  if (
    candidate.kind === 'text-range' &&
    typeof candidate.start === 'number' &&
    typeof candidate.end === 'number' &&
    candidate.start >= 0 &&
    candidate.end > candidate.start
  ) {
    return { kind: 'text-range', start: candidate.start, end: candidate.end };
  }

  if (
    candidate.kind === 'region' &&
    typeof candidate.x === 'number' &&
    typeof candidate.y === 'number' &&
    typeof candidate.width === 'number' &&
    typeof candidate.height === 'number' &&
    candidate.width > 0 &&
    candidate.height > 0
  ) {
    return {
      kind: 'region',
      page: typeof candidate.page === 'number' ? candidate.page : undefined,
      x: candidate.x,
      y: candidate.y,
      width: candidate.width,
      height: candidate.height,
    };
  }

  return { kind: 'none' };
}
```

- [ ] **Step 5: Run validation tests**

Run: `npm test -- src/domain/findingValidation.test.ts`

Expected: PASS.

- [ ] **Step 6: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 7: Commit domain foundation if git is initialized**

Run:

```bash
git add src/domain
git commit -m "feat: add finding domain model"
```

Expected: commit succeeds if the repository was initialized.

---

### Task 3: Prompt API Availability Boundary

**Files:**
- Create: `src/types/chrome-ai.d.ts`
- Create: `src/ai/promptApi.ts`
- Create: `src/ai/promptApi.test.ts`

- [ ] **Step 1: Write Prompt API boundary tests**

Create `src/ai/promptApi.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkPromptApiStatus, createPromptSession } from './promptApi';

describe('promptApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(globalThis, 'LanguageModel');
  });

  it('reports unsupported when LanguageModel is missing', async () => {
    await expect(checkPromptApiStatus()).resolves.toEqual({
      state: 'unsupported',
      message: 'Chrome Prompt API is not available in this browser.',
    });
  });

  it('passes expected modalities and languages to availability', async () => {
    const availability = vi.fn().mockResolvedValue('available');
    vi.stubGlobal('LanguageModel', { availability });

    await expect(checkPromptApiStatus()).resolves.toEqual({
      state: 'available',
      message: 'Chrome Prompt API model is ready.',
    });

    expect(availability).toHaveBeenCalledWith({
      expectedInputs: [
        { type: 'text', languages: ['en', 'de'] },
        { type: 'image' },
      ],
      expectedOutputs: [{ type: 'text', languages: ['en'] }],
    });
  });

  it('reports downloading status', async () => {
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('downloading'),
    });

    await expect(checkPromptApiStatus()).resolves.toEqual({
      state: 'downloading',
      message: 'Chrome is downloading the local model.',
    });
  });

  it('creates a session with download monitoring', async () => {
    const addEventListener = vi.fn();
    const create = vi.fn().mockImplementation(({ monitor }) => {
      monitor({ addEventListener });
      return Promise.resolve({ prompt: vi.fn() });
    });
    vi.stubGlobal('LanguageModel', {
      create,
      availability: vi.fn().mockResolvedValue('available'),
    });

    const onDownloadProgress = vi.fn();
    const session = await createPromptSession(onDownloadProgress);

    expect(session).toHaveProperty('prompt');
    expect(addEventListener).toHaveBeenCalledWith('downloadprogress', expect.any(Function));
  });
});
```

- [ ] **Step 2: Run Prompt API tests and verify they fail**

Run: `npm test -- src/ai/promptApi.test.ts`

Expected: FAIL because `src/ai/promptApi.ts` does not exist.

- [ ] **Step 3: Add Prompt API subset typing**

Create `src/types/chrome-ai.d.ts`:

```ts
type PromptAvailability = 'available' | 'downloadable' | 'downloading' | 'unavailable';

interface PromptExpectedInput {
  type: 'text' | 'image';
  languages?: string[];
}

interface PromptExpectedOutput {
  type: 'text';
  languages?: string[];
}

interface PromptMessageTextPart {
  type: 'text';
  value: string;
}

interface PromptMessageImagePart {
  type: 'image';
  value: Blob | HTMLCanvasElement | HTMLImageElement | ImageBitmap | ImageData | OffscreenCanvas;
}

type PromptMessageContent = string | Array<PromptMessageTextPart | PromptMessageImagePart>;

interface PromptMessage {
  role: 'system' | 'user' | 'assistant';
  content: PromptMessageContent;
  prefix?: boolean;
}

interface PromptCreateOptions {
  expectedInputs?: PromptExpectedInput[];
  expectedOutputs?: PromptExpectedOutput[];
  signal?: AbortSignal;
  monitor?: (monitor: EventTarget) => void;
}

interface PromptSession {
  prompt(input: string | PromptMessage[]): Promise<string>;
  destroy?: () => void;
}

interface LanguageModelApi {
  availability(options?: PromptCreateOptions): Promise<PromptAvailability>;
  create(options?: PromptCreateOptions): Promise<PromptSession>;
}

declare global {
  var LanguageModel: LanguageModelApi | undefined;
}

export {};
```

- [ ] **Step 4: Add Prompt API implementation**

Create `src/ai/promptApi.ts`:

```ts
export type PromptApiState = 'available' | 'downloadable' | 'downloading' | 'unsupported' | 'unavailable';

export interface PromptApiStatus {
  state: PromptApiState;
  message: string;
}

export const PROMPT_API_OPTIONS = {
  expectedInputs: [
    { type: 'text' as const, languages: ['en', 'de'] },
    { type: 'image' as const },
  ],
  expectedOutputs: [{ type: 'text' as const, languages: ['en'] }],
};

export async function checkPromptApiStatus(): Promise<PromptApiStatus> {
  if (!globalThis.LanguageModel) {
    return {
      state: 'unsupported',
      message: 'Chrome Prompt API is not available in this browser.',
    };
  }

  const availability = await globalThis.LanguageModel.availability(PROMPT_API_OPTIONS);

  if (availability === 'available') {
    return { state: 'available', message: 'Chrome Prompt API model is ready.' };
  }

  if (availability === 'downloadable') {
    return {
      state: 'downloadable',
      message: 'Chrome can download the local model after user activation.',
    };
  }

  if (availability === 'downloading') {
    return { state: 'downloading', message: 'Chrome is downloading the local model.' };
  }

  return {
    state: 'unavailable',
    message: 'Chrome Prompt API model is unavailable on this device or origin.',
  };
}

export async function createPromptSession(
  onDownloadProgress?: (progressPercent: number) => void,
): Promise<PromptSession> {
  if (!globalThis.LanguageModel) {
    throw new Error('Chrome Prompt API is not available in this browser.');
  }

  return globalThis.LanguageModel.create({
    ...PROMPT_API_OPTIONS,
    monitor(monitor) {
      monitor.addEventListener('downloadprogress', (event) => {
        const progress = event as Event & { loaded?: number };
        onDownloadProgress?.(Math.round((progress.loaded ?? 0) * 100));
      });
    },
  });
}
```

- [ ] **Step 5: Run Prompt API tests**

Run: `npm test -- src/ai/promptApi.test.ts`

Expected: PASS.

- [ ] **Step 6: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 7: Commit Prompt API boundary if git is initialized**

Run:

```bash
git add src/types src/ai
git commit -m "feat: add prompt api availability boundary"
```

Expected: commit succeeds if the repository was initialized.

---

### Task 4: JSON Document Adapter

**Files:**
- Create: `src/documents/json/jsonAdapter.ts`
- Create: `src/documents/json/jsonAdapter.test.ts`

- [ ] **Step 1: Write JSON adapter tests**

Create `src/documents/json/jsonAdapter.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseJsonDocument } from './jsonAdapter';

describe('parseJsonDocument', () => {
  it('parses JSON and flattens primitive values with stable paths', async () => {
    const file = new File(
      [
        JSON.stringify({
          customer: {
            name: 'Nora Weber',
            iban: 'DE89370400440532013000',
            tags: ['vip', 'newsletter'],
          },
          active: true,
        }),
      ],
      'customer.json',
      { type: 'application/json' },
    );

    const document = await parseJsonDocument(file);

    expect(document.fileName).toBe('customer.json');
    expect(document.mediaType).toBe('application/json');
    expect(document.values).toEqual([
      { path: '$.customer.name', parentKey: 'name', value: 'Nora Weber' },
      { path: '$.customer.iban', parentKey: 'iban', value: 'DE89370400440532013000' },
      { path: '$.customer.tags[0]', parentKey: 'tags', value: 'vip' },
      { path: '$.customer.tags[1]', parentKey: 'tags', value: 'newsletter' },
      { path: '$.active', parentKey: 'active', value: true },
    ]);
  });

  it('throws a readable error for invalid JSON', async () => {
    const file = new File(['{"broken":'], 'broken.json', { type: 'application/json' });

    await expect(parseJsonDocument(file)).rejects.toThrow(/could not parse json/i);
  });
});
```

- [ ] **Step 2: Run JSON adapter tests and verify they fail**

Run: `npm test -- src/documents/json/jsonAdapter.test.ts`

Expected: FAIL because `jsonAdapter.ts` does not exist.

- [ ] **Step 3: Implement JSON adapter**

Create `src/documents/json/jsonAdapter.ts`:

```ts
import { JsonDocumentSource, JsonValueNode } from '../../domain/types';

export async function parseJsonDocument(file: File): Promise<JsonDocumentSource> {
  const rawText = await file.text();
  let data: unknown;

  try {
    data = JSON.parse(rawText);
  } catch (error) {
    throw new Error(`Could not parse JSON file "${file.name}".`);
  }

  return {
    id: crypto.randomUUID(),
    fileName: file.name,
    mediaType: 'application/json',
    rawText,
    data,
    values: flattenJsonValues(data),
  };
}

export function flattenJsonValues(value: unknown): JsonValueNode[] {
  const values: JsonValueNode[] = [];
  visitJson(value, '$', undefined, values);
  return values;
}

function visitJson(value: unknown, path: string, parentKey: string | undefined, values: JsonValueNode[]) {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    values.push({ path, parentKey, value });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      visitJson(entry, `${path}[${index}]`, parentKey, values);
    });
    return;
  }

  if (typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
      visitJson(entry, `${path}.${escapeJsonPathKey(key)}`, key, values);
    });
  }
}

function escapeJsonPathKey(key: string): string {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) {
    return key;
  }

  return `['${key.replaceAll("'", "\\'")}']`;
}
```

- [ ] **Step 4: Run JSON adapter tests**

Run: `npm test -- src/documents/json/jsonAdapter.test.ts`

Expected: PASS.

- [ ] **Step 5: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 6: Commit JSON adapter if git is initialized**

Run:

```bash
git add src/documents/json
git commit -m "feat: add json document adapter"
```

Expected: commit succeeds if the repository was initialized.

---

### Task 5: JSON PII Analyzer

**Files:**
- Create: `src/ai/jsonPiiAnalyzer.ts`
- Create: `src/ai/jsonPiiAnalyzer.test.ts`

- [ ] **Step 1: Write JSON analyzer tests**

Create `src/ai/jsonPiiAnalyzer.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { analyzeJsonDocument, buildJsonAnalysisPrompt } from './jsonPiiAnalyzer';
import { JsonDocumentSource } from '../domain/types';

const document: JsonDocumentSource = {
  id: 'doc-1',
  fileName: 'customer.json',
  mediaType: 'application/json',
  rawText: '{"customer":{"name":"Nora Weber","iban":"DE89370400440532013000"}}',
  data: { customer: { name: 'Nora Weber', iban: 'DE89370400440532013000' } },
  values: [
    { path: '$.customer.name', parentKey: 'name', value: 'Nora Weber' },
    { path: '$.customer.iban', parentKey: 'iban', value: 'DE89370400440532013000' },
  ],
};

describe('jsonPiiAnalyzer', () => {
  it('builds a prompt with paths, keys, values, and required categories', () => {
    const prompt = buildJsonAnalysisPrompt(document);

    expect(prompt).toContain('Analyze these JSON primitive values');
    expect(prompt).toContain('$.customer.name');
    expect(prompt).toContain('Nora Weber');
    expect(prompt).toContain('iban');
    expect(prompt).toContain('Return only valid JSON');
  });

  it('normalizes valid model findings', async () => {
    const session = {
      prompt: vi.fn().mockResolvedValue(
        JSON.stringify({
          findings: [
            {
              id: 'f-1',
              category: 'name',
              originalValue: 'Nora Weber',
              confidence: 0.91,
              path: '$.customer.name',
            },
          ],
        }),
      ),
    };

    const findings = await analyzeJsonDocument(document, session);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      id: 'f-1',
      category: 'name',
      originalValue: 'Nora Weber',
      location: { kind: 'json-path', path: '$.customer.name' },
      detectionSource: 'json-path',
      reviewStatus: 'pending',
    });
  });

  it('rejects findings that point to paths outside the document', async () => {
    const session = {
      prompt: vi.fn().mockResolvedValue(
        JSON.stringify({
          findings: [
            {
              id: 'f-2',
              category: 'email',
              originalValue: 'nora@example.test',
              confidence: 0.8,
              path: '$.missing.email',
            },
          ],
        }),
      ),
    };

    await expect(analyzeJsonDocument(document, session)).resolves.toEqual([]);
  });
});
```

- [ ] **Step 2: Run analyzer tests and verify they fail**

Run: `npm test -- src/ai/jsonPiiAnalyzer.test.ts`

Expected: FAIL because `jsonPiiAnalyzer.ts` does not exist.

- [ ] **Step 3: Implement JSON analyzer**

Create `src/ai/jsonPiiAnalyzer.ts`:

```ts
import { normalizeFinding } from '../domain/findingValidation';
import { Finding, JsonDocumentSource, PII_CATEGORIES } from '../domain/types';

interface PromptLikeSession {
  prompt(input: string): Promise<string>;
}

interface ModelFinding {
  id?: string;
  category?: string;
  originalValue?: string;
  confidence?: number;
  path?: string;
}

interface ModelResponse {
  findings?: ModelFinding[];
}

export function buildJsonAnalysisPrompt(document: JsonDocumentSource): string {
  const values = document.values
    .map((node) =>
      JSON.stringify({
        path: node.path,
        key: node.parentKey ?? '',
        value: node.value,
      }),
    )
    .join('\n');

  return [
    'Analyze these JSON primitive values for personal or sensitive information.',
    `Allowed categories: ${PII_CATEGORIES.join(', ')}.`,
    'Return only valid JSON in this exact shape:',
    '{"findings":[{"id":"short-stable-id","category":"name","originalValue":"text","confidence":0.0,"path":"$.path"}]}',
    'Use paths exactly as provided. Do not invent paths. Use confidence between 0 and 1.',
    'Values:',
    values,
  ].join('\n');
}

export async function analyzeJsonDocument(
  document: JsonDocumentSource,
  session: PromptLikeSession,
): Promise<Finding[]> {
  const responseText = await session.prompt(buildJsonAnalysisPrompt(document));
  const response = parseModelResponse(responseText);
  const validPaths = new Set(document.values.map((node) => node.path));

  return response.findings
    .filter((finding) => typeof finding.path === 'string' && validPaths.has(finding.path))
    .map((finding) => {
      try {
        return normalizeFinding({
          id: finding.id,
          category: finding.category,
          originalValue: finding.originalValue,
          confidence: finding.confidence,
          location: { kind: 'json-path', path: finding.path },
          detectionSource: 'json-path',
        });
      } catch {
        return undefined;
      }
    })
    .filter((finding): finding is Finding => Boolean(finding));
}

function parseModelResponse(text: string): Required<ModelResponse> {
  const trimmed = text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  const parsed = JSON.parse(trimmed) as ModelResponse;

  return {
    findings: Array.isArray(parsed.findings) ? parsed.findings : [],
  };
}
```

- [ ] **Step 4: Run analyzer tests**

Run: `npm test -- src/ai/jsonPiiAnalyzer.test.ts`

Expected: PASS.

- [ ] **Step 5: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 6: Commit JSON analyzer if git is initialized**

Run:

```bash
git add src/ai/jsonPiiAnalyzer.ts src/ai/jsonPiiAnalyzer.test.ts
git commit -m "feat: add json pii analyzer"
```

Expected: commit succeeds if the repository was initialized.

---

### Task 6: Review State And Replacement Consistency

**Files:**
- Create: `src/review/reviewReducer.ts`
- Create: `src/review/reviewReducer.test.ts`

- [ ] **Step 1: Write review reducer tests**

Create `src/review/reviewReducer.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Finding } from '../domain/types';
import { createInitialReviewState, reviewReducer } from './reviewReducer';

const baseFinding: Finding = {
  id: 'f-1',
  category: 'name',
  originalValue: 'Nora Weber',
  confidence: 0.91,
  location: { kind: 'json-path', path: '$.customer.name' },
  detectionSource: 'json-path',
  reviewStatus: 'pending',
  selectedAction: 'replace-fake',
};

describe('reviewReducer', () => {
  it('approves a finding and assigns a consistent fake replacement', () => {
    const state = createInitialReviewState([baseFinding]);
    const next = reviewReducer(state, { type: 'approve-finding', findingId: 'f-1' });

    expect(next.findings[0]).toMatchObject({
      reviewStatus: 'approved',
      replacementValue: 'Person 1',
    });
  });

  it('reuses fake replacements for the same category and original value', () => {
    const state = createInitialReviewState([
      baseFinding,
      { ...baseFinding, id: 'f-2', location: { kind: 'json-path', path: '$.billing.name' } },
    ]);

    const first = reviewReducer(state, { type: 'approve-finding', findingId: 'f-1' });
    const second = reviewReducer(first, { type: 'approve-finding', findingId: 'f-2' });

    expect(second.findings.map((finding) => finding.replacementValue)).toEqual(['Person 1', 'Person 1']);
  });

  it('ignores a finding', () => {
    const state = createInitialReviewState([baseFinding]);
    const next = reviewReducer(state, { type: 'ignore-finding', findingId: 'f-1' });

    expect(next.findings[0]).toMatchObject({
      reviewStatus: 'ignored',
      selectedAction: 'ignore',
      replacementValue: undefined,
    });
  });

  it('changes actions before approval', () => {
    const state = createInitialReviewState([baseFinding]);
    const next = reviewReducer(state, {
      type: 'set-action',
      findingId: 'f-1',
      action: 'replace-label',
    });

    expect(next.findings[0]).toMatchObject({
      selectedAction: 'replace-label',
      replacementValue: '[NAME]',
    });
  });
});
```

- [ ] **Step 2: Run review tests and verify they fail**

Run: `npm test -- src/review/reviewReducer.test.ts`

Expected: FAIL because `reviewReducer.ts` does not exist.

- [ ] **Step 3: Implement review reducer**

Create `src/review/reviewReducer.ts`:

```ts
import { Finding, MaskingAction, PiiCategory } from '../domain/types';

export interface ReviewState {
  findings: Finding[];
  replacementMap: Record<string, string>;
}

export type ReviewEvent =
  | { type: 'approve-finding'; findingId: string }
  | { type: 'ignore-finding'; findingId: string }
  | { type: 'set-action'; findingId: string; action: MaskingAction };

const LABEL_BY_CATEGORY: Record<PiiCategory, string> = {
  name: '[NAME]',
  address: '[ADDRESS]',
  phone: '[PHONE]',
  email: '[EMAIL]',
  iban: '[IBAN]',
  bic: '[BIC]',
  'credit-card': '[CREDIT_CARD]',
  'government-id': '[GOVERNMENT_ID]',
  'date-of-birth': '[DATE_OF_BIRTH]',
  organization: '[ORGANIZATION]',
  'other-sensitive': '[SENSITIVE]',
};

const FAKE_PREFIX_BY_CATEGORY: Record<PiiCategory, string> = {
  name: 'Person',
  address: 'Address',
  phone: 'Phone',
  email: 'Email',
  iban: 'IBAN',
  bic: 'BIC',
  'credit-card': 'Card',
  'government-id': 'ID',
  'date-of-birth': 'Date',
  organization: 'Organization',
  'other-sensitive': 'Value',
};

export function createInitialReviewState(findings: Finding[]): ReviewState {
  return { findings, replacementMap: {} };
}

export function reviewReducer(state: ReviewState, event: ReviewEvent): ReviewState {
  if (event.type === 'ignore-finding') {
    return {
      ...state,
      findings: state.findings.map((finding) =>
        finding.id === event.findingId
          ? { ...finding, reviewStatus: 'ignored', selectedAction: 'ignore', replacementValue: undefined }
          : finding,
      ),
    };
  }

  if (event.type === 'set-action') {
    return applyFindingUpdate(state, event.findingId, (finding, replacementMap) => ({
      finding: {
        ...finding,
        selectedAction: event.action,
        replacementValue: replacementValueForAction(finding, event.action, replacementMap),
      },
      replacementMap,
    }));
  }

  if (event.type === 'approve-finding') {
    return applyFindingUpdate(state, event.findingId, (finding, replacementMap) => ({
      finding: {
        ...finding,
        reviewStatus: 'approved',
        replacementValue: replacementValueForAction(finding, finding.selectedAction, replacementMap),
      },
      replacementMap,
    }));
  }

  return state;
}

function applyFindingUpdate(
  state: ReviewState,
  findingId: string,
  update: (finding: Finding, replacementMap: Record<string, string>) => { finding: Finding; replacementMap: Record<string, string> },
): ReviewState {
  let nextReplacementMap = state.replacementMap;
  const findings = state.findings.map((finding) => {
    if (finding.id !== findingId) {
      return finding;
    }

    const result = update(finding, nextReplacementMap);
    nextReplacementMap = result.replacementMap;
    return result.finding;
  });

  return { findings, replacementMap: nextReplacementMap };
}

function replacementValueForAction(
  finding: Finding,
  action: MaskingAction,
  replacementMap: Record<string, string>,
): string | undefined {
  if (action === 'replace-label') {
    return LABEL_BY_CATEGORY[finding.category];
  }

  if (action === 'replace-fake') {
    return fakeValueForFinding(finding, replacementMap);
  }

  return undefined;
}

function fakeValueForFinding(finding: Finding, replacementMap: Record<string, string>): string {
  const key = replacementKey(finding);
  if (replacementMap[key]) {
    return replacementMap[key];
  }

  const prefix = FAKE_PREFIX_BY_CATEGORY[finding.category];
  const countForCategory = Object.keys(replacementMap).filter((entry) => entry.startsWith(`${finding.category}:`)).length + 1;
  const value = `${prefix} ${countForCategory}`;
  replacementMap[key] = value;
  return value;
}

function replacementKey(finding: Finding): string {
  const normalized = (finding.originalValue ?? finding.id).trim().toLowerCase();
  return `${finding.category}:${normalized}`;
}
```

- [ ] **Step 4: Run review reducer tests**

Run: `npm test -- src/review/reviewReducer.test.ts`

Expected: PASS.

- [ ] **Step 5: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 6: Commit review state if git is initialized**

Run:

```bash
git add src/review
git commit -m "feat: add review state transitions"
```

Expected: commit succeeds if the repository was initialized.

---

### Task 7: JSON Masking And Report Export

**Files:**
- Create: `src/export/jsonMasker.ts`
- Create: `src/export/jsonMasker.test.ts`
- Create: `src/export/report.ts`
- Create: `src/export/report.test.ts`

- [ ] **Step 1: Write masking tests**

Create `src/export/jsonMasker.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Finding, JsonDocumentSource } from '../domain/types';
import { applyJsonMasking } from './jsonMasker';

const document: JsonDocumentSource = {
  id: 'doc-1',
  fileName: 'customer.json',
  mediaType: 'application/json',
  rawText: '',
  data: {
    customer: {
      name: 'Nora Weber',
      iban: 'DE89370400440532013000',
      notes: 'leave this',
    },
  },
  values: [],
};

const findings: Finding[] = [
  {
    id: 'f-1',
    category: 'name',
    originalValue: 'Nora Weber',
    confidence: 0.91,
    location: { kind: 'json-path', path: '$.customer.name' },
    detectionSource: 'json-path',
    reviewStatus: 'approved',
    selectedAction: 'replace-fake',
    replacementValue: 'Person 1',
  },
  {
    id: 'f-2',
    category: 'iban',
    originalValue: 'DE89370400440532013000',
    confidence: 0.95,
    location: { kind: 'json-path', path: '$.customer.iban' },
    detectionSource: 'json-path',
    reviewStatus: 'approved',
    selectedAction: 'redact',
  },
];

describe('applyJsonMasking', () => {
  it('applies approved replacements and redactions by JSON path', () => {
    const masked = applyJsonMasking(document, findings);

    expect(masked).toEqual({
      customer: {
        name: 'Person 1',
        iban: '████',
        notes: 'leave this',
      },
    });
  });

  it('leaves ignored findings unchanged', () => {
    const masked = applyJsonMasking(document, [{ ...findings[0], reviewStatus: 'ignored', selectedAction: 'ignore' }]);

    expect(masked).toEqual(document.data);
  });
});
```

- [ ] **Step 2: Write report tests**

Create `src/export/report.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Finding, JsonDocumentSource } from '../domain/types';
import { buildExportReport } from './report';

const document: JsonDocumentSource = {
  id: 'doc-1',
  fileName: 'customer.json',
  mediaType: 'application/json',
  rawText: '',
  data: {},
  values: [],
};

const finding: Finding = {
  id: 'f-1',
  category: 'email',
  originalValue: 'nora@example.test',
  confidence: 0.88,
  location: { kind: 'json-path', path: '$.email' },
  detectionSource: 'json-path',
  reviewStatus: 'approved',
  selectedAction: 'replace-label',
  replacementValue: '[EMAIL]',
};

describe('buildExportReport', () => {
  it('records source filename, action, replacement, and detection source', () => {
    const report = buildExportReport(document, [finding]);

    expect(report).toEqual([
      {
        sourceFileName: 'customer.json',
        findingId: 'f-1',
        category: 'email',
        originalValue: 'nora@example.test',
        action: 'replace-label',
        replacementValue: '[EMAIL]',
        detectionSource: 'json-path',
        status: 'exported',
      },
    ]);
  });
});
```

- [ ] **Step 3: Run export tests and verify they fail**

Run: `npm test -- src/export/jsonMasker.test.ts src/export/report.test.ts`

Expected: FAIL because export files do not exist.

- [ ] **Step 4: Implement JSON masker**

Create `src/export/jsonMasker.ts`:

```ts
import { Finding, JsonDocumentSource } from '../domain/types';

export function applyJsonMasking(document: JsonDocumentSource, findings: Finding[]): unknown {
  const clone = structuredClone(document.data);

  findings
    .filter((finding) => finding.reviewStatus === 'approved')
    .filter((finding) => finding.location.kind === 'json-path')
    .forEach((finding) => {
      setJsonPathValue(clone, finding.location.kind === 'json-path' ? finding.location.path : '$', valueForFinding(finding));
    });

  return clone;
}

function valueForFinding(finding: Finding): string {
  if (finding.selectedAction === 'redact') {
    return '████';
  }

  if (finding.selectedAction === 'replace-label' || finding.selectedAction === 'replace-fake') {
    return finding.replacementValue ?? '████';
  }

  return finding.originalValue ?? '';
}

function setJsonPathValue(root: unknown, path: string, value: unknown): void {
  const segments = parseJsonPath(path);
  if (segments.length === 0) {
    return;
  }

  let cursor = root as Record<string, unknown> | unknown[];
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    cursor = (cursor as Record<string, unknown>)[segment as string] as Record<string, unknown> | unknown[];
    if (cursor === undefined || cursor === null) {
      return;
    }
  }

  const finalSegment = segments[segments.length - 1];
  (cursor as Record<string, unknown>)[finalSegment as string] = value;
}

export function parseJsonPath(path: string): Array<string | number> {
  if (!path.startsWith('$')) {
    throw new Error(`Invalid JSON path: ${path}`);
  }

  const segments: Array<string | number> = [];
  const pattern = /\.([A-Za-z_$][A-Za-z0-9_$]*)|\[(\d+)\]|\['((?:\\'|[^'])*)'\]/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(path)) !== null) {
    if (match[1]) {
      segments.push(match[1]);
    } else if (match[2]) {
      segments.push(Number(match[2]));
    } else if (match[3]) {
      segments.push(match[3].replaceAll("\\'", "'"));
    }
  }

  return segments;
}
```

- [ ] **Step 5: Implement report builder**

Create `src/export/report.ts`:

```ts
import { ExportReportEntry, Finding, JsonDocumentSource } from '../domain/types';

export function buildExportReport(document: JsonDocumentSource, findings: Finding[]): ExportReportEntry[] {
  return findings.map((finding) => ({
    sourceFileName: document.fileName,
    findingId: finding.id,
    category: finding.category,
    originalValue: finding.originalValue,
    action: finding.selectedAction,
    replacementValue: finding.replacementValue,
    detectionSource: finding.detectionSource,
    status: statusForFinding(finding),
  }));
}

function statusForFinding(finding: Finding): ExportReportEntry['status'] {
  if (finding.reviewStatus === 'approved') {
    return 'exported';
  }

  if (finding.reviewStatus === 'ignored') {
    return 'ignored';
  }

  return 'not-applied';
}
```

- [ ] **Step 6: Run export tests**

Run: `npm test -- src/export/jsonMasker.test.ts src/export/report.test.ts`

Expected: PASS.

- [ ] **Step 7: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 8: Commit export utilities if git is initialized**

Run:

```bash
git add src/export
git commit -m "feat: add json masking and report export"
```

Expected: commit succeeds if the repository was initialized.

---

### Task 8: Workbench UI Integration

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Create: `src/ui/FileImporter.tsx`
- Create: `src/ui/PromptStatus.tsx`
- Create: `src/ui/JsonPreview.tsx`
- Create: `src/ui/FindingsPanel.tsx`
- Create: `src/ui/ExportPanel.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Replace app smoke test with JSON workflow test**

Modify `src/App.test.tsx`:

```tsx
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

describe('App', () => {
  it('imports JSON and shows the review workbench', async () => {
    render(<App />);

    const file = new File([JSON.stringify({ customer: { name: 'Nora Weber' } })], 'customer.json', {
      type: 'application/json',
    });

    await userEvent.upload(screen.getByLabelText(/import json/i), file);

    expect(await screen.findByText('customer.json')).toBeInTheDocument();
    expect(screen.getByText(/\$\.customer\.name/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run app test and verify it fails**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL because the app shell has no importer or JSON preview.

- [ ] **Step 3: Add UI components**

Create `src/ui/PromptStatus.tsx`:

```tsx
import { PromptApiStatus } from '../ai/promptApi';

interface PromptStatusProps {
  status: PromptApiStatus;
}

export function PromptStatus({ status }: PromptStatusProps) {
  return (
    <section aria-label="Prompt API Status" className={`status-pill status-${status.state}`}>
      <strong>Prompt API status:</strong> {status.message}
    </section>
  );
}
```

Create `src/ui/FileImporter.tsx`:

```tsx
interface FileImporterProps {
  onFileSelected: (file: File) => void;
  error?: string;
}

export function FileImporter({ onFileSelected, error }: FileImporterProps) {
  return (
    <section className="panel import-panel">
      <h2>Import JSON</h2>
      <label className="file-input-label">
        Choose JSON file
        <input
          aria-label="Import JSON"
          accept="application/json,.json"
          type="file"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) {
              onFileSelected(file);
            }
          }}
        />
      </label>
      {error ? <p className="error-text">{error}</p> : <p>Files stay in memory until you export.</p>}
    </section>
  );
}
```

Create `src/ui/JsonPreview.tsx`:

```tsx
import { JsonDocumentSource } from '../domain/types';

interface JsonPreviewProps {
  document?: JsonDocumentSource;
}

export function JsonPreview({ document }: JsonPreviewProps) {
  return (
    <section className="panel preview-panel">
      <h2>Document Preview</h2>
      {document ? (
        <>
          <p className="file-name">{document.fileName}</p>
          <pre>{JSON.stringify(document.data, null, 2)}</pre>
          <h3>Analyzable values</h3>
          <ul className="path-list">
            {document.values.map((node) => (
              <li key={node.path}>
                <code>{node.path}</code> <span>{String(node.value)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>No document imported.</p>
      )}
    </section>
  );
}
```

Create `src/ui/FindingsPanel.tsx`:

```tsx
import { Finding, MaskingAction } from '../domain/types';
import { ReviewEvent } from '../review/reviewReducer';

interface FindingsPanelProps {
  findings: Finding[];
  dispatchReview: (event: ReviewEvent) => void;
}

const ACTIONS: Array<{ value: MaskingAction; label: string }> = [
  { value: 'redact', label: 'Redact' },
  { value: 'replace-label', label: 'Type label' },
  { value: 'replace-fake', label: 'Fake value' },
  { value: 'ignore', label: 'Ignore' },
];

export function FindingsPanel({ findings, dispatchReview }: FindingsPanelProps) {
  return (
    <section className="panel findings-panel">
      <h2>Findings</h2>
      {findings.length === 0 ? (
        <p>No findings yet. Import JSON and run analysis.</p>
      ) : (
        <ul className="finding-list">
          {findings.map((finding) => (
            <li key={finding.id} className="finding-item">
              <div>
                <strong>{finding.category}</strong>
                <p>{finding.originalValue ?? 'No textual value'}</p>
                <code>{finding.location.kind === 'json-path' ? finding.location.path : finding.location.kind}</code>
              </div>
              <select
                aria-label={`Action for ${finding.id}`}
                value={finding.selectedAction}
                onChange={(event) =>
                  dispatchReview({
                    type: 'set-action',
                    findingId: finding.id,
                    action: event.currentTarget.value as MaskingAction,
                  })
                }
              >
                {ACTIONS.map((action) => (
                  <option key={action.value} value={action.value}>
                    {action.label}
                  </option>
                ))}
              </select>
              <div className="button-row">
                <button onClick={() => dispatchReview({ type: 'approve-finding', findingId: finding.id })}>
                  Approve
                </button>
                <button onClick={() => dispatchReview({ type: 'ignore-finding', findingId: finding.id })}>
                  Ignore
                </button>
              </div>
              <small>Status: {finding.reviewStatus}</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

Create `src/ui/ExportPanel.tsx`:

```tsx
import { JsonDocumentSource, Finding } from '../domain/types';
import { applyJsonMasking } from '../export/jsonMasker';
import { buildExportReport } from '../export/report';

interface ExportPanelProps {
  document?: JsonDocumentSource;
  findings: Finding[];
}

export function ExportPanel({ document, findings }: ExportPanelProps) {
  const approvedCount = findings.filter((finding) => finding.reviewStatus === 'approved').length;
  const ignoredCount = findings.filter((finding) => finding.reviewStatus === 'ignored').length;
  const canExport = Boolean(document);

  return (
    <section className="panel export-panel">
      <h2>Export</h2>
      <dl className="summary-list">
        <div>
          <dt>Total findings</dt>
          <dd>{findings.length}</dd>
        </div>
        <div>
          <dt>Approved</dt>
          <dd>{approvedCount}</dd>
        </div>
        <div>
          <dt>Ignored</dt>
          <dd>{ignoredCount}</dd>
        </div>
      </dl>
      <button disabled={!canExport} onClick={() => document && downloadJson(`${document.fileName}.anonymized.json`, applyJsonMasking(document, findings))}>
        Export anonymized JSON
      </button>
      <button disabled={!canExport} onClick={() => document && downloadJson(`${document.fileName}.report.json`, buildExportReport(document, findings))}>
        Export report
      </button>
    </section>
  );
}

function downloadJson(fileName: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Wire components in the app**

Modify `src/App.tsx`:

```tsx
import { useEffect, useReducer, useState } from 'react';
import { checkPromptApiStatus, createPromptSession, PromptApiStatus } from './ai/promptApi';
import { analyzeJsonDocument } from './ai/jsonPiiAnalyzer';
import { Finding, JsonDocumentSource } from './domain/types';
import { parseJsonDocument } from './documents/json/jsonAdapter';
import { createInitialReviewState, reviewReducer } from './review/reviewReducer';
import { ExportPanel } from './ui/ExportPanel';
import { FileImporter } from './ui/FileImporter';
import { FindingsPanel } from './ui/FindingsPanel';
import { JsonPreview } from './ui/JsonPreview';
import { PromptStatus } from './ui/PromptStatus';

const INITIAL_PROMPT_STATUS: PromptApiStatus = {
  state: 'unsupported',
  message: 'Checking Chrome Prompt API availability.',
};

export function App() {
  const [promptStatus, setPromptStatus] = useState<PromptApiStatus>(INITIAL_PROMPT_STATUS);
  const [document, setDocument] = useState<JsonDocumentSource>();
  const [importError, setImportError] = useState<string>();
  const [analysisError, setAnalysisError] = useState<string>();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reviewState, dispatchReview] = useReducer(reviewReducer, createInitialReviewState([]));

  useEffect(() => {
    void checkPromptApiStatus().then(setPromptStatus);
  }, []);

  async function handleFileSelected(file: File) {
    setImportError(undefined);
    setAnalysisError(undefined);

    try {
      const parsed = await parseJsonDocument(file);
      setDocument(parsed);
      dispatchReview({ type: 'replace-all-findings', findings: [] as Finding[] } as never);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Could not import JSON file.');
    }
  }

  async function handleAnalyze() {
    if (!document || promptStatus.state !== 'available') {
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(undefined);

    try {
      const session = await createPromptSession();
      const findings = await analyzeJsonDocument(document, session);
      dispatchReview({ type: 'replace-all-findings', findings } as never);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Prompt API analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Local Chrome AI experiment</p>
          <h1>Client-Side Data Anonymizer</h1>
        </div>
        <PromptStatus status={promptStatus} />
      </header>

      <section className="workbench-grid">
        <div className="left-stack">
          <FileImporter onFileSelected={handleFileSelected} error={importError} />
          <button
            className="secondary-button"
            disabled={!document || promptStatus.state !== 'available' || isAnalyzing}
            onClick={handleAnalyze}
          >
            {isAnalyzing ? 'Analyzing JSON' : 'Run Prompt API analysis'}
          </button>
          {analysisError ? <p className="error-text">{analysisError}</p> : null}
          <ExportPanel document={document} findings={reviewState.findings} />
        </div>
        <JsonPreview document={document} />
        <FindingsPanel findings={reviewState.findings} dispatchReview={dispatchReview} />
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Extend the review reducer with replace-all-findings**

Modify the `ReviewEvent` type and `reviewReducer` in `src/review/reviewReducer.ts`:

```ts
export type ReviewEvent =
  | { type: 'replace-all-findings'; findings: Finding[] }
  | { type: 'approve-finding'; findingId: string }
  | { type: 'ignore-finding'; findingId: string }
  | { type: 'set-action'; findingId: string; action: MaskingAction };

export function reviewReducer(state: ReviewState, event: ReviewEvent): ReviewState {
  if (event.type === 'replace-all-findings') {
    return createInitialReviewState(event.findings);
  }

  if (event.type === 'ignore-finding') {
    return {
      ...state,
      findings: state.findings.map((finding) =>
        finding.id === event.findingId
          ? { ...finding, reviewStatus: 'ignored', selectedAction: 'ignore', replacementValue: undefined }
          : finding,
      ),
    };
  }

  if (event.type === 'set-action') {
    return applyFindingUpdate(state, event.findingId, (finding, replacementMap) => ({
      finding: {
        ...finding,
        selectedAction: event.action,
        replacementValue: replacementValueForAction(finding, event.action, replacementMap),
      },
      replacementMap,
    }));
  }

  if (event.type === 'approve-finding') {
    return applyFindingUpdate(state, event.findingId, (finding, replacementMap) => ({
      finding: {
        ...finding,
        reviewStatus: 'approved',
        replacementValue: replacementValueForAction(finding, finding.selectedAction, replacementMap),
      },
      replacementMap,
    }));
  }

  return state;
}
```

Then remove `as never` from the `dispatchReview` call in `src/App.tsx`:

```tsx
dispatchReview({ type: 'replace-all-findings', findings });
dispatchReview({ type: 'replace-all-findings', findings: [] as Finding[] });
```

- [ ] **Step 6: Add Prompt API workflow coverage to the app test**

Modify `src/App.test.tsx` to include a mocked Prompt API analysis path:

```tsx
import { vi } from 'vitest';
```

Add this test below the import preview test:

```tsx
it('runs Prompt API analysis and shows returned findings', async () => {
  vi.stubGlobal('LanguageModel', {
    availability: vi.fn().mockResolvedValue('available'),
    create: vi.fn().mockResolvedValue({
      prompt: vi.fn().mockResolvedValue(
        JSON.stringify({
          findings: [
            {
              id: 'f-1',
              category: 'name',
              originalValue: 'Nora Weber',
              confidence: 0.91,
              path: '$.customer.name',
            },
          ],
        }),
      ),
    }),
  });

  render(<App />);
  expect(await screen.findByText(/model is ready/i)).toBeInTheDocument();

  const file = new File([JSON.stringify({ customer: { name: 'Nora Weber' } })], 'customer.json', {
    type: 'application/json',
  });
  await userEvent.upload(screen.getByLabelText(/import json/i), file);
  await userEvent.click(screen.getByRole('button', { name: /run prompt api analysis/i }));

  expect(await screen.findByText('Nora Weber')).toBeInTheDocument();
  expect(screen.getByText('name')).toBeInTheDocument();
});
```

- [ ] **Step 7: Extend styles for integrated workbench**

Append to `src/styles.css`:

```css
.left-stack {
  display: grid;
  gap: 16px;
}

.file-input-label {
  align-items: center;
  background: #244b2f;
  border-radius: 6px;
  color: #ffffff;
  cursor: pointer;
  display: inline-flex;
  font-weight: 700;
  gap: 8px;
  padding: 10px 12px;
}

.file-input-label input {
  height: 1px;
  opacity: 0;
  position: absolute;
  width: 1px;
}

.error-text {
  color: #9f1d20;
  font-weight: 700;
}

.file-name {
  color: #315d3b;
  font-weight: 700;
}

.path-list,
.finding-list {
  display: grid;
  gap: 8px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.path-list li,
.finding-item {
  border: 1px solid #d8ded2;
  border-radius: 6px;
  padding: 10px;
}

.finding-item {
  display: grid;
  gap: 10px;
}

.button-row {
  display: flex;
  gap: 8px;
}

button {
  background: #244b2f;
  border: 0;
  border-radius: 6px;
  color: #ffffff;
  cursor: pointer;
  font-weight: 700;
  padding: 9px 12px;
}

button:disabled {
  background: #9aa59a;
  cursor: not-allowed;
}

.secondary-button {
  background: #49624f;
}

.summary-list {
  display: grid;
  gap: 8px;
}

.summary-list div {
  display: flex;
  justify-content: space-between;
}

.summary-list dt,
.summary-list dd {
  margin: 0;
}
```

- [ ] **Step 8: Run app and reducer tests**

Run: `npm test -- src/App.test.tsx src/review/reviewReducer.test.ts`

Expected: PASS.

- [ ] **Step 9: Run full verification**

Run: `npm test`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 10: Commit workbench UI if git is initialized**

Run:

```bash
git add src
git commit -m "feat: wire json anonymizer workbench"
```

Expected: commit succeeds if the repository was initialized.

---

## Final Verification

- [ ] Run all tests.

Run: `npm test`

Expected: PASS.

- [ ] Run production build.

Run: `npm run build`

Expected: PASS.

- [ ] Start the dev server.

Run: `npm run dev`

Expected: Vite prints a local URL, usually `http://localhost:5173/`.

- [ ] Open the app in Chrome with Prompt API support.

Expected: Prompt API readiness status displays one of the Chrome states. If the model is unavailable, the app blocks true analysis but still allows JSON import and local preview.

- [ ] Import this JSON manually:

```json
{
  "customer": {
    "name": "Nora Weber",
    "email": "nora.weber@example.test",
    "iban": "DE89370400440532013000"
  }
}
```

Expected: The document preview shows the JSON and paths. In Chrome with an available Prompt API model, the Run Prompt API analysis button populates findings. In other browsers, analysis remains blocked by the availability gate.

- [ ] Approve one finding and export JSON and report.

Expected: anonymized JSON downloads with the approved value changed. Report downloads with source filename, category, original value, action, replacement, detection source, and export status.

## Plan Self-Review

- Spec coverage: This plan covers the approved Foundation And JSON milestone: app shell, Prompt API gate, shared models, JSON adapter, review-first workflow, JSON masking, report export, and deterministic tests.
- Scope split: Images and PDFs are intentionally left for separate plans because each adds independent adapters, preview mechanics, masking exports, and tests.
- Placeholder scan: No task relies on undefined behavior or unspecified file ownership.
- Type consistency: Core names are stable across tasks: `Finding`, `JsonDocumentSource`, `PromptApiStatus`, `ReviewState`, `reviewReducer`, `parseJsonDocument`, `analyzeJsonDocument`, `applyJsonMasking`, and `buildExportReport`.
