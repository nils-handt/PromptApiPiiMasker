import { type ImageDocumentSource } from '../../domain/types';

interface ImageMetadata {
  width: number;
  height: number;
}

interface ParseImageOptions {
  createObjectUrl?: (file: File) => string;
  loadMetadata?: (file: File) => Promise<ImageMetadata>;
}

export async function parseImageDocument(file: File, options: ParseImageOptions = {}): Promise<ImageDocumentSource> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`File "${file.name}" is not a supported image.`);
  }

  const loadMetadata = options.loadMetadata ?? loadImageMetadata;
  const createObjectUrl = options.createObjectUrl ?? URL.createObjectURL.bind(URL);
  const metadata = await loadMetadata(file);

  return {
    id: crypto.randomUUID(),
    fileName: file.name,
    mediaType: 'image',
    file,
    mimeType: file.type,
    objectUrl: createObjectUrl(file),
    width: metadata.width,
    height: metadata.height,
  };
}

async function loadImageMetadata(file: File): Promise<ImageMetadata> {
  if (typeof createImageBitmap !== 'function') {
    throw new Error('This browser cannot read image dimensions.');
  }

  const bitmap = await createImageBitmap(file);
  const metadata = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return metadata;
}
