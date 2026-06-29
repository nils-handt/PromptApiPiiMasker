import { type Finding, type ImageDocumentSource } from '../domain/types';

interface ImagePreviewProps {
  document: ImageDocumentSource;
  findings: Finding[];
}

export function ImagePreview({ document, findings }: ImagePreviewProps) {
  const regionFindings = findings.filter((finding) => finding.location.kind === 'region');

  return (
    <section className="panel preview-panel">
      <h2>Image Preview</h2>
      <p className="file-name">{document.fileName}</p>
      <div className="image-preview-frame" style={{ aspectRatio: `${document.width} / ${document.height}` }}>
        <img src={document.objectUrl} alt={document.fileName} />
        {regionFindings.map((finding) => {
          if (finding.location.kind !== 'region') {
            return null;
          }

          return (
            <span
              key={finding.id}
              aria-label={`${finding.category} region`}
              className={`region-highlight status-${finding.reviewStatus}`}
              style={{
                left: `${(finding.location.x / document.width) * 100}%`,
                top: `${(finding.location.y / document.height) * 100}%`,
                width: `${(finding.location.width / document.width) * 100}%`,
                height: `${(finding.location.height / document.height) * 100}%`,
              }}
            />
          );
        })}
      </div>
    </section>
  );
}
