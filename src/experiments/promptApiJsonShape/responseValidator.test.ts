import { describe, expect, it } from 'vitest';
import { validateJsonAnalysisResponseShape } from './responseValidator';

const validPaths = new Set(['$.name', '$.email', '$.id', '$.phone']);

describe('validateJsonAnalysisResponseShape', () => {
  it('accepts a valid combined findings object', () => {
    const result = validateJsonAnalysisResponseShape(
      JSON.stringify({
        findings: [
          {
            id: 'short-stable-id-1',
            category: 'name',
            originalValue: 'Kelly Doe',
            confidence: 0.9,
            path: '$.name',
          },
          {
            id: 'short-stable-id-2',
            category: 'email',
            originalValue: 'kdoe@example.com',
            confidence: 0.95,
            path: '$.email',
          },
        ],
      }),
      validPaths,
    );

    expect(result).toEqual({
      valid: true,
      findings: [
        {
          id: 'short-stable-id-1',
          category: 'name',
          originalValue: 'Kelly Doe',
          confidence: 0.9,
          path: '$.name',
        },
        {
          id: 'short-stable-id-2',
          category: 'email',
          originalValue: 'kdoe@example.com',
          confidence: 0.95,
          path: '$.email',
        },
      ],
    });
  });

  it('rejects multiple concatenated JSON objects', () => {
    const result = validateJsonAnalysisResponseShape(
      '{"findings":[{"id":"short-stable-id-1","category":"name","originalValue":"Kelly Doe","confidence":0.9,"path":"$.name"}]}\n' +
        '{"findings":[{"id":"short-stable-id-2","category":"email","originalValue":"kdoe@example.com","confidence":0.9,"path":"$.email"}]}',
      validPaths,
    );

    expect(result).toMatchObject({
      valid: false,
      error: expect.stringContaining('valid JSON object'),
    });
  });

  it('rejects malformed confidence syntax', () => {
    const result = validateJsonAnalysisResponseShape(
      '{"findings":[{"id":"short-stable-id-3","category":"government-id","originalValue":"12324","confidence":0.</0.1,"path":"$.id"}]}',
      validPaths,
    );

    expect(result).toMatchObject({
      valid: false,
      error: expect.stringContaining('valid JSON object'),
    });
  });

  it('rejects a missing findings property', () => {
    const result = validateJsonAnalysisResponseShape(JSON.stringify({ summary: 'none' }), validPaths);

    expect(result).toEqual({
      valid: false,
      error: 'Response must include a findings array.',
    });
  });

  it('rejects a non-array findings property', () => {
    const result = validateJsonAnalysisResponseShape(JSON.stringify({ findings: {} }), validPaths);

    expect(result).toEqual({
      valid: false,
      error: 'Response must include a findings array.',
    });
  });

  it('rejects an invalid category', () => {
    const result = validateJsonAnalysisResponseShape(
      JSON.stringify({
        findings: [
          {
            id: 'short-stable-id-1',
            category: 'favorite-color',
            originalValue: 'Kelly Doe',
            confidence: 0.9,
            path: '$.name',
          },
        ],
      }),
      validPaths,
    );

    expect(result).toEqual({
      valid: false,
      error: 'Finding 1 must use an allowed category.',
    });
  });

  it('rejects a path outside the sample JSON', () => {
    const result = validateJsonAnalysisResponseShape(
      JSON.stringify({
        findings: [
          {
            id: 'short-stable-id-1',
            category: 'name',
            originalValue: 'Kelly Doe',
            confidence: 0.9,
            path: '$.missing',
          },
        ],
      }),
      validPaths,
    );

    expect(result).toEqual({
      valid: false,
      error: 'Finding 1 must use a path from the sample JSON.',
    });
  });

  it('rejects confidence outside the inclusive zero to one range', () => {
    const result = validateJsonAnalysisResponseShape(
      JSON.stringify({
        findings: [
          {
            id: 'short-stable-id-1',
            category: 'name',
            originalValue: 'Kelly Doe',
            confidence: 1.01,
            path: '$.name',
          },
        ],
      }),
      validPaths,
    );

    expect(result).toEqual({
      valid: false,
      error: 'Finding 1 confidence must be a number from 0 to 1.',
    });
  });
});
