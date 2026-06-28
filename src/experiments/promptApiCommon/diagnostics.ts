import { PROMPT_API_OPTIONS } from '../../ai/promptApi';
import type { PromptAvailability, PromptModelOptions } from '../../types/chrome-ai';

export interface PromptApiDiagnosticAvailabilityCheck {
  label: string;
  options?: PromptModelOptions;
  state?: PromptAvailability | 'unsupported';
  error?: string;
}

export interface PromptApiDiagnosticSnapshot {
  userAgent: string;
  languageModelPresent: boolean;
  languageModelAvailabilityPresent: boolean;
  userActivation: {
    isActive: boolean;
    hasBeenActive: boolean;
  };
  availabilityChecks: PromptApiDiagnosticAvailabilityCheck[];
}

const TEXT_ONLY_PROMPT_API_OPTIONS = {
  expectedInputs: [{ type: 'text' as const, languages: ['en'] }],
  expectedOutputs: [{ type: 'text' as const, languages: ['en'] }],
} satisfies PromptModelOptions;

export async function collectPromptApiDiagnostics(): Promise<PromptApiDiagnosticSnapshot> {
  const userActivation = (
    navigator as Navigator & {
      userActivation?: {
        isActive?: boolean;
        hasBeenActive?: boolean;
      };
    }
  ).userActivation;
  const languageModelPresent = Boolean(globalThis.LanguageModel);
  const languageModelAvailabilityPresent =
    Boolean(globalThis.LanguageModel) && typeof globalThis.LanguageModel?.availability === 'function';

  return {
    userAgent: navigator.userAgent,
    languageModelPresent,
    languageModelAvailabilityPresent,
    userActivation: {
      isActive: Boolean(userActivation?.isActive),
      hasBeenActive: Boolean(userActivation?.hasBeenActive),
    },
    availabilityChecks: [
      await checkAvailability('no-options'),
      await checkAvailability('text-only', TEXT_ONLY_PROMPT_API_OPTIONS),
      await checkAvailability('app-options', PROMPT_API_OPTIONS),
    ],
  };
}

async function checkAvailability(
  label: string,
  options?: PromptModelOptions,
): Promise<PromptApiDiagnosticAvailabilityCheck> {
  if (!globalThis.LanguageModel || typeof globalThis.LanguageModel.availability !== 'function') {
    return { label, options, state: 'unsupported' };
  }

  try {
    return {
      label,
      options,
      state: await globalThis.LanguageModel.availability(options),
    };
  } catch (error) {
    return {
      label,
      options,
      error: error instanceof Error ? error.message : 'Availability check failed.',
    };
  }
}
