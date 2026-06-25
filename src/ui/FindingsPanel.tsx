import { type Finding, type MaskingAction } from '../domain/types';
import { type ReviewEvent } from '../review/reviewReducer';

interface FindingsPanelProps {
  findings: Finding[];
  dispatchReview: (event: ReviewEvent) => void;
}

const ACTIONS: Array<{ value: MaskingAction; label: string }> = [
  { value: 'redact', label: 'Redact' },
  { value: 'replace-label', label: 'Type label' },
  { value: 'replace-fake', label: 'Fake value' },
  { value: 'ignore', label: 'Ignore' },
];

export function FindingsPanel({ findings, dispatchReview }: FindingsPanelProps) {
  return (
    <section className="panel findings-panel">
      <h2>Findings</h2>
      {findings.length === 0 ? (
        <p>No findings yet. Import JSON and run analysis.</p>
      ) : (
        <ul className="finding-list">
          {findings.map((finding) => (
            <li key={finding.id} className="finding-item">
              <div>
                <strong>{finding.category}</strong>
                <p>{finding.originalValue ?? 'No textual value'}</p>
                <code>{finding.location.kind === 'json-path' ? finding.location.path : finding.location.kind}</code>
              </div>
              <select
                aria-label={`Action for ${finding.id}`}
                value={finding.selectedAction}
                onChange={(event) =>
                  dispatchReview({
                    type: 'set-action',
                    findingId: finding.id,
                    action: event.currentTarget.value as MaskingAction,
                  })
                }
              >
                {ACTIONS.map((action) => (
                  <option key={action.value} value={action.value}>
                    {action.label}
                  </option>
                ))}
              </select>
              <div className="button-row">
                <button onClick={() => dispatchReview({ type: 'approve-finding', findingId: finding.id })}>
                  Approve
                </button>
                <button onClick={() => dispatchReview({ type: 'ignore-finding', findingId: finding.id })}>
                  Ignore
                </button>
              </div>
              <small>Status: {finding.reviewStatus}</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
