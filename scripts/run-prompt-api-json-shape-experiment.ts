import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { chromium, type BrowserContext } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { formatProgressEvent, type PromptApiJsonShapeCliProgressEvent } from './prompt-api-json-shape-progress';
import { buildChromeLaunchOptions } from './prompt-api-json-shape-runner-options';

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

type ExperimentWindow = Window & {
  runPromptApiJsonShapeExperiment?: (options: CliOptions) => Promise<CliExperimentReport>;
};

const rootDir = process.cwd();
const reportsDir = path.join(rootDir, 'experiments', 'results');
const profileDir = path.join(rootDir, 'experiments', '.chrome-profile');

let viteServer: ViteDevServer | undefined;
let browserContext: BrowserContext | undefined;

try {
  const options = parseOptions(process.argv.slice(2));

  await mkdir(reportsDir, { recursive: true });
  await mkdir(profileDir, { recursive: true });

  viteServer = await createServer({
    root: rootDir,
    server: {
      host: '127.0.0.1',
      port: 0,
      strictPort: false,
    },
    logLevel: 'error',
  });
  await viteServer.listen();

  const serverUrl = viteServer.resolvedUrls?.local[0];
  if (!serverUrl) {
    throw new Error('Vite did not expose a local server URL.');
  }

  browserContext = await launchChromeContext(profileDir);
  const page = await browserContext.newPage();
  page.setDefaultTimeout(options.timeoutMs);
  page.setDefaultNavigationTimeout(options.timeoutMs);
  await page.exposeFunction('promptApiJsonShapeProgress', (event: PromptApiJsonShapeCliProgressEvent) => {
    console.log(formatProgressEvent(event));
  });

  await page.goto(new URL('/experiments/prompt-api-json-shape.html', serverUrl).toString());
  await page.waitForFunction(() => typeof (window as ExperimentWindow).runPromptApiJsonShapeExperiment === 'function');

  const report = await page.evaluate(
    async (experimentOptions) =>
      (window as ExperimentWindow).runPromptApiJsonShapeExperiment?.(experimentOptions),
    options,
  );

  if (!report) {
    throw new Error('Experiment page did not return a report.');
  }

  const reportPath = path.join(reportsDir, `prompt-api-json-shape-${safeTimestamp(new Date())}.json`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  printSummary(report, reportPath);
  process.exitCode = report.summary.allShapesValid ? 0 : 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await browserContext?.close();
  await viteServer?.close();
}

function parseOptions(args: string[]): CliOptions {
  const options: CliOptions = {
    runs: DEFAULT_RUNS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };

  for (const arg of args) {
    const [name, value] = arg.split('=');

    if (name === '--runs') {
      options.runs = parsePositiveInteger(value, '--runs');
      continue;
    }

    if (name === '--timeoutMs') {
      options.timeoutMs = parsePositiveInteger(value, '--timeoutMs');
      continue;
    }

    if (name === '--help') {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function parsePositiveInteger(value: string | undefined, optionName: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${optionName} must be a positive integer.`);
  }

  return parsed;
}

async function launchChromeContext(profileDir: string): Promise<BrowserContext> {
  return chromium.launchPersistentContext(
    profileDir,
    buildChromeLaunchOptions({
      executablePath: process.env.PROMPT_API_CHROME_PATH,
      channel: process.env.PROMPT_API_CHROME_CHANNEL || 'chrome',
      profileDir,
    }),
  );
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

function safeTimestamp(date: Date): string {
  return date.toISOString().replaceAll(':', '-').replaceAll('.', '-');
}

function printHelp(): void {
  console.log(`Usage: npm run experiment:prompt-api:json-shape -- [--runs=${DEFAULT_RUNS}] [--timeoutMs=${DEFAULT_TIMEOUT_MS}]

Environment:
  PROMPT_API_CHROME_CHANNEL   Playwright Chrome channel to launch. Defaults to "chrome".
  PROMPT_API_CHROME_PATH      Explicit Chrome executable path. Overrides channel.
`);
}
