interface FileImporterProps {
  onFileSelected: (file: File) => void;
  error?: string;
}

export function FileImporter({ onFileSelected, error }: FileImporterProps) {
  return (
    <section className="panel import-panel">
      <h2>Import File</h2>
      <label className="file-input-label">
        Choose JSON or image file
        <input
          aria-label="Import file"
          accept="application/json,.json,image/*"
          type="file"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) {
              onFileSelected(file);
            }
          }}
        />
      </label>
      {error ? <p className="error-text">{error}</p> : <p>Files stay in memory until you export.</p>}
    </section>
  );
}
