import { analyzeJsonDocument } from '../../ai/jsonPiiAnalyzer';
import { createPromptSession, type PromptApiState } from '../../ai/promptApi';
import { parseJsonDocument } from '../../documents/json/jsonAdapter';
import type { JsonDocumentSource } from '../../domain/types';
import type { PromptSessionOptions } from '../../types/chrome-ai';
import { normalizePositiveInteger } from '../promptApiCommon/options';
import type { PromptApiExperimentProgressEvent } from '../promptApiCommon/progress';
import { collectPromptApiSetup } from '../promptApiCommon/setup';
import { validateJsonAnalysisResponseShape, type ShapeValidationResult } from '../promptApiJsonShape/responseValidator';
import { BENCHMARK_JSON_ELEMENT_COUNTS, buildBenchmarkJsonDocument } from './sampleData';
import { runCancelableBenchmarkTrialWithTimeout } from './timeout';
import {
  buildPromptApiSpeedBenchmarkReport,
  type PromptApiSpeedBenchmarkReport,
  type PromptApiSpeedBenchmarkTrial,
} from './report';

export interface PromptApiSpeedBenchmarkOptions {
  runs?: number;
  timeoutMs?: number;
  elementCounts?: number[];
}

type PromptApiSpeedBenchmarkProgressEvent = PromptApiExperimentProgressEvent & { label?: string };

declare global {
  interface Window {
    runPromptApiSpeedBenchmark?: (
      options?: PromptApiSpeedBenchmarkOptions,
    ) => Promise<PromptApiSpeedBenchmarkReport>;
    promptApiSpeedBenchmarkProgress?: (event: PromptApiSpeedBenchmarkProgressEvent) => void | Promise<void>;
  }
}

interface CapturedPromptSession {
  prompt(input: string, options?: PromptSessionOptions): Promise<string>;
}

interface PreparedBenchmarkDocument {
  elementCount: number;
  document: JsonDocumentSource;
  validPaths: ReadonlySet<string>;
}

export async function runPromptApiSpeedBenchmark(
  options: PromptApiSpeedBenchmarkOptions = {},
): Promise<PromptApiSpeedBenchmarkReport> {
  const runsPerSize = normalizePositiveInteger(options.runs, 1);
  const timeoutMs = normalizePositiveInteger(options.timeoutMs, 120_000);
  const elementCounts = normalizeElementCounts(options.elementCounts);
  const startedAt = new Date().toISOString();

  emitProgress({ type: 'setup', message: 'building benchmark JSON documents' });
  const documents = await Promise.all(elementCounts.map(prepareBenchmarkDocument));
  const { diagnostics, status, setupError } = await collectPromptApiSetup(emitProgress);

  if (setupError) {
    emitProgress({ type: 'setup', message: `Prompt API setup failed: ${status.message}` });
    return buildPromptApiSpeedBenchmarkReport({
      startedAt,
      finishedAt: new Date().toISOString(),
      elementCounts,
      runsPerSize,
      setupError,
      diagnostics,
      trials: [],
    });
  }

  const trials: PromptApiSpeedBenchmarkTrial[] = [];

  for (const benchmarkDocument of documents) {
    for (let run = 1; run <= runsPerSize; run += 1) {
      const label = `${benchmarkDocument.elementCount} elements`;
      emitProgress({ type: 'trial-start', trial: run, runs: runsPerSize, label });
      const result = await runTrialWithTimeout(benchmarkDocument, run, runsPerSize, status.state, timeoutMs);
      trials.push(result);

      if (result.shape.valid && !result.error) {
        emitProgress({ type: 'trial-complete', trial: run, runs: runsPerSize, durationMs: result.durationMs, valid: true, label });
      } else {
        emitProgress({
          type: 'trial-complete',
          trial: run,
          runs: runsPerSize,
          durationMs: result.durationMs,
          valid: false,
          error: result.error ?? (result.shape.valid ? 'Prompt API trial failed.' : result.shape.error),
          label,
        });
      }
    }
  }

  return buildPromptApiSpeedBenchmarkReport({
    startedAt,
    finishedAt: new Date().toISOString(),
    elementCounts,
    runsPerSize,
    diagnostics,
    trials,
  });
}

async function prepareBenchmarkDocument(elementCount: number): Promise<PreparedBenchmarkDocument> {
  const sampleJson = buildBenchmarkJsonDocument(elementCount);
  const document = await parseJsonDocument(new File([sampleJson], `prompt-api-speed-${elementCount}.json`, {
    type: 'application/json',
  }));

  return {
    elementCount,
    document,
    validPaths: new Set(document.values.map((node) => node.path)),
  };
}

async function runTrialWithTimeout(
  benchmarkDocument: PreparedBenchmarkDocument,
  run: number,
  runsPerSize: number,
  availabilityState: PromptApiState,
  timeoutMs: number,
): Promise<PromptApiSpeedBenchmarkTrial> {
  return runCancelableBenchmarkTrialWithTimeout({
    timeoutMs,
    createTimeoutResult: () => ({
        elementCount: benchmarkDocument.elementCount,
        run,
        durationMs: timeoutMs,
        primitiveValueCount: benchmarkDocument.document.values.length,
        availabilityState,
        rawResponseText: '',
        shape: { valid: false, error: `Trial timed out after ${timeoutMs} ms.` },
        normalizedFindingCount: 0,
        error: `Trial timed out after ${timeoutMs} ms.`,
      }),
    runTrial: (signal) => runTrial(benchmarkDocument, run, runsPerSize, availabilityState, signal),
  });
}

async function runTrial(
  benchmarkDocument: PreparedBenchmarkDocument,
  run: number,
  runsPerSize: number,
  availabilityState: PromptApiState,
  signal: AbortSignal,
): Promise<PromptApiSpeedBenchmarkTrial> {
  const started = performance.now();
  const label = `${benchmarkDocument.elementCount} elements`;
  let lastDownloadProgress: number | undefined;
  const session = await createPromptSession((progressPercent) => {
    if (progressPercent === lastDownloadProgress) {
      return;
    }

    lastDownloadProgress = progressPercent;
    emitProgress({ type: 'download-progress', trial: run, runs: runsPerSize, progressPercent, label });
  });
  const destroySession = () => {
    session.destroy?.();
  };
  const abortError = new Error('Prompt API benchmark trial was aborted.');
  const aborted = new Promise<never>((_, reject) => {
    signal.addEventListener('abort', () => reject(abortError), { once: true });
  });
  signal.addEventListener('abort', destroySession, { once: true });
  let rawResponseText = '';

  const capturingSession: CapturedPromptSession = {
    async prompt(input, options) {
      rawResponseText = await session.prompt(input, options);
      return rawResponseText;
    },
  };

  try {
    if (signal.aborted) {
      throw abortError;
    }

    const normalizedFindings = await Promise.race([
      analyzeJsonDocument(benchmarkDocument.document, capturingSession),
      aborted,
    ]);
    if (signal.aborted) {
      throw abortError;
    }
    const shape = validateJsonAnalysisResponseShape(rawResponseText, benchmarkDocument.validPaths);

    return {
      elementCount: benchmarkDocument.elementCount,
      run,
      durationMs: Math.round(performance.now() - started),
      primitiveValueCount: benchmarkDocument.document.values.length,
      availabilityState,
      rawResponseText,
      shape,
      normalizedFindingCount: normalizedFindings.length,
    };
  } catch (error) {
    return {
      elementCount: benchmarkDocument.elementCount,
      run,
      durationMs: Math.round(performance.now() - started),
      primitiveValueCount: benchmarkDocument.document.values.length,
      availabilityState,
      rawResponseText,
      shape: {
        valid: false,
        error: error instanceof Error ? error.message : 'Prompt API benchmark trial failed.',
      },
      normalizedFindingCount: 0,
      error: error instanceof Error ? error.message : 'Prompt API benchmark trial failed.',
    };
  } finally {
    signal.removeEventListener('abort', destroySession);
    session.destroy?.();
  }
}

function normalizeElementCounts(value: number[] | undefined): number[] {
  if (!value || value.length === 0) {
    return [...BENCHMARK_JSON_ELEMENT_COUNTS];
  }

  return value.map((item) => normalizePositiveInteger(item, 1));
}

function emitProgress(event: PromptApiSpeedBenchmarkProgressEvent): void {
  void window.promptApiSpeedBenchmarkProgress?.(event);
}

window.runPromptApiSpeedBenchmark = runPromptApiSpeedBenchmark;
