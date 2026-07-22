import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FloatingKaraokePlayer } from './FloatingKaraokePlayer';

describe('FloatingKaraokePlayer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (window as any).open = vi.fn();
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
      configurable: true,
      get: () => ({ postMessage: vi.fn() }),
    });
  });

  it('renders empty placeholder initially', () => {
    render(<FloatingKaraokePlayer onClose={() => {}} />);
    expect(screen.getByText(/Silahkan tempel URL/i)).toBeInTheDocument();
  });

  it('loads video by YouTube URL', () => {
    render(<FloatingKaraokePlayer onClose={() => {}} />);
    const input = screen.getByPlaceholderText(/Cari lagu/i);
    fireEvent.change(input, { target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTitle('Jeda')).toBeInTheDocument();
  });

  it('loads video by direct 11-char ID', () => {
    render(<FloatingKaraokePlayer onClose={() => {}} />);
    const input = screen.getByPlaceholderText(/Cari lagu/i);
    fireEvent.change(input, { target: { value: 'dQw4w9WgXcQ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTitle('Jeda')).toBeInTheDocument();
  });

  it('opens YouTube search for non-video text', () => {
    render(<FloatingKaraokePlayer onClose={() => {}} />);
    const input = screen.getByPlaceholderText(/Cari lagu/i);
    fireEvent.change(input, { target: { value: 'lagu dangdut' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect((window as any).open).toHaveBeenCalled();
  });

  it('calls onClose via close button', () => {
    const onClose = vi.fn();
    render(<FloatingKaraokePlayer onClose={onClose} />);
    fireEvent.click(screen.getByTitle('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('minimizes and maximizes', () => {
    render(<FloatingKaraokePlayer onClose={() => {}} />);
    fireEvent.click(screen.getByTitle('Minimize'));
    expect(screen.getByTitle('Maximize')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Maximize'));
    expect(screen.getByTitle('Minimize')).toBeInTheDocument();
  });

  it('opens quality settings and changes quality', () => {
    render(<FloatingKaraokePlayer onClose={() => {}} />);
    fireEvent.click(screen.getByTitle('Kualitas video'));
    expect(screen.getByText('Kualitas')).toBeInTheDocument();
    fireEvent.click(screen.getByText('720p'));
    // dropdown closes after selection
    expect(screen.queryByText('Kualitas')).not.toBeInTheDocument();
  });
});
