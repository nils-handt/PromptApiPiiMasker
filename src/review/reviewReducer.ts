import { type Finding, type MaskingAction, type PiiCategory } from '../domain/types';

export interface ReviewState {
  findings: Finding[];
  replacementMap: Record<string, string>;
}

export type ReviewEvent =
  | { type: 'replace-all-findings'; findings: Finding[] }
  | { type: 'approve-finding'; findingId: string }
  | { type: 'ignore-finding'; findingId: string }
  | { type: 'set-action'; findingId: string; action: MaskingAction };

const LABEL_BY_CATEGORY: Record<PiiCategory, string> = {
  name: '[NAME]',
  address: '[ADDRESS]',
  phone: '[PHONE]',
  email: '[EMAIL]',
  iban: '[IBAN]',
  bic: '[BIC]',
  'credit-card': '[CREDIT_CARD]',
  'government-id': '[GOVERNMENT_ID]',
  'date-of-birth': '[DATE_OF_BIRTH]',
  organization: '[ORGANIZATION]',
  'other-sensitive': '[SENSITIVE]',
};

const FAKE_PREFIX_BY_CATEGORY: Record<PiiCategory, string> = {
  name: 'Person',
  address: 'Address',
  phone: 'Phone',
  email: 'Email',
  iban: 'IBAN',
  bic: 'BIC',
  'credit-card': 'Card',
  'government-id': 'ID',
  'date-of-birth': 'Date',
  organization: 'Organization',
  'other-sensitive': 'Value',
};

export function createInitialReviewState(findings: Finding[]): ReviewState {
  return { findings, replacementMap: {} };
}

export function reviewReducer(state: ReviewState, event: ReviewEvent): ReviewState {
  if (event.type === 'replace-all-findings') {
    return createInitialReviewState(event.findings);
  }

  if (event.type === 'ignore-finding') {
    return {
      ...state,
      findings: state.findings.map((finding) =>
        finding.id === event.findingId
          ? { ...finding, reviewStatus: 'ignored', selectedAction: 'ignore', replacementValue: undefined }
          : finding,
      ),
    };
  }

  if (event.type === 'set-action') {
    return applyFindingUpdate(state, event.findingId, (finding, replacementMap) => {
      const replacement = replacementValueForAction(finding, event.action, replacementMap);

      return {
        finding: {
          ...finding,
          selectedAction: event.action,
          replacementValue: replacement.value,
        },
        replacementMap: replacement.replacementMap,
      };
    });
  }

  if (event.type === 'approve-finding') {
    return applyFindingUpdate(state, event.findingId, (finding, replacementMap) => {
      const replacement = replacementValueForAction(finding, finding.selectedAction, replacementMap);

      return {
        finding: {
          ...finding,
          reviewStatus: 'approved',
          replacementValue: replacement.value,
        },
        replacementMap: replacement.replacementMap,
      };
    });
  }

  return state;
}

function applyFindingUpdate(
  state: ReviewState,
  findingId: string,
  update: (
    finding: Finding,
    replacementMap: Record<string, string>,
  ) => { finding: Finding; replacementMap: Record<string, string> },
): ReviewState {
  let nextReplacementMap = state.replacementMap;
  const findings = state.findings.map((finding) => {
    if (finding.id !== findingId) {
      return finding;
    }

    const result = update(finding, nextReplacementMap);
    nextReplacementMap = result.replacementMap;
    return result.finding;
  });

  return { findings, replacementMap: nextReplacementMap };
}

function replacementValueForAction(
  finding: Finding,
  action: MaskingAction,
  replacementMap: Record<string, string>,
): { value: string | undefined; replacementMap: Record<string, string> } {
  if (action === 'replace-label') {
    return { value: LABEL_BY_CATEGORY[finding.category], replacementMap };
  }

  if (action === 'replace-fake') {
    return fakeValueForFinding(finding, replacementMap);
  }

  return { value: undefined, replacementMap };
}

function fakeValueForFinding(
  finding: Finding,
  replacementMap: Record<string, string>,
): { value: string; replacementMap: Record<string, string> } {
  const key = replacementKey(finding);
  const existing = replacementMap[key];

  if (existing) {
    return { value: existing, replacementMap };
  }

  const prefix = FAKE_PREFIX_BY_CATEGORY[finding.category];
  const countForCategory = Object.keys(replacementMap).filter((entry) => entry.startsWith(`${finding.category}:`))
    .length;
  const value = `${prefix} ${countForCategory + 1}`;

  return {
    value,
    replacementMap: {
      ...replacementMap,
      [key]: value,
    },
  };
}

function replacementKey(finding: Finding): string {
  const normalized = (finding.originalValue ?? finding.id).trim().toLowerCase();
  return `${finding.category}:${normalized}`;
}
