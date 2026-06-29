import { describe, expect, it, vi } from 'vitest';
import { type Finding, type ImageDocumentSource } from '../domain/types';
import { buildImageMaskOverlays, drawImageMasking, exportMaskedImage } from './imageMasker';

const document: ImageDocumentSource = {
  id: 'image-1',
  fileName: 'badge.png',
  mediaType: 'image',
  file: new File(['image'], 'badge.png', { type: 'image/png' }),
  mimeType: 'image/png',
  objectUrl: 'blob:badge',
  width: 300,
  height: 200,
};

const approvedFinding: Finding = {
  id: 'f-1',
  category: 'email',
  originalValue: 'nora@example.test',
  confidence: 0.9,
  location: { kind: 'region', x: 20, y: 30, width: 120, height: 24 },
  detectionSource: 'visual',
  reviewStatus: 'approved',
  selectedAction: 'replace-label',
  replacementValue: '[EMAIL]',
};

describe('imageMasker', () => {
  it('builds overlays only for approved region findings', () => {
    expect(buildImageMaskOverlays([approvedFinding, { ...approvedFinding, id: 'f-2', reviewStatus: 'pending' }])).toEqual([
      {
        x: 20,
        y: 30,
        width: 120,
        height: 24,
        fill: '#111111',
        text: '[EMAIL]',
      },
    ]);
  });

  it('draws the source image and overlays', () => {
    const context = {
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      fillStyle: '',
      font: '',
      textBaseline: '',
    } as unknown as CanvasRenderingContext2D;
    const image = {} as CanvasImageSource;

    drawImageMasking(context, image, 300, 200, buildImageMaskOverlays([approvedFinding]));

    expect(context.drawImage).toHaveBeenCalledWith(image, 0, 0, 300, 200);
    expect(context.fillRect).toHaveBeenCalledWith(20, 30, 120, 24);
    expect(context.fillText).toHaveBeenCalledWith('[EMAIL]', 24, 42);
  });

  it('exports a masked image blob through injected browser dependencies', async () => {
    const blob = new Blob(['masked'], { type: 'image/png' });
    const context = {
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
    };
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(context),
      toBlob: vi.fn((callback: BlobCallback) => callback(blob)),
    } as unknown as HTMLCanvasElement;

    await expect(
      exportMaskedImage(document, [approvedFinding], {
        createCanvas: () => canvas,
        loadImage: vi.fn().mockResolvedValue({} as CanvasImageSource),
      }),
    ).resolves.toBe(blob);

    expect(canvas.width).toBe(300);
    expect(canvas.height).toBe(200);
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png');
  });

  it('exports JPEG sources as PNG blobs for filename consistency', async () => {
    const blob = new Blob(['masked'], { type: 'image/png' });
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({
        drawImage: vi.fn(),
        fillRect: vi.fn(),
        fillText: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
      }),
      toBlob: vi.fn((callback: BlobCallback) => callback(blob)),
    } as unknown as HTMLCanvasElement;

    await exportMaskedImage(
      { ...document, fileName: 'badge.jpg', mimeType: 'image/jpeg' },
      [approvedFinding],
      {
        createCanvas: () => canvas,
        loadImage: vi.fn().mockResolvedValue({} as CanvasImageSource),
      },
    );

    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png');
  });
});
