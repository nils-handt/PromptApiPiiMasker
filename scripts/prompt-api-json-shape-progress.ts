export type PromptApiJsonShapeCliProgressEvent =
  | { type: 'setup'; message: string }
  | { type: 'trial-start'; trial: number; runs: number }
  | { type: 'download-progress'; trial: number; runs: number; progressPercent: number }
  | {
      type: 'trial-complete';
      trial: number;
      runs: number;
      durationMs: number;
      valid: true;
    }
  | {
      type: 'trial-complete';
      trial: number;
      runs: number;
      durationMs: number;
      valid: false;
      error: string;
    };

export function formatProgressEvent(event: PromptApiJsonShapeCliProgressEvent): string {
  if (event.type === 'setup') {
    return `[experiment] setup: ${event.message}`;
  }

  if (event.type === 'trial-start') {
    return `[experiment] trial ${event.trial}/${event.runs} started`;
  }

  if (event.type === 'download-progress') {
    return `[experiment] trial ${event.trial}/${event.runs} model download: ${event.progressPercent}%`;
  }

  const status = event.valid ? 'valid' : `invalid - ${event.error}`;
  return `[experiment] trial ${event.trial}/${event.runs} finished in ${formatDuration(event.durationMs)}: ${status}`;
}

function formatDuration(durationMs: number): string {
  if (!Number.isFinite(durationMs)) {
    return 'unknown';
  }

  if (durationMs < 1000) {
    return `${Math.round(durationMs)}ms`;
  }

  return `${(durationMs / 1000).toFixed(1)}s`;
}
