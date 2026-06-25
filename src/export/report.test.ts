import { describe, expect, it } from 'vitest';
import { Finding, JsonDocumentSource } from '../domain/types';
import { buildExportReport } from './report';

const document: JsonDocumentSource = {
  id: 'doc-1',
  fileName: 'customer.json',
  mediaType: 'application/json',
  rawText: '',
  data: {},
  values: [],
};

const finding: Finding = {
  id: 'f-1',
  category: 'email',
  originalValue: 'nora@example.test',
  confidence: 0.88,
  location: { kind: 'json-path', path: '$.email' },
  detectionSource: 'json-path',
  reviewStatus: 'approved',
  selectedAction: 'replace-label',
  replacementValue: '[EMAIL]',
};

describe('buildExportReport', () => {
  it('records source filename, action, replacement, and detection source', () => {
    const report = buildExportReport(document, [finding]);

    expect(report).toEqual([
      {
        sourceFileName: 'customer.json',
        findingId: 'f-1',
        category: 'email',
        originalValue: 'nora@example.test',
        action: 'replace-label',
        replacementValue: '[EMAIL]',
        detectionSource: 'json-path',
        status: 'exported',
      },
    ]);
  });
});
