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

    await user.upload(screen.getByLabelText(/import file/i), file);

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
    await user.upload(screen.getByLabelText(/import file/i), file);
    await user.click(screen.getByRole('button', { name: /run prompt api analysis/i }));

    expect(await screen.findByText('Status: pending')).toBeInTheDocument();
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
  });

  it('imports an image, runs visual analysis, and shows region findings', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 300, height: 200, close: vi.fn() }));
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn().mockReturnValue('blob:badge'),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal('LanguageModel', {
      availability: vi.fn().mockResolvedValue('available'),
      create: vi.fn().mockResolvedValue({
        prompt: vi.fn().mockResolvedValue(
          JSON.stringify({
            findings: [
              {
                id: 'img-1',
                category: 'email',
                originalValue: 'nora@example.test',
                confidence: 0.9,
                region: { x: 30, y: 40, width: 120, height: 20 },
              },
            ],
          }),
        ),
      }),
    });

    render(<App />);
    expect(await screen.findByText(/model is ready/i)).toBeInTheDocument();

    const file = new File(['image-bytes'], 'badge.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText(/import file/i), file);
    await user.click(screen.getByRole('button', { name: /run prompt api analysis/i }));

    expect(await screen.findByRole('img', { name: /badge.png/i })).toBeInTheDocument();
    expect(await screen.findByText('email')).toBeInTheDocument();
    expect(screen.getByLabelText(/email region/i)).toBeInTheDocument();
  });

  it('revokes imported image preview URLs when the image is replaced', async () => {
    const user = userEvent.setup();
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 300, height: 200, close: vi.fn() }));
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn().mockReturnValue('blob:badge'),
      revokeObjectURL,
    });

    render(<App />);

    await user.upload(screen.getByLabelText(/import file/i), new File(['image'], 'badge.png', { type: 'image/png' }));
    expect(await screen.findByRole('img', { name: /badge.png/i })).toBeInTheDocument();

    await user.upload(
      screen.getByLabelText(/import file/i),
      new File([JSON.stringify({ customer: { name: 'Nora Weber' } })], 'customer.json', {
        type: 'application/json',
      }),
    );

    expect(await screen.findByText('customer.json')).toBeInTheDocument();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:badge');
  });

  it('ignores stale image imports that resolve after a newer file selection', async () => {
    const user = userEvent.setup();
    const revokeObjectURL = vi.fn();
    let resolveBitmap: ((bitmap: { width: number; height: number; close: () => void }) => void) | undefined;
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(
        () =>
          new Promise((resolve) => {
            resolveBitmap = resolve;
          }),
      ),
    );
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn().mockReturnValue('blob:slow-image'),
      revokeObjectURL,
    });

    render(<App />);

    await user.upload(screen.getByLabelText(/import file/i), new File(['slow-image'], 'slow.png', { type: 'image/png' }));
    await user.upload(
      screen.getByLabelText(/import file/i),
      new File([JSON.stringify({ customer: { name: 'Nora Weber' } })], 'customer.json', {
        type: 'application/json',
      }),
    );

    expect(await screen.findByText('customer.json')).toBeInTheDocument();

    resolveBitmap?.({ width: 300, height: 200, close: vi.fn() });

    expect(await screen.findByText('customer.json')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /slow.png/i })).not.toBeInTheDocument();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:slow-image');
  });
});
