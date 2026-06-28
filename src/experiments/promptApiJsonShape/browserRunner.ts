import { analyzeJsonDocument } from '../../ai/jsonPiiAnalyzer';
import { createPromptSession, type PromptApiState } from '../../ai/promptApi';
import { parseJsonDocument } from '../../documents/json/jsonAdapter';
import type { Finding, JsonDocumentSource } from '../../domain/types';
import type { PromptSessionOptions } from '../../types/chrome-ai';
import { normalizePositiveInteger } from '../promptApiCommon/options';
import { collectPromptApiSetup } from '../promptApiCommon/setup';
import {
  buildJsonShapeExperimentReport,
  type JsonShapeExperimentReport,
} from './report';
import { validateJsonAnalysisResponseShape, type ShapeValidationResult } from './responseValidator';

export const DEFAULT_SAMPLE_JSON =
  '{"name":"Kelly Doe","email":"kdoe@example.com","id":"12324","phone":"5551234567"}';

export interface PromptApiJsonShapeExperimentOptions {
  runs?: number;
  timeoutMs?: number;
  sampleJson?: string;
}

type PromptApiJsonShapeProgressEvent =
  | { type: 'setup'; message: string }
  | { type: 'trial-start'; trial: number; runs: number }
  | { type: 'download-progress'; trial: number; runs: number; progressPercent: number }
  | {
      type: 'trial-complete';
      trial: number;
      runs: number;
      durationMs: number;
      valid: true;
    }
  | {
      type: 'trial-complete';
      trial: number;
      runs: number;
      durationMs: number;
      valid: false;
      error: string;
    };

declare global {
  interface Window {
    runPromptApiJsonShapeExperiment?: (
      options?: PromptApiJsonShapeExperimentOptions,
    ) => Promise<JsonShapeExperimentReport>;
    promptApiJsonShapeProgress?: (event: PromptApiJsonShapeProgressEvent) => void | Promise<void>;
  }
}

interface CapturedPromptSession {
  prompt(input: string, options?: PromptSessionOptions): Promise<string>;
}

interface TrialResult {
  trial: number;
  durationMs: number;
  availabilityState: PromptApiState | 'unknown';
  rawResponseText: string;
  shape: ShapeValidationResult;
  normalizedFindings: Finding[];
}

export async function runPromptApiJsonShapeExperiment(
  options: PromptApiJsonShapeExperimentOptions = {},
): Promise<JsonShapeExperimentReport> {
  const runs = normalizePositiveInteger(options.runs, 20);
  const timeoutMs = normalizePositiveInteger(options.timeoutMs, 120_000);
  const sampleJson = options.sampleJson ?? DEFAULT_SAMPLE_JSON;
  const startedAt = new Date().toISOString();
  emitProgress({ type: 'setup', message: 'parsing sample JSON' });
  const document = await parseJsonDocument(new File([sampleJson], 'prompt-api-json-shape-sample.json', {
    type: 'application/json',
  }));
  const validPaths = new Set(document.values.map((node) => node.path));
  const { diagnostics, status, setupError } = await collectPromptApiSetup(emitProgress);

  if (setupError) {
    emitProgress({ type: 'setup', message: `Prompt API setup failed: ${status.message}` });
    return buildJsonShapeExperimentReport({
      startedAt,
      finishedAt: new Date().toISOString(),
      sampleJson,
      runsRequested: runs,
      setupError,
      diagnostics,
      trials: [],
    });
  }

  const trials: TrialResult[] = [];

  for (let trial = 1; trial <= runs; trial += 1) {
    emitProgress({ type: 'trial-start', trial, runs });
    const result = await runTrialWithTimeout(trial, runs, document, validPaths, status.state, timeoutMs);
    trials.push(result);
    if (result.shape.valid) {
      emitProgress({ type: 'trial-complete', trial, runs, durationMs: result.durationMs, valid: true });
    } else {
      emitProgress({
        type: 'trial-complete',
        trial,
        runs,
        durationMs: result.durationMs,
        valid: false,
        error: result.shape.error,
      });
    }
  }

  return buildJsonShapeExperimentReport({
    startedAt,
    finishedAt: new Date().toISOString(),
    sampleJson,
    runsRequested: runs,
    diagnostics,
    trials,
  });
}

async function runTrialWithTimeout(
  trial: number,
  runs: number,
  document: JsonDocumentSource,
  validPaths: ReadonlySet<string>,
  availabilityState: PromptApiState,
  timeoutMs: number,
): Promise<TrialResult> {
  const timeout = new Promise<TrialResult>((resolve) => {
    window.setTimeout(() => {
      resolve({
        trial,
        durationMs: timeoutMs,
        availabilityState,
        rawResponseText: '',
        shape: { valid: false, error: `Trial timed out after ${timeoutMs} ms.` },
        normalizedFindings: [],
      });
    }, timeoutMs);
  });

  return Promise.race([runTrial(trial, runs, document, validPaths, availabilityState), timeout]);
}

async function runTrial(
  trial: number,
  runs: number,
  document: JsonDocumentSource,
  validPaths: ReadonlySet<string>,
  availabilityState: PromptApiState,
): Promise<TrialResult> {
  const started = performance.now();
  let lastDownloadProgress: number | undefined;
  const session = await createPromptSession((progressPercent) => {
    if (progressPercent === lastDownloadProgress) {
      return;
    }

    lastDownloadProgress = progressPercent;
    emitProgress({ type: 'download-progress', trial, runs, progressPercent });
  });
  let rawResponseText = '';

  const capturingSession: CapturedPromptSession = {
    async prompt(input, options) {
      rawResponseText = await session.prompt(input, options);
      return rawResponseText;
    },
  };

  try {
    const normalizedFindings = await analyzeJsonDocument(document, capturingSession);
    const shape = validateJsonAnalysisResponseShape(rawResponseText, validPaths);

    return {
      trial,
      durationMs: Math.round(performance.now() - started),
      availabilityState,
      rawResponseText,
      shape,
      normalizedFindings,
    };
  } catch (error) {
    return {
      trial,
      durationMs: Math.round(performance.now() - started),
      availabilityState,
      rawResponseText,
      shape: {
        valid: false,
        error: error instanceof Error ? error.message : 'Prompt API trial failed.',
      },
      normalizedFindings: [],
    };
  } finally {
    session.destroy?.();
  }
}

function emitProgress(event: PromptApiJsonShapeProgressEvent): void {
  void window.promptApiJsonShapeProgress?.(event);
}

window.runPromptApiJsonShapeExperiment = runPromptApiJsonShapeExperiment;
