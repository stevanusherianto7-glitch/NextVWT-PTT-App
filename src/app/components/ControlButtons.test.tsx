import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ControlButtons } from './ControlButtons';

describe('ControlButtons', () => {
  it('renders scan/set/up/down buttons', () => {
    render(<ControlButtons onScan={vi.fn()} onSet={vi.fn()} onUp={vi.fn()} onDown={vi.fn()} />);
    expect(screen.getByTestId('scan-button')).toBeInTheDocument();
  });

  it('calls onScan when scan button clicked', () => {
    const onScan = vi.fn();
    render(<ControlButtons onScan={onScan} onSet={vi.fn()} onUp={vi.fn()} onDown={vi.fn()} />);
    fireEvent.click(screen.getByTestId('scan-button'));
    expect(onScan).toHaveBeenCalled();
  });
});
