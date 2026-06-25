import { describe, expect, it } from 'vitest';
import { Finding, JsonDocumentSource } from '../domain/types';
import { applyJsonMasking } from './jsonMasker';

const document: JsonDocumentSource = {
  id: 'doc-1',
  fileName: 'customer.json',
  mediaType: 'application/json',
  rawText: '',
  data: {
    customer: {
      name: 'Nora Weber',
      iban: 'DE89370400440532013000',
      notes: 'leave this',
    },
  },
  values: [],
};

const findings: Finding[] = [
  {
    id: 'f-1',
    category: 'name',
    originalValue: 'Nora Weber',
    confidence: 0.91,
    location: { kind: 'json-path', path: '$.customer.name' },
    detectionSource: 'json-path',
    reviewStatus: 'approved',
    selectedAction: 'replace-fake',
    replacementValue: 'Person 1',
  },
  {
    id: 'f-2',
    category: 'iban',
    originalValue: 'DE89370400440532013000',
    confidence: 0.95,
    location: { kind: 'json-path', path: '$.customer.iban' },
    detectionSource: 'json-path',
    reviewStatus: 'approved',
    selectedAction: 'redact',
  },
];

describe('applyJsonMasking', () => {
  it('applies approved replacements and redactions by JSON path', () => {
    const masked = applyJsonMasking(document, findings);

    expect(masked).toEqual({
      customer: {
        name: 'Person 1',
        iban: '████',
        notes: 'leave this',
      },
    });
  });

  it('leaves ignored findings unchanged', () => {
    const masked = applyJsonMasking(document, [{ ...findings[0], reviewStatus: 'ignored', selectedAction: 'ignore' }]);

    expect(masked).toEqual(document.data);
  });

  it('applies replacements to escaped bracket paths', () => {
    const escapedPath = "$['billing\\\\\\'s file']['card-last-4']";
    const escapedDocument: JsonDocumentSource = {
      id: 'doc-escaped',
      fileName: 'escaped.json',
      mediaType: 'application/json',
      rawText: '',
      data: { "billing\\'s file": { 'card-last-4': '4242' } },
      values: [],
    };

    const masked = applyJsonMasking(escapedDocument, [
      {
        id: 'f-escaped',
        category: 'credit-card',
        originalValue: '4242',
        confidence: 0.95,
        location: { kind: 'json-path', path: escapedPath },
        detectionSource: 'json-path',
        reviewStatus: 'approved',
        selectedAction: 'replace-label',
        replacementValue: '[CREDIT_CARD]',
      },
    ]);

    expect(masked).toEqual({ "billing\\'s file": { 'card-last-4': '[CREDIT_CARD]' } });
  });
});
