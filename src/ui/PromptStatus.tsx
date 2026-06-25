import { type PromptApiStatus } from '../ai/promptApi';

interface PromptStatusProps {
  status: PromptApiStatus;
}

export function PromptStatus({ status }: PromptStatusProps) {
  return (
    <section aria-label="Prompt API Status" className={`status-pill status-${status.state}`}>
      <strong>Prompt API status:</strong> {status.message}
    </section>
  );
}
