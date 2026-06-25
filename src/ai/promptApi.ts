import type { PromptModelOptions, PromptSession } from '../types/chrome-ai';

export type PromptApiState = 'available' | 'downloadable' | 'downloading' | 'unsupported' | 'unavailable';

export interface PromptApiStatus {
  state: PromptApiState;
  message: string;
}

export const PROMPT_API_OPTIONS = {
  expectedInputs: [
    { type: 'text' as const, languages: ['en', 'de'] },
    { type: 'image' as const },
  ],
  expectedOutputs: [{ type: 'text' as const, languages: ['en'] }],
} satisfies PromptModelOptions;

export async function checkPromptApiStatus(): Promise<PromptApiStatus> {
  if (!globalThis.LanguageModel || typeof globalThis.LanguageModel.availability !== 'function') {
    return {
      state: 'unsupported',
      message: 'Chrome Prompt API is not available in this browser.',
    };
  }

  const availability = await globalThis.LanguageModel.availability(PROMPT_API_OPTIONS);

  if (availability === 'available') {
    return { state: 'available', message: 'Chrome Prompt API model is ready.' };
  }

  if (availability === 'downloadable') {
    return {
      state: 'downloadable',
      message: 'Chrome can download the local model after user activation.',
    };
  }

  if (availability === 'downloading') {
    return { state: 'downloading', message: 'Chrome is downloading the local model.' };
  }

  return {
    state: 'unavailable',
    message: 'Chrome Prompt API model is unavailable on this device or origin.',
  };
}

export async function createPromptSession(
  onDownloadProgress?: (progressPercent: number) => void,
): Promise<PromptSession> {
  if (!globalThis.LanguageModel || typeof globalThis.LanguageModel.create !== 'function') {
    throw new Error('Chrome Prompt API is not available in this browser.');
  }

  return globalThis.LanguageModel.create({
    ...PROMPT_API_OPTIONS,
    monitor(monitor) {
      monitor.addEventListener('downloadprogress', (event) => {
        const progress = event as Event & { loaded?: number };
        onDownloadProgress?.(progressPercentFromLoaded(progress.loaded));
      });
    },
  });
}

function progressPercentFromLoaded(loaded: number | undefined): number {
  if (loaded === undefined || !Number.isFinite(loaded)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(loaded * 100)));
}
