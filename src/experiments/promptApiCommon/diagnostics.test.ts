import { afterEach, describe, expect, it, vi } from 'vitest';
import { collectPromptApiDiagnostics } from './diagnostics';
import type { PromptModelOptions } from '../../types/chrome-ai';

describe('collectPromptApiDiagnostics', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports unsupported availability checks when LanguageModel is missing', async () => {
    vi.stubGlobal('LanguageModel', undefined);

    const diagnostics = await collectPromptApiDiagnostics();

    expect(diagnostics.languageModelPresent).toBe(false);
    expect(diagnostics.languageModelAvailabilityPresent).toBe(false);
    expect(diagnostics.availabilityChecks).toEqual([
      { label: 'no-options', options: undefined, state: 'unsupported' },
      {
        label: 'text-only',
        options: {
          expectedInputs: [{ type: 'text', languages: ['en'] }],
          expectedOutputs: [{ type: 'text', languages: ['en'] }],
        },
        state: 'unsupported',
      },
      {
        label: 'app-options',
        options: {
          expectedInputs: [
            { type: 'text', languages: ['en', 'de'] },
            { type: 'image' },
          ],
          expectedOutputs: [{ type: 'text', languages: ['en'] }],
        },
        state: 'unsupported',
      },
    ]);
  });

  it('records availability states for each Prompt API option set', async () => {
    const availability = vi.fn(async (options?: PromptModelOptions) => (options ? 'available' : 'downloadable'));
    vi.stubGlobal('LanguageModel', { availability });

    const diagnostics = await collectPromptApiDiagnostics();

    expect(diagnostics.languageModelPresent).toBe(true);
    expect(diagnostics.languageModelAvailabilityPresent).toBe(true);
    expect(diagnostics.availabilityChecks.map((check) => check.state)).toEqual([
      'downloadable',
      'available',
      'available',
    ]);
    expect(availability).toHaveBeenCalledTimes(3);
  });
});
