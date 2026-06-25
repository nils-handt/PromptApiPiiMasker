import { describe, expect, it } from 'vitest';
import { flattenJsonValues, parseJsonDocument } from './jsonAdapter';

describe('parseJsonDocument', () => {
  it('parses JSON and flattens primitive values with stable paths', async () => {
    const file = new File(
      [
        JSON.stringify({
          customer: {
            name: 'Nora Weber',
            iban: 'DE89370400440532013000',
            tags: ['vip', 'newsletter'],
          },
          active: true,
        }),
      ],
      'customer.json',
      { type: 'application/json' },
    );

    const document = await parseJsonDocument(file);

    expect(document.fileName).toBe('customer.json');
    expect(document.mediaType).toBe('application/json');
    expect(document.rawText).toContain('Nora Weber');
    expect(document.data).toEqual({
      customer: {
        name: 'Nora Weber',
        iban: 'DE89370400440532013000',
        tags: ['vip', 'newsletter'],
      },
      active: true,
    });
    expect(document.values).toEqual([
      { path: '$.customer.name', parentKey: 'name', value: 'Nora Weber' },
      { path: '$.customer.iban', parentKey: 'iban', value: 'DE89370400440532013000' },
      { path: '$.customer.tags[0]', parentKey: 'tags', value: 'vip' },
      { path: '$.customer.tags[1]', parentKey: 'tags', value: 'newsletter' },
      { path: '$.active', parentKey: 'active', value: true },
    ]);
  });

  it('throws a readable error for invalid JSON', async () => {
    const file = new File(['{"broken":'], 'broken.json', { type: 'application/json' });

    await expect(parseJsonDocument(file)).rejects.toThrow(/could not parse json/i);
  });
});

describe('flattenJsonValues', () => {
  it('emits a root primitive at the root path', () => {
    expect(flattenJsonValues('x')).toEqual([{ path: '$', value: 'x' }]);
  });

  it('emits root array primitive entries with indexed paths', () => {
    expect(flattenJsonValues(['x'])).toEqual([{ path: '$[0]', value: 'x' }]);
  });

  it('does not emit values for empty object or array containers', () => {
    expect(flattenJsonValues({ emptyObject: {}, emptyArray: [] })).toEqual([]);
  });

  it('uses the object key as parentKey inside object-array-object structures', () => {
    expect(flattenJsonValues({ customers: [{ email: 'nora@example.test' }] })).toEqual([
      { path: '$.customers[0].email', parentKey: 'email', value: 'nora@example.test' },
    ]);
  });

  it('uses bracket string notation for unsafe object keys', () => {
    expect(
      flattenJsonValues({
        'customer email': 'nora@example.test',
        "billing's": { 'card-last-4': 1234 },
      }),
    ).toEqual([
      { path: "$['customer email']", parentKey: 'customer email', value: 'nora@example.test' },
      { path: "$['billing\\'s']['card-last-4']", parentKey: 'card-last-4', value: 1234 },
    ]);
  });

  it('escapes backslashes before single quotes in unsafe object keys', () => {
    expect(flattenJsonValues({ [String.raw`owner\'s file`]: 'contract' })).toEqual([
      { path: String.raw`$['owner\\\'s file']`, parentKey: String.raw`owner\'s file`, value: 'contract' },
    ]);
  });
});
