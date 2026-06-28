import type { PromptApiState } from '../../ai/promptApi';
import type { PromptApiDiagnosticSnapshot } from '../promptApiJsonShape/report';
import type { ShapeValidationResult } from '../promptApiJsonShape/responseValidator';

export interface PromptApiSpeedBenchmarkTrial {
  elementCount: number;
  run: number;
  durationMs: number;
  primitiveValueCount: number;
  availabilityState: PromptApiState | 'unknown';
  rawResponseText: string;
  shape: ShapeValidationResult;
  normalizedFindingCount: number;
  error?: string;
}

export interface PromptApiSpeedBenchmarkReportInput {
  startedAt: string;
  finishedAt: string;
  elementCounts: number[];
  runsPerSize: number;
  setupError?: string;
  diagnostics?: PromptApiDiagnosticSnapshot;
  trials: PromptApiSpeedBenchmarkTrial[];
}

export interface PromptApiSpeedBenchmarkSizeSummary {
  elementCount: number;
  runsRequested: number;
  runsCompleted: number;
  successfulRuns: number;
  errorCount: number;
  minDurationMs: number | null;
  maxDurationMs: number | null;
  averageDurationMs: number | null;
  p50DurationMs: number | null;
}

export interface PromptApiSpeedBenchmarkReport extends PromptApiSpeedBenchmarkReportInput {
  summary: {
    setupSucceeded: boolean;
    totalTrialsRequested: number;
    totalTrialsCompleted: number;
    totalDurationMs: number;
    sizes: PromptApiSpeedBenchmarkSizeSummary[];
  };
}

export function buildPromptApiSpeedBenchmarkReport(
  input: PromptApiSpeedBenchmarkReportInput,
): PromptApiSpeedBenchmarkReport {
  return {
    ...input,
    summary: {
      setupSucceeded: input.setupError === undefined,
      totalTrialsRequested: input.elementCounts.length * input.runsPerSize,
      totalTrialsCompleted: input.trials.length,
      totalDurationMs: input.trials.reduce((total, trial) => total + trial.durationMs, 0),
      sizes: input.elementCounts.map((elementCount) => summarizeSize(input, elementCount)),
    },
  };
}

function summarizeSize(
  input: PromptApiSpeedBenchmarkReportInput,
  elementCount: number,
): PromptApiSpeedBenchmarkSizeSummary {
  const trials = input.trials.filter((trial) => trial.elementCount === elementCount);
  const successfulDurations = trials
    .filter((trial) => trial.shape.valid && !trial.error)
    .map((trial) => trial.durationMs)
    .sort((left, right) => left - right);

  return {
    elementCount,
    runsRequested: input.runsPerSize,
    runsCompleted: trials.length,
    successfulRuns: successfulDurations.length,
    errorCount: trials.length - successfulDurations.length,
    minDurationMs: firstOrNull(successfulDurations),
    maxDurationMs: lastOrNull(successfulDurations),
    averageDurationMs: averageOrNull(successfulDurations),
    p50DurationMs: percentile50OrNull(successfulDurations),
  };
}

function firstOrNull(values: number[]): number | null {
  return values.length > 0 ? values[0] : null;
}

function lastOrNull(values: number[]): number | null {
  return values.length > 0 ? values[values.length - 1] : null;
}

function averageOrNull(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function percentile50OrNull(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return values[Math.floor((values.length - 1) / 2)];
}
