import type { BrowserType } from 'playwright';

type PersistentChromeLaunchOptions = NonNullable<Parameters<BrowserType['launchPersistentContext']>[1]>;

interface ChromeLaunchOptionsInput {
  executablePath?: string;
  channel?: string;
  profileDir: string;
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
