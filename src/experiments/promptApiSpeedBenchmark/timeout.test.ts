import { describe, expect, it, vi } from 'vitest';
import { runCancelableBenchmarkTrialWithTimeout } from './timeout';

describe('runCancelableBenchmarkTrialWithTimeout', () => {
  it('aborts and waits for the in-flight trial cleanup before returning a timeout result', async () => {
    vi.useFakeTimers();
    const cleanup = vi.fn();

    const resultPromise = runCancelableBenchmarkTrialWithTimeout({
      timeoutMs: 1000,
      createTimeoutResult: () => 'timeout',
      runTrial: async (signal) => {
        await new Promise<void>((resolve) => {
          signal.addEventListener('abort', () => {
            cleanup();
            resolve();
          });
        });
        return 'late';
      },
    });

    await vi.advanceTimersByTimeAsync(1000);

    await expect(resultPromise).resolves.toBe('timeout');
    expect(cleanup).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
