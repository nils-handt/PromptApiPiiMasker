import { describe, expect, it } from 'vitest';
import { formatProgressEvent } from './prompt-api-json-shape-progress';

describe('formatProgressEvent', () => {
  it('formats setup progress', () => {
    expect(formatProgressEvent({ type: 'setup', message: 'checking Prompt API availability' })).toBe(
      '[experiment] setup: checking Prompt API availability',
    );
  });

  it('formats trial start and completion progress', () => {
    expect(formatProgressEvent({ type: 'trial-start', trial: 2, runs: 5 })).toBe(
      '[experiment] trial 2/5 started',
    );
    expect(
      formatProgressEvent({
        type: 'trial-complete',
        trial: 2,
        runs: 5,
        durationMs: 21234,
        valid: false,
        error: 'Response must be a valid JSON object.',
      }),
    ).toBe('[experiment] trial 2/5 finished in 21.2s: invalid - Response must be a valid JSON object.');
  });

  it('formats download progress without duplicating decimals', () => {
    expect(formatProgressEvent({ type: 'download-progress', trial: 1, runs: 1, progressPercent: 43 })).toBe(
      '[experiment] trial 1/1 model download: 43%',
    );
  });
});
