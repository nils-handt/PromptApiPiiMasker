import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, type BrowserContext, type BrowserType } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import type { PromptApiExperimentProgressEvent } from '../src/experiments/promptApiCommon/progress';

type PersistentChromeLaunchOptions = NonNullable<Parameters<BrowserType['launchPersistentContext']>[1]>;

export interface ChromeLaunchOptionsInput {
  executablePath?: string;
  channel?: string;
  profileDir: string;
}

export interface BasePromptApiExperimentOptions {
  runs: number;
  timeoutMs: number;
}

export type { PromptApiExperimentProgressEvent };

export interface BrowserExperimentConfig<TOptions, TReport, TProgressEvent> {
  rootDir: string;
  reportsDir: string;
  profileDir: string;
  entryPath: string;
  runnerName: string;
  progressName: string;
  reportPrefix: string;
  options: TOptions;
  timeoutMs: number;
  onProgress?: (event: TProgressEvent) => void;
}

export interface BrowserExperimentResult<TReport> {
  report: TReport;
  reportPath: string;
}

export interface PromptApiCliExperimentConfig<TOptions, TReport, TProgressEvent> {
  args: string[];
  rootDir: string;
  reportPrefix: string;
  entryPath: string;
  runnerName: string;
  progressName: string;
  defaultOptions: BasePromptApiExperimentOptions;
  printHelp: () => void;
  formatProgress: (event: TProgressEvent) => string;
  printSummary: (report: TReport, reportPath: string) => void;
  getExitCode: (report: TReport) => number;
}

export function buildChromeLaunchOptions({
  executablePath,
  channel = 'chrome',
  profileDir,
}: ChromeLaunchOptionsInput): PersistentChromeLaunchOptions {
  const options: PersistentChromeLaunchOptions = {
    headless: false,
    ignoreDefaultArgs: true,
    args: ['--remote-debugging-pipe', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profileDir}`],
  };

  if (executablePath) {
    options.executablePath = executablePath;
  } else {
    options.channel = channel;
  }

  return options;
}

export function parseBasePromptApiExperimentOptions(
  args: string[],
  defaults: BasePromptApiExperimentOptions,
): BasePromptApiExperimentOptions {
  const options: BasePromptApiExperimentOptions = { ...defaults };

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
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

export function formatExperimentProgressEvent(event: PromptApiExperimentProgressEvent): string {
  if (event.type === 'setup') {
    return `[experiment] setup: ${event.message}`;
  }

  const trialPrefix = event.label
    ? `[experiment] ${event.label} trial ${event.trial}/${event.runs}`
    : `[experiment] trial ${event.trial}/${event.runs}`;

  if (event.type === 'trial-start') {
    return `${trialPrefix} started`;
  }

  if (event.type === 'download-progress') {
    return `${trialPrefix} model download: ${event.progressPercent}%`;
  }

  const status = event.valid ? 'valid' : `invalid - ${event.error}`;
  return `${trialPrefix} finished in ${formatDuration(event.durationMs)}: ${status}`;
}

export function formatDuration(durationMs: number): string {
  if (!Number.isFinite(durationMs)) {
    return 'unknown';
  }

  if (durationMs < 1000) {
    return `${Math.round(durationMs)}ms`;
  }

  return `${(durationMs / 1000).toFixed(1)}s`;
}

export function safeTimestamp(date: Date): string {
  return date.toISOString().replaceAll(':', '-').replaceAll('.', '-');
}

export async function runPromptApiCliExperiment<
  TOptions extends BasePromptApiExperimentOptions,
  TReport,
  TProgressEvent,
>({
  args,
  rootDir,
  reportPrefix,
  entryPath,
  runnerName,
  progressName,
  defaultOptions,
  printHelp,
  formatProgress,
  printSummary,
  getExitCode,
}: PromptApiCliExperimentConfig<TOptions, TReport, TProgressEvent>): Promise<void> {
  if (args.includes('--help')) {
    printHelp();
    process.exitCode = 0;
    return;
  }

  const options = parseBasePromptApiExperimentOptions(args, defaultOptions) as TOptions;
  const { report, reportPath } = await runBrowserExperiment<TOptions, TReport, TProgressEvent>({
    rootDir,
    reportsDir: path.join(rootDir, 'experiments', 'results'),
    profileDir: path.join(rootDir, 'experiments', '.chrome-profile'),
    entryPath,
    runnerName,
    progressName,
    reportPrefix,
    options,
    timeoutMs: options.timeoutMs,
    onProgress(event) {
      console.log(formatProgress(event));
    },
  });

  printSummary(report, reportPath);
  process.exitCode = getExitCode(report);
}

export async function runBrowserExperiment<TOptions, TReport, TProgressEvent>({
  rootDir,
  reportsDir,
  profileDir,
  entryPath,
  runnerName,
  progressName,
  reportPrefix,
  options,
  timeoutMs,
  onProgress,
}: BrowserExperimentConfig<TOptions, TReport, TProgressEvent>): Promise<BrowserExperimentResult<TReport>> {
  let viteServer: ViteDevServer | undefined;
  let browserContext: BrowserContext | undefined;
  let operationError: unknown;
  let result: BrowserExperimentResult<TReport> | undefined;

  try {
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
    page.setDefaultTimeout(timeoutMs);
    page.setDefaultNavigationTimeout(timeoutMs);
    await page.exposeFunction(progressName, (event: TProgressEvent) => {
      onProgress?.(event);
    });

    await page.goto(new URL(entryPath, serverUrl).toString());
    await page.waitForFunction(
      (windowRunnerName) => typeof (window as unknown as Record<string, unknown>)[windowRunnerName] === 'function',
      runnerName,
    );

    const report = await withTimeout(
      page.evaluate(
        async ({ experimentOptions, windowRunnerName }) => {
          const runner = (window as unknown as Record<string, unknown>)[windowRunnerName];
          if (typeof runner !== 'function') {
            return undefined;
          }

          return runner(experimentOptions);
        },
        { experimentOptions: options, windowRunnerName: runnerName },
      ),
      timeoutMs,
      `Experiment timed out after ${timeoutMs} ms.`,
    );

    if (!report) {
      throw new Error('Experiment page did not return a report.');
    }

    const reportPath = path.join(reportsDir, `${reportPrefix}-${safeTimestamp(new Date())}.json`);
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    result = { report: report as TReport, reportPath };
  } catch (error) {
    operationError = error;
  }

  const cleanupErrors = await closeBrowserExperimentResources(browserContext, viteServer);

  if (operationError) {
    throw operationError;
  }

  if (cleanupErrors.length > 0) {
    throw cleanupErrors[0];
  }

  if (!result) {
    throw new Error('Experiment did not produce a result.');
  }

  return result;
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

type CloseableExperimentResource = { close(): Promise<unknown> | unknown } | undefined;

export async function closeBrowserExperimentResources(
  browserContext: CloseableExperimentResource,
  viteServer: CloseableExperimentResource,
): Promise<unknown[]> {
  const settled = await Promise.allSettled([
    browserContext?.close(),
    viteServer?.close(),
  ]);

  return settled
    .filter((item): item is PromiseRejectedResult => item.status === 'rejected')
    .map((item) => item.reason);
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
