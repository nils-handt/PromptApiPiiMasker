import type { Finding } from '../../domain/types';
import type { PromptApiState } from '../../ai/promptApi';
import type {
  PromptApiDiagnosticAvailabilityCheck,
  PromptApiDiagnosticSnapshot,
} from '../promptApiCommon/diagnostics';
import type { ShapeValidationResult } from './responseValidator';

export type { PromptApiDiagnosticAvailabilityCheck, PromptApiDiagnosticSnapshot };

export interface JsonShapeExperimentTrial {
  trial: number;
  durationMs: number;
  availabilityState: PromptApiState | 'unknown';
  rawResponseText: string;
  shape: ShapeValidationResult;
  normalizedFindings: Finding[];
}

export interface JsonShapeExperimentReportInput {
  startedAt: string;
  finishedAt: string;
  sampleJson: string;
  runsRequested: number;
  setupError?: string;
  diagnostics?: PromptApiDiagnosticSnapshot;
  trials: JsonShapeExperimentTrial[];
}

export interface JsonShapeExperimentReport extends JsonShapeExperimentReportInput {
  summary: {
    runsRequested: number;
    runsCompleted: number;
    validShapeCount: number;
    invalidShapeCount: number;
    normalizedFindingCount: number;
    setupSucceeded: boolean;
    allShapesValid: boolean;
  };
}

export function buildJsonShapeExperimentReport(
  input: JsonShapeExperimentReportInput,
): JsonShapeExperimentReport {
  const validShapeCount = input.trials.filter((trial) => trial.shape.valid).length;
  const normalizedFindingCount = input.trials.reduce(
    (total, trial) => total + trial.normalizedFindings.length,
    0,
  );
  const setupSucceeded = input.setupError === undefined;

  return {
    ...input,
    summary: {
      runsRequested: input.runsRequested,
      runsCompleted: input.trials.length,
      validShapeCount,
      invalidShapeCount: input.trials.length - validShapeCount,
      normalizedFindingCount,
      setupSucceeded,
      allShapesValid:
        setupSucceeded && input.trials.length === input.runsRequested && validShapeCount === input.trials.length,
    },
  };
}
