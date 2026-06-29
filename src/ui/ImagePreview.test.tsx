import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type Finding, type ImageDocumentSource } from '../domain/types';
import { ImagePreview } from './ImagePreview';

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

const finding: Finding = {
  id: 'f-1',
  category: 'email',
  originalValue: 'nora@example.test',
  confidence: 0.9,
  location: { kind: 'region', x: 30, y: 40, width: 120, height: 20 },
  detectionSource: 'visual',
  reviewStatus: 'pending',
  selectedAction: 'replace-label',
};

describe('ImagePreview', () => {
  it('renders the image and region highlights scaled as percentages', () => {
    render(<ImagePreview document={document} findings={[finding]} />);

    expect(screen.getByRole('img', { name: /badge.png/i })).toHaveAttribute('src', 'blob:badge');
    const highlight = screen.getByLabelText(/email region/i);
    expect(highlight).toHaveStyle({ left: '10%', top: '20%', width: '40%', height: '10%' });
  });
});
