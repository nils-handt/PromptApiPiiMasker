import { checkPromptApiStatus, type PromptApiStatus } from '../../ai/promptApi';
import { collectPromptApiDiagnostics, type PromptApiDiagnosticSnapshot } from './diagnostics';

type SetupProgress = { type: 'setup'; message: string };

export interface PromptApiSetupResult {
  diagnostics: PromptApiDiagnosticSnapshot;
  status: PromptApiStatus;
  setupError?: string;
}

export async function collectPromptApiSetup(
  emitProgress?: (event: SetupProgress) => void,
): Promise<PromptApiSetupResult> {
  emitProgress?.({ type: 'setup', message: 'collecting Prompt API diagnostics' });
  const diagnostics = await collectPromptApiDiagnostics();
  emitProgress?.({ type: 'setup', message: 'checking Prompt API availability' });
  const status = await checkPromptApiStatus();
  const setupError = status.state === 'unsupported' || status.state === 'unavailable'
    ? status.message
    : undefined;

  return { diagnostics, status, setupError };
}
