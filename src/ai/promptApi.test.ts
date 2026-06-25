import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkPromptApiStatus, createPromptSession } from './promptApi';

describe('promptApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(globalThis, 'LanguageModel');
  });

  it('reports unsupported when LanguageModel is missing', async () => {
    await expect(checkPromptApiStatus()).resolves.toEqual({
      state: 'unsupported',
      message: 'Chrome Prompt API is not available in this browser.',
    });
  });

  it('reports unsupported when availability is missing', async () => {
    vi.stubGlobal('LanguageModel', {});

    await expect(checkPromptApiStatus()).resolves.toEqual({
      state: 'unsupported',
      message: 'Chrome Prompt API is not available in this browser.',
    });
  });

  it('reports unsupported when availability is not callable', async () => {
    vi.stubGlobal('LanguageModel', { availability: 'available' });

    await expect(checkPromptApiStatus()).resolves.toEqual({
      state: 'unsupported',
      message: 'Chrome Prompt API is not available in this browser.',
    });
  });

  it('passes expected modalities and languages to availability', async () => {
    const availability = vi.fn().mockResolvedValue('available');
    vi.stubGlobal('LanguageModel', { availability });

    await expect(checkPromptApiStatus()).resolves.toEqual({
      state: 'available',
      message: 'Chrome Prompt API model is ready.',
    });

    expect(availability).toHaveBeenCalledWith({
      expectedInputs: [
        { type: 'text', languages: ['en', 'de'] },
        { type: 'image' },
      ],
      expectedOutputs: [{ type: 'text', languages: ['en'] }],
    });
  });

  it('reports downloading status', async () => {
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('downloading'),
    });

    await expect(checkPromptApiStatus()).resolves.toEqual({
      state: 'downloading',
      message: 'Chrome is downloading the local model.',
    });
  });

  it('reports downloadable status', async () => {
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('downloadable'),
    });

    await expect(checkPromptApiStatus()).resolves.toEqual({
      state: 'downloadable',
      message: 'Chrome can download the local model after user activation.',
    });
  });

  it('falls back to unavailable status', async () => {
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('unavailable'),
    });

    await expect(checkPromptApiStatus()).resolves.toEqual({
      state: 'unavailable',
      message: 'Chrome Prompt API model is unavailable on this device or origin.',
    });
  });

  it('throws when creating a session without LanguageModel support', async () => {
    await expect(createPromptSession()).rejects.toThrow('Chrome Prompt API is not available in this browser.');
  });

  it('throws when creating a session without create support', async () => {
    vi.stubGlobal('LanguageModel', {});

    await expect(createPromptSession()).rejects.toThrow('Chrome Prompt API is not available in this browser.');
  });

  it('throws when create is not callable', async () => {
    vi.stubGlobal('LanguageModel', { create: 'available' });

    await expect(createPromptSession()).rejects.toThrow('Chrome Prompt API is not available in this browser.');
  });

  it('creates a session with download monitoring', async () => {
    let downloadProgressListener: ((event: Event) => void) | undefined;
    const addEventListener = vi.fn((eventName: string, listener: EventListenerOrEventListenerObject) => {
      if (eventName === 'downloadprogress' && typeof listener === 'function') {
        downloadProgressListener = listener;
      }
    });
    const create = vi.fn().mockImplementation(({ monitor }) => {
      monitor({ addEventListener });
      return Promise.resolve({ prompt: vi.fn() });
    });
    vi.stubGlobal('LanguageModel', {
      create,
      availability: vi.fn().mockResolvedValue('available'),
    });

    const onDownloadProgress = vi.fn();
    const session = await createPromptSession(onDownloadProgress);

    expect(session).toHaveProperty('prompt');
    expect(create).toHaveBeenCalledWith({
      expectedInputs: [
        { type: 'text', languages: ['en', 'de'] },
        { type: 'image' },
      ],
      expectedOutputs: [{ type: 'text', languages: ['en'] }],
      monitor: expect.any(Function),
    });
    expect(addEventListener).toHaveBeenCalledWith('downloadprogress', expect.any(Function));

    downloadProgressListener?.({ loaded: 0.426 } as unknown as Event);

    expect(onDownloadProgress).toHaveBeenCalledWith(43);
  });

  it('clamps download progress above 100 percent', async () => {
    let downloadProgressListener: ((event: Event) => void) | undefined;
    const create = vi.fn().mockImplementation(({ monitor }) => {
      monitor({
        addEventListener: (_eventName: string, listener: EventListenerOrEventListenerObject) => {
          if (typeof listener === 'function') {
            downloadProgressListener = listener;
          }
        },
      });
      return Promise.resolve({ prompt: vi.fn() });
    });
    vi.stubGlobal('LanguageModel', { create });

    const onDownloadProgress = vi.fn();
    await createPromptSession(onDownloadProgress);

    downloadProgressListener?.({ loaded: 1.24 } as unknown as Event);

    expect(onDownloadProgress).toHaveBeenCalledWith(100);
  });

  it('reports zero progress for non-finite loaded values', async () => {
    let downloadProgressListener: ((event: Event) => void) | undefined;
    const create = vi.fn().mockImplementation(({ monitor }) => {
      monitor({
        addEventListener: (_eventName: string, listener: EventListenerOrEventListenerObject) => {
          if (typeof listener === 'function') {
            downloadProgressListener = listener;
          }
        },
      });
      return Promise.resolve({ prompt: vi.fn() });
    });
    vi.stubGlobal('LanguageModel', { create });

    const onDownloadProgress = vi.fn();
    await createPromptSession(onDownloadProgress);

    downloadProgressListener?.({ loaded: Number.POSITIVE_INFINITY } as unknown as Event);

    expect(onDownloadProgress).toHaveBeenCalledWith(0);
  });

  it('reports zero progress when loaded is missing', async () => {
    let downloadProgressListener: ((event: Event) => void) | undefined;
    const create = vi.fn().mockImplementation(({ monitor }) => {
      monitor({
        addEventListener: (_eventName: string, listener: EventListenerOrEventListenerObject) => {
          if (typeof listener === 'function') {
            downloadProgressListener = listener;
          }
        },
      });
      return Promise.resolve({ prompt: vi.fn() });
    });
    vi.stubGlobal('LanguageModel', { create });

    const onDownloadProgress = vi.fn();
    await createPromptSession(onDownloadProgress);

    downloadProgressListener?.({} as Event);

    expect(onDownloadProgress).toHaveBeenCalledWith(0);
  });

  it('clamps negative download progress to zero', async () => {
    let downloadProgressListener: ((event: Event) => void) | undefined;
    const create = vi.fn().mockImplementation(({ monitor }) => {
      monitor({
        addEventListener: (_eventName: string, listener: EventListenerOrEventListenerObject) => {
          if (typeof listener === 'function') {
            downloadProgressListener = listener;
          }
        },
      });
      return Promise.resolve({ prompt: vi.fn() });
    });
    vi.stubGlobal('LanguageModel', { create });

    const onDownloadProgress = vi.fn();
    await createPromptSession(onDownloadProgress);

    downloadProgressListener?.({ loaded: -0.2 } as unknown as Event);

    expect(onDownloadProgress).toHaveBeenCalledWith(0);
  });
});
