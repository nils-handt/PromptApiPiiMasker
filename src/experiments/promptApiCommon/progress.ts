export type PromptApiExperimentProgressEvent =
  | { type: 'setup'; message: string }
  | { type: 'trial-start'; trial: number; runs: number; label?: string }
  | { type: 'download-progress'; trial: number; runs: number; progressPercent: number; label?: string }
  | {
      type: 'trial-complete';
      trial: number;
      runs: number;
      durationMs: number;
      valid: true;
      label?: string;
    }
  | {
      type: 'trial-complete';
      trial: number;
      runs: number;
      durationMs: number;
      valid: false;
      error: string;
      label?: string;
    };
