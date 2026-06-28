import {
  formatExperimentProgressEvent,
  type PromptApiExperimentProgressEvent,
} from './prompt-api-experiment-runner';

export type PromptApiJsonShapeCliProgressEvent = PromptApiExperimentProgressEvent;

export function formatProgressEvent(event: PromptApiJsonShapeCliProgressEvent): string {
  return formatExperimentProgressEvent(event);
}
