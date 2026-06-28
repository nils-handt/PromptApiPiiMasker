# Prompt API Speed Benchmark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Prompt API speed benchmark with reusable experiment setup and per-size timing reports.

**Architecture:** Extract generic Node-side experiment runner helpers from the JSON shape experiment, keep Prompt API browser behavior in experiment-specific runners, and add a speed benchmark runner that reuses JSON parsing, analysis, diagnostics, shape validation, and session capture. Reports are plain JSON artifacts under `experiments/results`.

**Tech Stack:** TypeScript, Vite, Playwright, Vitest, Chrome Prompt API, existing JSON PII analyzer.

---

### Task 1: Shared CLI Helpers

**Files:**
- Create: `scripts/prompt-api-experiment-runner.ts`
- Create: `scripts/prompt-api-experiment-runner.test.ts`
- Modify: `scripts/run-prompt-api-json-shape-experiment.ts`

- [ ] Write failing tests for shared positive integer parsing, safe timestamps, Chrome launch options, and generic progress formatting.
- [ ] Run `npm test -- scripts/prompt-api-experiment-runner.test.ts` and verify the tests fail because the module does not exist.
- [ ] Implement the shared helper module by moving behavior out of the JSON shape CLI script without changing behavior.
- [ ] Update the JSON shape CLI script to import and use the shared helpers.
- [ ] Run the helper tests and existing JSON shape runner option/progress tests.

### Task 2: Benchmark Data And Report Units

**Files:**
- Create: `src/experiments/promptApiSpeedBenchmark/sampleData.ts`
- Create: `src/experiments/promptApiSpeedBenchmark/sampleData.test.ts`
- Create: `src/experiments/promptApiSpeedBenchmark/report.ts`
- Create: `src/experiments/promptApiSpeedBenchmark/report.test.ts`

- [ ] Write failing tests proving generated documents contain the requested element count and include both PII and non-PII fields.
- [ ] Write failing tests for report summary aggregation by element count.
- [ ] Run the new tests and verify they fail because the modules do not exist.
- [ ] Implement deterministic sample generation and benchmark report aggregation.
- [ ] Run the new tests and verify they pass.

### Task 3: Browser Benchmark Runner

**Files:**
- Create: `src/experiments/promptApiSpeedBenchmark/browserRunner.ts`
- Create: `experiments/prompt-api-speed.html`

- [ ] Write the browser runner using the shared Prompt API diagnostics pattern from the shape experiment.
- [ ] For each configured size and each run, generate JSON, parse it, create a Prompt API session, run `analyzeJsonDocument`, capture raw response text and duration, validate response shape, and emit progress.
- [ ] Register `window.runPromptApiSpeedBenchmark`.
- [ ] Add the HTML entrypoint that imports the browser runner.

### Task 4: CLI Wiring

**Files:**
- Create: `scripts/run-prompt-api-speed-benchmark.ts`
- Modify: `package.json`

- [ ] Write failing tests for benchmark CLI options if parsing is not covered by Task 1.
- [ ] Implement the speed benchmark CLI using the shared browser experiment runner.
- [ ] Add `experiment:prompt-api:speed` to `package.json`.
- [ ] Save reports as `experiments/results/prompt-api-speed-<timestamp>.json`.

### Task 5: Verification

**Files:**
- Existing test suite and build outputs.

- [ ] Run targeted Vitest tests for scripts and experiment report/sample modules.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Do not run the live benchmark unless Chrome Prompt API availability is intentionally being checked, because it may open Chrome and depend on local model state.

## Self-Review

Spec coverage is complete: reusable setup, generated JSON sizes, per-size runs, mixed PII/non-PII data, report output, and verification are all represented. The plan avoids placeholders and keeps each created module focused on one responsibility.
