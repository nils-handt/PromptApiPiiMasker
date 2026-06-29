import { type AnalyzableDocumentSource, type Finding } from '../domain/types';
import { exportMaskedImage } from '../export/imageMasker';
import { applyJsonMasking } from '../export/jsonMasker';
import { buildExportReport } from '../export/report';

interface ExportPanelProps {
  document?: AnalyzableDocumentSource;
  findings: Finding[];
}

export function ExportPanel({ document, findings }: ExportPanelProps) {
  const approvedCount = findings.filter((finding) => finding.reviewStatus === 'approved').length;
  const ignoredCount = findings.filter((finding) => finding.reviewStatus === 'ignored').length;
  const canExport = Boolean(document);

  return (
    <section className="panel export-panel">
      <h2>Export</h2>
      <dl className="summary-list">
        <div>
          <dt>Total findings</dt>
          <dd>{findings.length}</dd>
        </div>
        <div>
          <dt>Approved</dt>
          <dd>{approvedCount}</dd>
        </div>
        <div>
          <dt>Ignored</dt>
          <dd>{ignoredCount}</dd>
        </div>
      </dl>
      {document?.mediaType === 'image' ? (
        <button disabled={!canExport} onClick={() => void downloadMaskedImage(document, findings)}>
          Export masked image
        </button>
      ) : (
        <button
          disabled={!canExport}
          onClick={() =>
            document?.mediaType === 'application/json' &&
            downloadJson(`${document.fileName}.anonymized.json`, applyJsonMasking(document, findings))
          }
        >
          Export anonymized JSON
        </button>
      )}
      <button
        disabled={!canExport}
        onClick={() => document && downloadJson(`${document.fileName}.report.json`, buildExportReport(document, findings))}
      >
        Export report
      </button>
    </section>
  );
}

function downloadJson(fileName: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

async function downloadMaskedImage(document: AnalyzableDocumentSource, findings: Finding[]): Promise<void> {
  if (document.mediaType !== 'image') {
    return;
  }

  const blob = await exportMaskedImage(document, findings);
  downloadBlob(`${document.fileName}.masked.png`, blob);
}

function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
