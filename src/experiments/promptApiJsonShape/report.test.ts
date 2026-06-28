import { describe, expect, it } from 'vitest';
import { buildJsonShapeExperimentReport } from './report';

describe('buildJsonShapeExperimentReport', () => {
  it('summarizes trials and preserves failed raw response text', () => {
    const report = buildJsonShapeExperimentReport({
      startedAt: '2026-06-26T00:00:00.000Z',
      finishedAt: '2026-06-26T00:01:00.000Z',
      sampleJson: '{"name":"Kelly Doe"}',
      runsRequested: 2,
      trials: [
        {
          trial: 1,
          durationMs: 1000,
          availabilityState: 'available',
          rawResponseText: '{"findings":[]}',
          shape: { valid: true, findings: [] },
          normalizedFindings: [],
        },
        {
          trial: 2,
          durationMs: 1200,
          availabilityState: 'available',
          rawResponseText: '{"findings":{}',
          shape: { valid: false, error: 'Response must be a valid JSON object.' },
          normalizedFindings: [],
        },
      ],
    });

    expect(report.summary).toEqual({
      runsRequested: 2,
      runsCompleted: 2,
      validShapeCount: 1,
      invalidShapeCount: 1,
      normalizedFindingCount: 0,
      setupSucceeded: true,
      allShapesValid: false,
    });
    expect(report.trials[1]).toMatchObject({
      rawResponseText: '{"findings":{}',
      shape: { valid: false, error: 'Response must be a valid JSON object.' },
    });
  });

  it('keeps setup diagnostics when no trials can run', () => {
    const report = buildJsonShapeExperimentReport({
      startedAt: '2026-06-26T00:00:00.000Z',
      finishedAt: '2026-06-26T00:00:05.000Z',
      sampleJson: '{"name":"Kelly Doe"}',
      runsRequested: 1,
      setupError: 'Chrome Prompt API model is unavailable on this device or origin.',
      diagnostics: {
        userAgent: 'Chrome/138',
        languageModelPresent: true,
        languageModelAvailabilityPresent: true,
        userActivation: { isActive: false, hasBeenActive: false },
        availabilityChecks: [
          { label: 'no-options', state: 'available' },
          { label: 'text-only', state: 'available' },
          { label: 'app-options', state: 'unavailable' },
        ],
      },
      trials: [],
    });

    expect(report.setupError).toBe('Chrome Prompt API model is unavailable on this device or origin.');
    expect(report.diagnostics?.availabilityChecks).toEqual([
      { label: 'no-options', state: 'available' },
      { label: 'text-only', state: 'available' },
      { label: 'app-options', state: 'unavailable' },
    ]);
    expect(report.summary).toMatchObject({
      runsRequested: 1,
      runsCompleted: 0,
      setupSucceeded: false,
      allShapesValid: false,
    });
  });
});
