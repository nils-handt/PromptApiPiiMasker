interface CancelableBenchmarkTrialOptions<T> {
  timeoutMs: number;
  createTimeoutResult: () => T;
  runTrial: (signal: AbortSignal) => Promise<T>;
}

export async function runCancelableBenchmarkTrialWithTimeout<T>({
  timeoutMs,
  createTimeoutResult,
  runTrial,
}: CancelableBenchmarkTrialOptions<T>): Promise<T> {
  const controller = new AbortController();
  let timeoutId: number | undefined;
  let timedOut = false;

  const trial = runTrial(controller.signal);
  const timeout = new Promise<T>((resolve) => {
    timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
      resolve(createTimeoutResult());
    }, timeoutMs);
  });

  const result = await Promise.race([trial, timeout]);

  if (timeoutId !== undefined) {
    window.clearTimeout(timeoutId);
  }

  if (timedOut) {
    await trial.catch(() => undefined);
  }

  return result;
}
