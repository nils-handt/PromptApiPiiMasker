import { describe, expect, it } from 'vitest';
import { buildChromeLaunchOptions } from './prompt-api-json-shape-runner-options';

describe('buildChromeLaunchOptions', () => {
  it('uses a near-normal Chrome launch so model components can download', () => {
    expect(buildChromeLaunchOptions({ profileDir: 'C:/profile' })).toEqual({
      channel: 'chrome',
      headless: false,
      ignoreDefaultArgs: true,
      args: ['--remote-debugging-pipe', '--no-first-run', '--no-default-browser-check', '--user-data-dir=C:/profile'],
    });
  });

  it('uses an explicit executable path instead of a channel when provided', () => {
    expect(
      buildChromeLaunchOptions({
        executablePath: 'C:/Chrome/chrome.exe',
        channel: 'chrome-beta',
        profileDir: 'C:/profile',
      }),
    ).toEqual({
      executablePath: 'C:/Chrome/chrome.exe',
      headless: false,
      ignoreDefaultArgs: true,
      args: ['--remote-debugging-pipe', '--no-first-run', '--no-default-browser-check', '--user-data-dir=C:/profile'],
    });
  });
});
