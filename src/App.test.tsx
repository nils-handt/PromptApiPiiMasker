import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

describe('App', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(globalThis, 'LanguageModel');
  });

  it('imports JSON and shows the review workbench', async () => {
    const user = userEvent.setup();
    render(<App />);

    const file = new File([JSON.stringify({ customer: { name: 'Nora Weber' } })], 'customer.json', {
      type: 'application/json',
    });

    await user.upload(screen.getByLabelText(/import json/i), file);

    expect(await screen.findByText('customer.json')).toBeInTheDocument();
    expect(screen.getByText('$.customer.name')).toBeInTheDocument();
  });

  it('runs Prompt API analysis and shows returned findings', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('available'),
      create: vi.fn().mockResolvedValue({
        prompt: vi.fn().mockResolvedValue(
          JSON.stringify({
            findings: [
              {
                id: 'f-1',
                category: 'name',
                originalValue: 'Nora Weber',
                confidence: 0.91,
                path: '$.customer.name',
              },
            ],
          }),
        ),
      }),
    });

    render(<App />);
    expect(await screen.findByText(/model is ready/i)).toBeInTheDocument();

    const file = new File([JSON.stringify({ customer: { name: 'Nora Weber' } })], 'customer.json', {
      type: 'application/json',
    });
    await user.upload(screen.getByLabelText(/import json/i), file);
    await user.click(screen.getByRole('button', { name: /run prompt api analysis/i }));

    expect(await screen.findByText('Status: pending')).toBeInTheDocument();
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
  });
});
