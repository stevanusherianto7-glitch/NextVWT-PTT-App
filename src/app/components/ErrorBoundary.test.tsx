import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { FC } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

const Boom: FC = () => {
  throw new Error('kaboom');
};

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>safe</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('safe')).toBeInTheDocument();
  });

  it('renders fallback UI when child throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Terjadi Kesalahan/i)).toBeInTheDocument();
    spy.mockRestore();
  });

  it('uses custom fallback when provided', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<div>custom fallback</div>}>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText('custom fallback')).toBeInTheDocument();
    spy.mockRestore();
  });
});
