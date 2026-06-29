import { describe, expect, it, vi } from 'vitest';
import { parseImageDocument } from './imageAdapter';

describe('parseImageDocument', () => {
  it('creates an image document with dimensions and preview URL', async () => {
    const file = new File(['image-bytes'], 'badge.png', { type: 'image/png' });
    const createObjectUrl = vi.fn().mockReturnValue('blob:badge');
    const loadMetadata = vi.fn().mockResolvedValue({ width: 640, height: 480 });

    await expect(parseImageDocument(file, { createObjectUrl, loadMetadata })).resolves.toMatchObject({
      fileName: 'badge.png',
      mediaType: 'image',
      mimeType: 'image/png',
      objectUrl: 'blob:badge',
      width: 640,
      height: 480,
    });

    expect(createObjectUrl).toHaveBeenCalledWith(file);
    expect(loadMetadata).toHaveBeenCalledWith(file);
  });

  it('rejects non-image files', async () => {
    const file = new File(['{}'], 'customer.json', { type: 'application/json' });

    await expect(
      parseImageDocument(file, {
        createObjectUrl: vi.fn(),
        loadMetadata: vi.fn(),
      }),
    ).rejects.toThrow(/not a supported image/i);
  });
});
