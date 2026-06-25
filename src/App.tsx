import { useEffect, useReducer, useState } from 'react';
import { analyzeJsonDocument } from './ai/jsonPiiAnalyzer';
import { checkPromptApiStatus, createPromptSession, type PromptApiStatus } from './ai/promptApi';
import { type JsonDocumentSource } from './domain/types';
import { parseJsonDocument } from './documents/json/jsonAdapter';
import { createInitialReviewState, reviewReducer } from './review/reviewReducer';
import { ExportPanel } from './ui/ExportPanel';
import { FileImporter } from './ui/FileImporter';
import { FindingsPanel } from './ui/FindingsPanel';
import { JsonPreview } from './ui/JsonPreview';
import { PromptStatus } from './ui/PromptStatus';

const INITIAL_PROMPT_STATUS: PromptApiStatus = {
  state: 'unsupported',
  message: 'Checking Chrome Prompt API availability.',
};

export function App() {
  const [promptStatus, setPromptStatus] = useState<PromptApiStatus>(INITIAL_PROMPT_STATUS);
  const [document, setDocument] = useState<JsonDocumentSource>();
  const [importError, setImportError] = useState<string>();
  const [analysisError, setAnalysisError] = useState<string>();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reviewState, dispatchReview] = useReducer(reviewReducer, createInitialReviewState([]));

  useEffect(() => {
    void checkPromptApiStatus().then(setPromptStatus);
  }, []);

  async function handleFileSelected(file: File) {
    setImportError(undefined);
    setAnalysisError(undefined);

    try {
      const parsed = await parseJsonDocument(file);
      setDocument(parsed);
      dispatchReview({ type: 'replace-all-findings', findings: [] });
    } catch (error) {
      setDocument(undefined);
      dispatchReview({ type: 'replace-all-findings', findings: [] });
      setImportError(error instanceof Error ? error.message : 'Could not import JSON file.');
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
      const findings = await analyzeJsonDocument(document, session);
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
            {isAnalyzing ? 'Analyzing JSON' : 'Run Prompt API analysis'}
          </button>
          {analysisError ? <p className="error-text">{analysisError}</p> : null}
          <ExportPanel document={document} findings={reviewState.findings} />
        </div>
        <JsonPreview document={document} />
        <FindingsPanel findings={reviewState.findings} dispatchReview={dispatchReview} />
      </section>
    </main>
  );
}
