import { describe, expect, it } from 'vitest';
import { Finding } from '../domain/types';
import { createInitialReviewState, reviewReducer } from './reviewReducer';

const baseFinding: Finding = {
  id: 'f-1',
  category: 'name',
  originalValue: 'Nora Weber',
  confidence: 0.91,
  location: { kind: 'json-path', path: '$.customer.name' },
  detectionSource: 'json-path',
  reviewStatus: 'pending',
  selectedAction: 'replace-fake',
};

describe('reviewReducer', () => {
  it('approves a finding and assigns a consistent fake replacement', () => {
    const state = createInitialReviewState([baseFinding]);
    const next = reviewReducer(state, { type: 'approve-finding', findingId: 'f-1' });

    expect(next.findings[0]).toMatchObject({
      reviewStatus: 'approved',
      replacementValue: 'Person 1',
    });
  });

  it('reuses fake replacements for the same category and original value', () => {
    const state = createInitialReviewState([
      baseFinding,
      { ...baseFinding, id: 'f-2', location: { kind: 'json-path', path: '$.billing.name' } },
    ]);

    const first = reviewReducer(state, { type: 'approve-finding', findingId: 'f-1' });
    const second = reviewReducer(first, { type: 'approve-finding', findingId: 'f-2' });

    expect(second.findings.map((finding) => finding.replacementValue)).toEqual(['Person 1', 'Person 1']);
  });

  it('ignores a finding', () => {
    const state = createInitialReviewState([baseFinding]);
    const next = reviewReducer(state, { type: 'ignore-finding', findingId: 'f-1' });

    expect(next.findings[0]).toMatchObject({
      reviewStatus: 'ignored',
      selectedAction: 'ignore',
      replacementValue: undefined,
    });
  });

  it('changes actions before approval', () => {
    const state = createInitialReviewState([baseFinding]);
    const next = reviewReducer(state, {
      type: 'set-action',
      findingId: 'f-1',
      action: 'replace-label',
    });

    expect(next.findings[0]).toMatchObject({
      selectedAction: 'replace-label',
      replacementValue: '[NAME]',
    });
  });

  it('replaces all findings and clears replacement mappings', () => {
    const state = createInitialReviewState([baseFinding]);
    const approved = reviewReducer(state, { type: 'approve-finding', findingId: 'f-1' });
    const replacement = { ...baseFinding, id: 'f-2', originalValue: 'Mika Klein' };

    const next = reviewReducer(approved, { type: 'replace-all-findings', findings: [replacement] });

    expect(next).toEqual({
      findings: [replacement],
      replacementMap: {},
    });
  });
});
