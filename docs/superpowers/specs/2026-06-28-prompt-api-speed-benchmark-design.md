# Prompt API Speed Benchmark Design

## Goal

Add a Prompt API speed benchmark that runs JSON PII analysis against generated JSON documents of 1, 4, 8, 16, 32, 64, and 128 elements, supports `--runs=x` runs per size, and writes timing results to `experiments/results`.

## Approach

Use the same local Vite plus persistent Chrome flow as the JSON shape experiment, but extract the experiment setup code that is independent of response-shape validation. Shared setup should include Chrome launch options, Vite server startup, browser page execution, safe report timestamps, positive integer CLI parsing, and generic progress formatting. The JSON shape experiment should continue to work with its existing npm script while using the shared helpers where reasonable.

## Benchmark Data

The benchmark generates deterministic JSON arrays. Each element contains a mixture of PII and non-PII fields so the task remains realistic without making every value sensitive. PII examples include a name, email, phone number, or customer id. Non-PII examples include product category, order status, quantity, region, shipping method, note, timestamp, and priority.

## Benchmark Flow

The CLI script accepts `--runs=x` and `--timeoutMs=x`. Runs are per JSON size, so `--runs=3` produces 21 timed trials across the seven configured sizes. Each trial parses a generated JSON file, creates a Prompt API session, calls the existing JSON PII analyzer, captures elapsed time, records raw response text, validates the response shape with the existing validator, counts normalized findings, and destroys the session.

## Report

The benchmark report includes setup diagnostics, any setup error, configured JSON sizes, runs requested per size, every trial result, and a summary. The summary reports setup success, runs completed, total requested trials, total duration, and per-size timing statistics: completed run count, error count, min, max, average, and p50 duration.

## Testing

Tests cover deterministic sample generation, report aggregation, CLI option parsing, shared progress formatting, and the existing JSON shape report behavior after the refactor. Live Prompt API execution remains an integration path because it depends on Chrome and model availability.
