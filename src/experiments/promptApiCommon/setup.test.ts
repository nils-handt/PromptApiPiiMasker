import { afterEach, describe, expect, it, vi } from 'vitest';
import { collectPromptApiSetup } from './setup';

vi.mock('../../ai/promptApi', () => ({
  checkPromptApiStatus: vi.fn(),
}));

vi.mock('./diagnostics', () => ({
  collectPromptApiDiagnostics: vi.fn(),
}));

describe('collectPromptApiSetup', async () => {
  const { checkPromptApiStatus } = await import('../../ai/promptApi');
  const { collectPromptApiDiagnostics } = await import('./diagnostics');

  afterEach(() => {
    vi.mocked(checkPromptApiStatus).mockReset();
    vi.mocked(collectPromptApiDiagnostics).mockReset();
  });

  it('collects diagnostics before checking availability', async () => {
    const diagnostics = {
      userAgent: 'Chrome',
      languageModelPresent: true,
      languageModelAvailabilityPresent: true,
      userActivation: { isActive: false, hasBeenActive: false },
      availabilityChecks: [],
    };
    vi.mocked(collectPromptApiDiagnostics).mockResolvedValue(diagnostics);
    vi.mocked(checkPromptApiStatus).mockResolvedValue({
      state: 'available',
      message: 'Chrome Prompt API model is ready.',
    });
    const events: string[] = [];

    const result = await collectPromptApiSetup((event) => events.push(event.message));

    expect(events).toEqual(['collecting Prompt API diagnostics', 'checking Prompt API availability']);
    expect(result).toEqual({
      diagnostics,
      status: {
        state: 'available',
        message: 'Chrome Prompt API model is ready.',
      },
      setupError: undefined,
    });
  });

  it('reports a setup error for unsupported and unavailable states', async () => {
    vi.mocked(collectPromptApiDiagnostics).mockResolvedValue({
      userAgent: 'Chrome',
      languageModelPresent: false,
      languageModelAvailabilityPresent: false,
      userActivation: { isActive: false, hasBeenActive: false },
      availabilityChecks: [],
    });
    vi.mocked(checkPromptApiStatus).mockResolvedValue({
      state: 'unsupported',
      message: 'Chrome Prompt API is not available in this browser.',
    });

    await expect(collectPromptApiSetup()).resolves.toMatchObject({
      setupError: 'Chrome Prompt API is not available in this browser.',
    });
  });
});
