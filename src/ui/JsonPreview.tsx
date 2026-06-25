import { type JsonDocumentSource } from '../domain/types';

interface JsonPreviewProps {
  document?: JsonDocumentSource;
}

export function JsonPreview({ document }: JsonPreviewProps) {
  return (
    <section className="panel preview-panel">
      <h2>Document Preview</h2>
      {document ? (
        <>
          <p className="file-name">{document.fileName}</p>
          <pre>{JSON.stringify(document.data, null, 2)}</pre>
          <h3>Analyzable values</h3>
          <ul className="path-list">
            {document.values.map((node) => (
              <li key={node.path}>
                <code>{node.path}</code> <span>{String(node.value)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>No document imported.</p>
      )}
    </section>
  );
}
