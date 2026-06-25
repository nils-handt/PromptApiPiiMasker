import { describe, expect, it } from 'vitest';
import { normalizeFinding } from './findingValidation';

describe('normalizeFinding', () => {
  const validJsonFinding = {
    id: 'raw-1',
    category: 'iban',
    originalValue: 'DE89370400440532013000',
    confidence: 0.92,
    location: { kind: 'json-path', path: '$.customer.iban' },
    detectionSource: 'json-path',
  };

  it('accepts a valid JSON path finding', () => {
    const finding = normalizeFinding(validJsonFinding);

    expect(finding).toEqual({
      id: 'raw-1',
      category: 'iban',
      originalValue: 'DE89370400440532013000',
      confidence: 0.92,
      location: { kind: 'json-path', path: '$.customer.iban' },
      detectionSource: 'json-path',
      reviewStatus: 'pending',
      selectedAction: 'replace-label',
      replacementValue: undefined,
    });
  });

  it('rejects unsupported categories', () => {
    expect(() =>
      normalizeFinding({
        id: 'raw-2',
        category: 'favorite_color',
        originalValue: 'green',
        confidence: 0.7,
        location: { kind: 'json-path', path: '$.favoriteColor' },
        detectionSource: 'json-path',
      }),
    ).toThrow(/unsupported category/i);
  });

  it('rejects JSON findings without JSON paths', () => {
    expect(() =>
      normalizeFinding({
        id: 'raw-3',
        category: 'email',
        originalValue: 'nora@example.test',
        confidence: 0.8,
        location: { kind: 'none' },
        detectionSource: 'json-path',
      }),
    ).toThrow(/json path/i);
  });

  it('rejects malformed root inputs', () => {
    expect(() => normalizeFinding(null)).toThrow(/finding must be an object/i);
    expect(() => normalizeFinding([])).toThrow(/finding must be an object/i);
    expect(() => normalizeFinding('not-a-finding')).toThrow(/finding must be an object/i);
  });

  it('rejects unsupported selected actions when present', () => {
    expect(() =>
      normalizeFinding({
        ...validJsonFinding,
        selectedAction: 'delete',
      }),
    ).toThrow(/selected action/i);
  });

  it('defaults selected action only when missing or null', () => {
    expect(normalizeFinding(validJsonFinding).selectedAction).toBe('replace-label');
    expect(normalizeFinding({ ...validJsonFinding, selectedAction: null }).selectedAction).toBe('replace-label');
  });

  it('rejects invalid present locations', () => {
    expect(() =>
      normalizeFinding({
        ...validJsonFinding,
        location: { kind: 'json-path', path: 'customer.name' },
      }),
    ).toThrow(/invalid location/i);

    expect(() =>
      normalizeFinding({
        ...validJsonFinding,
        detectionSource: 'visual',
        location: { kind: 'region', x: 10, y: 20, width: 0, height: 40 },
      }),
    ).toThrow(/invalid location/i);
  });

  it('clamps finite confidence values and defaults missing or non-finite values', () => {
    expect(normalizeFinding({ ...validJsonFinding, confidence: -0.4 }).confidence).toBe(0);
    expect(normalizeFinding({ ...validJsonFinding, confidence: 1.7 }).confidence).toBe(1);
    expect(normalizeFinding({ ...validJsonFinding, confidence: undefined }).confidence).toBe(0.5);
    expect(normalizeFinding({ ...validJsonFinding, confidence: Infinity }).confidence).toBe(0.5);
  });

  it('rejects non-finite or fractional text range values', () => {
    const textFinding = {
      ...validJsonFinding,
      category: 'email',
      detectionSource: 'text',
    };

    expect(() =>
      normalizeFinding({
        ...textFinding,
        location: { kind: 'text-range', start: 1.5, end: 5 },
      }),
    ).toThrow(/invalid location/i);

    expect(() =>
      normalizeFinding({
        ...textFinding,
        location: { kind: 'text-range', start: 1, end: Infinity },
      }),
    ).toThrow(/invalid location/i);
  });

  it('rejects non-finite region values and fractional pages', () => {
    const visualFinding = {
      ...validJsonFinding,
      category: 'name',
      detectionSource: 'visual',
    };

    expect(() =>
      normalizeFinding({
        ...visualFinding,
        location: { kind: 'region', x: Number.NaN, y: 20, width: 30, height: 40 },
      }),
    ).toThrow(/invalid location/i);

    expect(() =>
      normalizeFinding({
        ...visualFinding,
        location: { kind: 'region', page: 1.5, x: 10, y: 20, width: 30, height: 40 },
      }),
    ).toThrow(/invalid location/i);
  });
});
