import { type Finding, type ImageDocumentSource } from '../domain/types';

export interface ImageMaskOverlay {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  text?: string;
}

interface ImageExportDependencies {
  createCanvas?: () => HTMLCanvasElement;
  loadImage?: (document: ImageDocumentSource) => Promise<CanvasImageSource>;
}

const MASKED_IMAGE_MIME_TYPE = 'image/png';

export function buildImageMaskOverlays(findings: Finding[]): ImageMaskOverlay[] {
  return findings
    .filter((finding) => finding.reviewStatus === 'approved')
    .filter((finding) => finding.location.kind === 'region')
    .map((finding) => {
      if (finding.location.kind !== 'region') {
        throw new Error('Unexpected non-region image finding.');
      }

      return {
        x: finding.location.x,
        y: finding.location.y,
        width: finding.location.width,
        height: finding.location.height,
        fill: '#111111',
        text:
          finding.selectedAction === 'replace-label' || finding.selectedAction === 'replace-fake'
            ? finding.replacementValue
            : undefined,
      };
    });
}

export function drawImageMasking(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  width: number,
  height: number,
  overlays: ImageMaskOverlay[],
): void {
  context.drawImage(image, 0, 0, width, height);

  overlays.forEach((overlay) => {
    context.save();
    context.fillStyle = overlay.fill;
    context.fillRect(overlay.x, overlay.y, overlay.width, overlay.height);

    if (overlay.text) {
      context.fillStyle = '#ffffff';
      context.font = `${Math.max(12, Math.min(18, overlay.height - 8))}px sans-serif`;
      context.textBaseline = 'middle';
      context.fillText(overlay.text, overlay.x + 4, overlay.y + overlay.height / 2);
    }

    context.restore();
  });
}

export async function exportMaskedImage(
  document: ImageDocumentSource,
  findings: Finding[],
  dependencies: ImageExportDependencies = {},
): Promise<Blob> {
  const canvas = dependencies.createCanvas?.() ?? globalThis.document.createElement('canvas');
  canvas.width = document.width;
  canvas.height = document.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not create a canvas context for image export.');
  }

  const image = await (dependencies.loadImage ?? loadImageFromDocument)(document);
  drawImageMasking(context, image, document.width, document.height, buildImageMaskOverlays(findings));

  return canvasToBlob(canvas, MASKED_IMAGE_MIME_TYPE);
}

async function loadImageFromDocument(document: ImageDocumentSource): Promise<CanvasImageSource> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(document.file);
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image "${document.fileName}" for export.`));
    image.src = document.objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error('Could not export masked image.'));
      },
      mimeType,
    );
  });
}
