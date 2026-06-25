import { type ExportReportEntry, type Finding, type JsonDocumentSource } from '../domain/types';

export function buildExportReport(document: JsonDocumentSource, findings: Finding[]): ExportReportEntry[] {
  return findings.map((finding) => ({
    sourceFileName: document.fileName,
    findingId: finding.id,
    category: finding.category,
    originalValue: finding.originalValue,
    action: finding.selectedAction,
    replacementValue: finding.replacementValue,
    detectionSource: finding.detectionSource,
    status: statusForFinding(finding),
  }));
}

function statusForFinding(finding: Finding): ExportReportEntry['status'] {
  if (finding.reviewStatus === 'approved') {
    return 'exported';
  }

  if (finding.reviewStatus === 'ignored') {
    return 'ignored';
  }

  return 'not-applied';
}
