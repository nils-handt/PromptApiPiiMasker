import process from 'node:process';
import { pathToFileURL } from 'node:url';
import {
  formatDuration,
  formatExperimentProgressEvent,
  runPromptApiCliExperiment,
  type PromptApiExperimentProgressEvent,
} from './prompt-api-experiment-runner';
import { shouldSpeedBenchmarkExitSuccessfully } from './prompt-api-speed-benchmark-exit-code';

const DEFAULT_RUNS = 1;
const DEFAULT_TIMEOUT_MS = 120_000;

type CliOptions = {
  runs: number;
  timeoutMs: number;
};

interface CliSpeedBenchmarkReport {
  runsPerSize: number;
  setupError?: string;
  summary: {
    setupSucceeded: boolean;
    totalTrialsRequested: number;
    totalTrialsCompleted: number;
    totalDurationMs: number;
    sizes: Array<{
      elementCount: number;
      runsRequested: number;
      successfulRuns: number;
      errorCount: number;
      minDurationMs: number | null;
      maxDurationMs: number | null;
      averageDurationMs: number | null;
      p50DurationMs: number | null;
    }>;
  };
}

try {
  await runPromptApiCliExperiment<CliOptions, CliSpeedBenchmarkReport, PromptApiExperimentProgressEvent>({
    args: process.argv.slice(2),
    rootDir: process.cwd(),
    reportPrefix: 'prompt-api-speed',
    entryPath: '/experiments/prompt-api-speed.html',
    runnerName: 'runPromptApiSpeedBenchmark',
    progressName: 'promptApiSpeedBenchmarkProgress',
    defaultOptions: {
      runs: DEFAULT_RUNS,
      timeoutMs: DEFAULT_TIMEOUT_MS,
    },
    printHelp,
    formatProgress: formatExperimentProgressEvent,
    printSummary,
    getExitCode(report) {
      return shouldSpeedBenchmarkExitSuccessfully(report.summary) ? 0 : 1;
    },
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

function printSummary(report: CliSpeedBenchmarkReport, reportPath: string): void {
  const reportUrl = pathToFileURL(reportPath).toString();

  console.log('Prompt API speed benchmark');
  console.log(`Runs per size: ${report.runsPerSize}`);
  console.log(`Trials: ${report.summary.totalTrialsCompleted}/${report.summary.totalTrialsRequested}`);
  console.log(`Total timed duration: ${formatDuration(report.summary.totalDurationMs)}`);
  console.log(`Setup: ${report.summary.setupSucceeded ? 'ok' : 'failed'}`);
  console.log(`Report: ${reportUrl}`);

  for (const size of report.summary.sizes) {
    const average = size.averageDurationMs === null ? 'n/a' : formatDuration(size.averageDurationMs);
    const p50 = size.p50DurationMs === null ? 'n/a' : formatDuration(size.p50DurationMs);
    const range = size.minDurationMs === null || size.maxDurationMs === null
      ? 'n/a'
      : `${formatDuration(size.minDurationMs)}-${formatDuration(size.maxDurationMs)}`;
    console.log(
      `- ${size.elementCount} elements: ${size.successfulRuns}/${size.runsRequested} ok, avg ${average}, p50 ${p50}, range ${range}, errors ${size.errorCount}`,
    );
  }

  if (report.setupError) {
    console.log(`Setup error: ${report.setupError}`);
  }
}

function printHelp(): void {
  console.log(`Usage: npm run experiment:prompt-api:speed -- [--runs=${DEFAULT_RUNS}] [--timeoutMs=${DEFAULT_TIMEOUT_MS}]

Runs are per JSON size. With --runs=3 the benchmark records 21 trials across JSON sizes 1, 4, 8, 16, 32, 64, and 128.

Environment:
  PROMPT_API_CHROME_CHANNEL   Playwright Chrome channel to launch. Defaults to "chrome".
  PROMPT_API_CHROME_PATH      Explicit Chrome executable path. Overrides channel.
`);
}
