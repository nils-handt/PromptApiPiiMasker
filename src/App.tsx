import { useEffect, useReducer, useRef, useState } from 'react';
import { analyzeImageDocument } from './ai/imagePiiAnalyzer';
import { analyzeJsonDocument } from './ai/jsonPiiAnalyzer';
import { checkPromptApiStatus, createPromptSession, type PromptApiStatus } from './ai/promptApi';
import { type AnalyzableDocumentSource } from './domain/types';
import { parseImageDocument } from './documents/image/imageAdapter';
import { parseJsonDocument } from './documents/json/jsonAdapter';
import { createInitialReviewState, reviewReducer } from './review/reviewReducer';
import { ExportPanel } from './ui/ExportPanel';
import { FileImporter } from './ui/FileImporter';
import { FindingsPanel } from './ui/FindingsPanel';
import { ImagePreview } from './ui/ImagePreview';
import { JsonPreview } from './ui/JsonPreview';
import { PromptStatus } from './ui/PromptStatus';

const INITIAL_PROMPT_STATUS: PromptApiStatus = {
  state: 'unsupported',
  message: 'Checking Chrome Prompt API availability.',
};

export function App() {
  const [promptStatus, setPromptStatus] = useState<PromptApiStatus>(INITIAL_PROMPT_STATUS);
  const [document, setDocument] = useState<AnalyzableDocumentSource>();
  const [importError, setImportError] = useState<string>();
  const [analysisError, setAnalysisError] = useState<string>();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reviewState, dispatchReview] = useReducer(reviewReducer, createInitialReviewState([]));
  const importRequestId = useRef(0);

  useEffect(() => {
    void checkPromptApiStatus().then(setPromptStatus);
  }, []);

  useEffect(() => () => revokeDocumentUrl(document), [document]);

  async function handleFileSelected(file: File) {
    const requestId = importRequestId.current + 1;
    importRequestId.current = requestId;
    setImportError(undefined);
    setAnalysisError(undefined);

    try {
      const parsed = file.type.startsWith('image/') ? await parseImageDocument(file) : await parseJsonDocument(file);
      if (requestId !== importRequestId.current) {
        revokeDocumentUrl(parsed);
        return;
      }

      setDocument(parsed);
      dispatchReview({ type: 'replace-all-findings', findings: [] });
    } catch (error) {
      if (requestId !== importRequestId.current) {
        return;
      }

      setDocument(undefined);
      dispatchReview({ type: 'replace-all-findings', findings: [] });
      setImportError(error instanceof Error ? error.message : 'Could not import file.');
    }
  }

  async function handleAnalyze() {
    if (!document || promptStatus.state !== 'available') {
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(undefined);

    try {
      const session = await createPromptSession();
      const findings =
        document.mediaType === 'image'
          ? await analyzeImageDocument(document, session)
          : await analyzeJsonDocument(document, session);
      dispatchReview({ type: 'replace-all-findings', findings });
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Prompt API analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Local Chrome AI experiment</p>
          <h1>Client-Side Data Anonymizer</h1>
        </div>
        <PromptStatus status={promptStatus} />
      </header>

      <section className="workbench-grid">
        <div className="left-stack">
          <FileImporter onFileSelected={handleFileSelected} error={importError} />
          <button
            className="secondary-button"
            disabled={!document || promptStatus.state !== 'available' || isAnalyzing}
            onClick={handleAnalyze}
          >
            {isAnalyzing ? `Analyzing ${document?.mediaType === 'image' ? 'image' : 'JSON'}` : 'Run Prompt API analysis'}
          </button>
          {analysisError ? <p className="error-text">{analysisError}</p> : null}
          <ExportPanel document={document} findings={reviewState.findings} />
        </div>
        {document?.mediaType === 'image' ? (
          <ImagePreview document={document} findings={reviewState.findings} />
        ) : (
          <JsonPreview document={document} />
        )}
        <FindingsPanel findings={reviewState.findings} dispatchReview={dispatchReview} />
      </section>
    </main>
  );
}

function revokeDocumentUrl(document: AnalyzableDocumentSource | undefined): void {
  if (document?.mediaType === 'image') {
    URL.revokeObjectURL(document.objectUrl);
  }
}
