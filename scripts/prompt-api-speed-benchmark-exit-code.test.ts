import { describe, expect, it } from 'vitest';
import { shouldSpeedBenchmarkExitSuccessfully } from './prompt-api-speed-benchmark-exit-code';

describe('shouldSpeedBenchmarkExitSuccessfully', () => {
  it('returns false when any completed benchmark size has trial errors', () => {
    expect(
      shouldSpeedBenchmarkExitSuccessfully({
        setupSucceeded: true,
        totalTrialsRequested: 2,
        totalTrialsCompleted: 2,
        sizes: [
          { errorCount: 0 },
          { errorCount: 1 },
        ],
      }),
    ).toBe(false);
  });

  it('returns true only when setup succeeds, every trial completes, and no size has errors', () => {
    expect(
      shouldSpeedBenchmarkExitSuccessfully({
        setupSucceeded: true,
        totalTrialsRequested: 2,
        totalTrialsCompleted: 2,
        sizes: [
          { errorCount: 0 },
          { errorCount: 0 },
        ],
      }),
    ).toBe(true);
  });
});
