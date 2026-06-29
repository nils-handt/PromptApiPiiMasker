import { describe, expect, it, vi } from 'vitest';
import { PII_CATEGORIES, type ImageDocumentSource } from '../domain/types';
import { analyzeImageDocument, buildImageAnalysisMessages, buildImageAnalysisResponseSchema } from './imagePiiAnalyzer';

const file = new File(['image-bytes'], 'badge.png', { type: 'image/png' });
const document: ImageDocumentSource = {
  id: 'doc-image',
  fileName: 'badge.png',
  mediaType: 'image',
  file,
  mimeType: 'image/png',
  objectUrl: 'blob:badge',
  width: 640,
  height: 480,
};

describe('imagePiiAnalyzer', () => {
  it('sends text instructions and the image file to Prompt API', async () => {
    const session = {
      prompt: vi.fn().mockResolvedValue(JSON.stringify({ findings: [] })),
    };

    await analyzeImageDocument(document, session);

    expect(session.prompt).toHaveBeenCalledWith(buildImageAnalysisMessages(document), {
      responseConstraint: buildImageAnalysisResponseSchema(document),
    });
  });

  it('normalizes valid visual region findings', async () => {
    const session = {
      prompt: vi.fn().mockResolvedValue(
        JSON.stringify({
          findings: [
            {
              id: 'img-1',
              category: 'name',
              originalValue: 'Nora Weber',
              confidence: 0.88,
              region: { x: 30, y: 40, width: 180, height: 32 },
            },
          ],
        }),
      ),
    };

    await expect(analyzeImageDocument(document, session)).resolves.toMatchObject([
      {
        id: 'img-1',
        category: 'name',
        originalValue: 'Nora Weber',
        location: { kind: 'region', x: 30, y: 40, width: 180, height: 32 },
        detectionSource: 'visual',
      },
    ]);
  });

  it('filters findings outside the image bounds', async () => {
    const session = {
      prompt: vi.fn().mockResolvedValue(
        JSON.stringify({
          findings: [
            {
              id: 'outside',
              category: 'email',
              originalValue: 'nora@example.test',
              confidence: 0.8,
              region: { x: 620, y: 470, width: 100, height: 40 },
            },
          ],
        }),
      ),
    };

    await expect(analyzeImageDocument(document, session)).resolves.toEqual([]);
  });

  it('builds a schema constrained to image bounds and allowed categories', () => {
    expect(buildImageAnalysisResponseSchema(document)).toMatchObject({
      properties: {
        findings: {
          items: {
            properties: {
              category: { enum: PII_CATEGORIES },
              region: {
                properties: {
                  x: { minimum: 0, maximum: 640 },
                  y: { minimum: 0, maximum: 480 },
                },
              },
            },
          },
        },
      },
    });
  });

  it('throws when the response shape is invalid', async () => {
    await expect(
      analyzeImageDocument(document, { prompt: vi.fn().mockResolvedValue(JSON.stringify({ findings: {} })) }),
    ).rejects.toThrow(/image analysis shape/i);
  });
});
