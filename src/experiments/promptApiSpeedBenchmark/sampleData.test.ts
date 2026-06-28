import { describe, expect, it } from 'vitest';
import { BENCHMARK_JSON_ELEMENT_COUNTS, buildBenchmarkJsonDocument } from './sampleData';

describe('buildBenchmarkJsonDocument', () => {
  it('supports the configured benchmark element counts', () => {
    expect(BENCHMARK_JSON_ELEMENT_COUNTS).toEqual([1, 4, 8, 16, 32, 64, 128]);
  });

  it('builds deterministic JSON with the requested number of elements', () => {
    const first = buildBenchmarkJsonDocument(4);
    const second = buildBenchmarkJsonDocument(4);

    expect(first).toBe(second);
    expect(JSON.parse(first)).toHaveLength(4);
  });

  it('mixes PII and non-PII values in every element', () => {
    const rows = JSON.parse(buildBenchmarkJsonDocument(2)) as Array<Record<string, unknown>>;

    for (const row of rows) {
      expect(row).toMatchObject({
        customerName: expect.any(String),
        customerEmail: expect.any(String),
        productCategory: expect.any(String),
        orderStatus: expect.any(String),
        quantity: expect.any(Number),
      });
      expect(Object.keys(row)).toEqual(expect.arrayContaining(['customerPhone', 'region', 'shippingMethod', 'note']));
    }
  });
});
