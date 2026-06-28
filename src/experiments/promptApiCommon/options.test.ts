import { describe, expect, it } from 'vitest';
import { normalizePositiveInteger } from './options';

describe('normalizePositiveInteger', () => {
  it('keeps positive integers and floors positive decimals', () => {
    expect(normalizePositiveInteger(3, 1)).toBe(3);
    expect(normalizePositiveInteger(3.9, 1)).toBe(3);
  });

  it('uses the fallback for missing, non-finite, and invalid values', () => {
    expect(normalizePositiveInteger(undefined, 20)).toBe(20);
    expect(normalizePositiveInteger(Number.NaN, 20)).toBe(20);
    expect(normalizePositiveInteger(0, 20)).toBe(20);
    expect(normalizePositiveInteger(-1, 20)).toBe(20);
  });
});
