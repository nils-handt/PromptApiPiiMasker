export type PromptAvailability = 'available' | 'downloadable' | 'downloading' | 'unavailable';

export interface PromptExpectedInput {
  type: 'text' | 'image';
  languages?: string[];
}

export interface PromptExpectedOutput {
  type: 'text';
  languages?: string[];
}

export interface PromptMessageTextPart {
  type: 'text';
  value: string;
}

export interface PromptMessageImagePart {
  type: 'image';
  value: Blob | HTMLCanvasElement | HTMLImageElement | ImageBitmap | ImageData | OffscreenCanvas;
}

export type PromptMessageContent = string | Array<PromptMessageTextPart | PromptMessageImagePart>;

export interface PromptMessage {
  role: 'system' | 'user' | 'assistant';
  content: PromptMessageContent;
  prefix?: boolean;
}

export interface PromptModelOptions {
  expectedInputs?: PromptExpectedInput[];
  expectedOutputs?: PromptExpectedOutput[];
}

export interface PromptCreateOptions extends PromptModelOptions {
  signal?: AbortSignal;
  monitor?: (monitor: EventTarget) => void;
}

export interface PromptSession {
  prompt(input: string | PromptMessage[]): Promise<string>;
  destroy?: () => void;
}

export interface LanguageModelApi {
  availability(options?: PromptModelOptions): Promise<PromptAvailability>;
  create(options?: PromptCreateOptions): Promise<PromptSession>;
}

declare global {
  var LanguageModel: LanguageModelApi | undefined;
}
