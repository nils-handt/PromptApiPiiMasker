export interface SpeedBenchmarkExitSummary {
  setupSucceeded: boolean;
  totalTrialsRequested: number;
  totalTrialsCompleted: number;
  sizes: Array<{ errorCount: number }>;
}

export function shouldSpeedBenchmarkExitSuccessfully(summary: SpeedBenchmarkExitSummary): boolean {
  return (
    summary.setupSucceeded &&
    summary.totalTrialsCompleted === summary.totalTrialsRequested &&
    summary.sizes.every((size) => size.errorCount === 0)
  );
}
