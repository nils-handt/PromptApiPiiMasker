import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { formatProgressEvent, type PromptApiJsonShapeCliProgressEvent } from './prompt-api-json-shape-progress';
import { runPromptApiCliExperiment } from './prompt-api-experiment-runner';

const DEFAULT_RUNS = 20;
const DEFAULT_TIMEOUT_MS = 120_000;

interface CliOptions {
  runs: number;
  timeoutMs: number;
}

type CliShapeValidationResult = { valid: true } | { valid: false; error: string };

interface CliExperimentReport {
  setupError?: string;
  diagnostics?: {
    userAgent: string;
    languageModelPresent: boolean;
    languageModelAvailabilityPresent: boolean;
    userActivation: {
      isActive: boolean;
      hasBeenActive: boolean;
    };
    availabilityChecks: Array<{
      label: string;
      state?: string;
      error?: string;
    }>;
  };
  trials: Array<{
    trial: number;
    shape: CliShapeValidationResult;
  }>;
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

try {
  await runPromptApiCliExperiment<CliOptions, CliExperimentReport, PromptApiJsonShapeCliProgressEvent>({
    args: process.argv.slice(2),
    rootDir: process.cwd(),
    reportPrefix: 'prompt-api-json-shape',
    entryPath: '/experiments/prompt-api-json-shape.html',
    runnerName: 'runPromptApiJsonShapeExperiment',
    progressName: 'promptApiJsonShapeProgress',
    defaultOptions: {
      runs: DEFAULT_RUNS,
      timeoutMs: DEFAULT_TIMEOUT_MS,
    },
    printHelp,
    formatProgress: formatProgressEvent,
    printSummary,
    getExitCode(report) {
      return report.summary.allShapesValid ? 0 : 1;
    },
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}

function printSummary(report: CliExperimentReport, reportPath: string): void {
  const reportUrl = pathToFileURL(reportPath).toString();

  console.log('Prompt API JSON shape experiment');
  console.log(`Runs: ${report.summary.runsCompleted}/${report.summary.runsRequested}`);
  console.log(`Valid shapes: ${report.summary.validShapeCount}`);
  console.log(`Invalid shapes: ${report.summary.invalidShapeCount}`);
  console.log(`Normalized findings: ${report.summary.normalizedFindingCount}`);
  console.log(`Setup: ${report.summary.setupSucceeded ? 'ok' : 'failed'}`);
  console.log(`Report: ${reportUrl}`);

  if (report.setupError) {
    console.log(`Setup error: ${report.setupError}`);
  }

  if (report.diagnostics) {
    printDiagnostics(report.diagnostics);
  }

  if (report.trials.some((item) => !item.shape.valid)) {
    console.log('Invalid trial details:');

    for (const trial of report.trials) {
      if (!trial.shape.valid) {
        console.log(`- Trial ${trial.trial}: ${trial.shape.error}`);
      }
    }
  }
}

function printDiagnostics(diagnostics: CliExperimentReport['diagnostics']): void {
  if (!diagnostics) {
    return;
  }

  console.log('Prompt API diagnostics:');
  console.log(`- userAgent: ${diagnostics.userAgent}`);
  console.log(`- LanguageModel present: ${diagnostics.languageModelPresent}`);
  console.log(`- LanguageModel.availability present: ${diagnostics.languageModelAvailabilityPresent}`);
  console.log(`- userActivation.isActive: ${diagnostics.userActivation.isActive}`);
  console.log(`- userActivation.hasBeenActive: ${diagnostics.userActivation.hasBeenActive}`);

  for (const check of diagnostics.availabilityChecks) {
    const result = check.error ? `error: ${check.error}` : check.state;
    console.log(`- availability ${check.label}: ${result}`);
  }
}

function printHelp(): void {
  console.log(`Usage: npm run experiment:prompt-api:json-shape -- [--runs=${DEFAULT_RUNS}] [--timeoutMs=${DEFAULT_TIMEOUT_MS}]

Environment:
  PROMPT_API_CHROME_CHANNEL   Playwright Chrome channel to launch. Defaults to "chrome".
  PROMPT_API_CHROME_PATH      Explicit Chrome executable path. Overrides channel.
`);
}
