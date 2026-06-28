import { describe, expect, it } from 'vitest';
import { buildPromptApiSpeedBenchmarkReport } from './report';

describe('buildPromptApiSpeedBenchmarkReport', () => {
  it('summarizes timing statistics by element count', () => {
    const report = buildPromptApiSpeedBenchmarkReport({
      startedAt: '2026-06-28T10:00:00.000Z',
      finishedAt: '2026-06-28T10:01:00.000Z',
      elementCounts: [1, 4],
      runsPerSize: 3,
      trials: [
        successfulTrial(1, 1, 100),
        successfulTrial(1, 2, 300),
        failedTrial(1, 3, 500),
        successfulTrial(4, 1, 1000),
        successfulTrial(4, 2, 2000),
        successfulTrial(4, 3, 3000),
      ],
    });

    expect(report.summary).toEqual({
      setupSucceeded: true,
      totalTrialsRequested: 6,
      totalTrialsCompleted: 6,
      totalDurationMs: 6900,
      sizes: [
        {
          elementCount: 1,
          runsRequested: 3,
          runsCompleted: 3,
          successfulRuns: 2,
          errorCount: 1,
          minDurationMs: 100,
          maxDurationMs: 300,
          averageDurationMs: 200,
          p50DurationMs: 100,
        },
        {
          elementCount: 4,
          runsRequested: 3,
          runsCompleted: 3,
          successfulRuns: 3,
          errorCount: 0,
          minDurationMs: 1000,
          maxDurationMs: 3000,
          averageDurationMs: 2000,
          p50DurationMs: 2000,
        },
      ],
    });
  });

  it('keeps setup diagnostics when no trials can run', () => {
    const report = buildPromptApiSpeedBenchmarkReport({
      startedAt: '2026-06-28T10:00:00.000Z',
      finishedAt: '2026-06-28T10:00:01.000Z',
      elementCounts: [1],
      runsPerSize: 2,
      setupError: 'Chrome Prompt API model is unavailable on this device or origin.',
      diagnostics: {
        userAgent: 'Chrome/138',
        languageModelPresent: true,
        languageModelAvailabilityPresent: true,
        userActivation: { isActive: false, hasBeenActive: false },
        availabilityChecks: [{ label: 'app-options', state: 'unavailable' }],
      },
      trials: [],
    });

    expect(report.summary).toMatchObject({
      setupSucceeded: false,
      totalTrialsRequested: 2,
      totalTrialsCompleted: 0,
      totalDurationMs: 0,
    });
    expect(report.setupError).toBe('Chrome Prompt API model is unavailable on this device or origin.');
  });
});

function successfulTrial(elementCount: number, run: number, durationMs: number) {
  return {
    elementCount,
    run,
    durationMs,
    primitiveValueCount: elementCount * 10,
    availabilityState: 'available' as const,
    rawResponseText: '{"findings":[]}',
    shape: { valid: true as const, findings: [] },
    normalizedFindingCount: 0,
  };
}

function failedTrial(elementCount: number, run: number, durationMs: number) {
  return {
    elementCount,
    run,
    durationMs,
    primitiveValueCount: elementCount * 10,
    availabilityState: 'available' as const,
    rawResponseText: '',
    shape: { valid: false as const, error: 'Trial failed.' },
    normalizedFindingCount: 0,
    error: 'Trial failed.',
  };
}
