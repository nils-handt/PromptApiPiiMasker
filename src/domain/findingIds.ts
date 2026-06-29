import { type Finding } from './types';

export function ensureUniqueFindingIds(findings: Finding[]): Finding[] {
  const seen = new Map<string, number>();

  return findings.map((finding) => {
    const count = seen.get(finding.id) ?? 0;
    seen.set(finding.id, count + 1);

    if (count === 0) {
      return finding;
    }

    return { ...finding, id: `${finding.id}-${count + 1}` };
  });
}
