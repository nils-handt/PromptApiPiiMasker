import { describe, expect, it, vi } from 'vitest';
import {
  buildChromeLaunchOptions,
  closeBrowserExperimentResources,
  formatDuration,
  formatExperimentProgressEvent,
  parseBasePromptApiExperimentOptions,
  safeTimestamp,
  withTimeout,
} from './prompt-api-experiment-runner';

describe('prompt API experiment runner helpers', () => {
  it('parses shared runs and timeout options', () => {
    expect(parseBasePromptApiExperimentOptions(['--runs=3', '--timeoutMs=45000'], {
      runs: 20,
      timeoutMs: 120_000,
    })).toEqual({
      runs: 3,
      timeoutMs: 45_000,
    });
  });

  it('rejects non-positive shared numeric options', () => {
    expect(() =>
      parseBasePromptApiExperimentOptions(['--runs=0'], {
        runs: 20,
        timeoutMs: 120_000,
      }),
    ).toThrow('--runs must be a positive integer.');
  });

  it('creates timestamps safe for filenames', () => {
    expect(safeTimestamp(new Date('2026-06-28T10:11:12.013Z'))).toBe('2026-06-28T10-11-12-013Z');
  });

  it('formats generic progress events with optional trial labels', () => {
    expect(formatExperimentProgressEvent({ type: 'setup', message: 'checking Prompt API availability' })).toBe(
      '[experiment] setup: checking Prompt API availability',
    );
    expect(formatExperimentProgressEvent({ type: 'trial-start', trial: 2, runs: 5 })).toBe(
      '[experiment] trial 2/5 started',
    );
    expect(
      formatExperimentProgressEvent({
        type: 'trial-complete',
        trial: 2,
        runs: 5,
        durationMs: 21234,
        valid: false,
        error: 'Response must be a valid JSON object.',
        label: '32 elements',
      }),
    ).toBe('[experiment] 32 elements trial 2/5 finished in 21.2s: invalid - Response must be a valid JSON object.');
  });

  it('formats durations for CLI output', () => {
    expect(formatDuration(Number.NaN)).toBe('unknown');
    expect(formatDuration(999)).toBe('999ms');
    expect(formatDuration(1234)).toBe('1.2s');
  });

  it('uses a near-normal Chrome launch so model components can download', () => {
    expect(buildChromeLaunchOptions({ profileDir: 'C:/profile' })).toEqual({
      channel: 'chrome',
      headless: false,
      ignoreDefaultArgs: true,
      args: ['--remote-debugging-pipe', '--no-first-run', '--no-default-browser-check', '--user-data-dir=C:/profile'],
    });
  });

  it('rejects long-running browser work after the configured timeout', async () => {
    vi.useFakeTimers();

    const result = withTimeout(new Promise(() => undefined), 5000, 'Experiment timed out after 5000 ms.');
    const assertion = expect(result).rejects.toThrow('Experiment timed out after 5000 ms.');
    await vi.advanceTimersByTimeAsync(5000);

    await assertion;
    vi.useRealTimers();
  });

  it('closes browser and vite resources independently', async () => {
    const browserClose = vi.fn(async () => {
      throw new Error('browser close failed');
    });
    const viteClose = vi.fn(async () => undefined);

    const errors = await closeBrowserExperimentResources(
      { close: browserClose },
      { close: viteClose },
    );

    expect(browserClose).toHaveBeenCalledTimes(1);
    expect(viteClose).toHaveBeenCalledTimes(1);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(Error);
  });
});
