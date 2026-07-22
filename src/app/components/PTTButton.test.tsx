import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PTTButton } from './PTTButton';
import { usePTTStore } from '../store/usePTTStore';

describe('PTTButton', () => {
  beforeEach(() => {
    // Non-toggle mode so onPressStart fires on mousedown
    usePTTStore.setState({ togglePtt: false, isPowerOn: true });
  });

  it('renders a pressable button', () => {
    render(<PTTButton onPressStart={vi.fn()} onPressEnd={vi.fn()} />);
    expect(screen.getByTestId('ptt-button')).toBeInTheDocument();
  });

  it('calls onPressStart on mousedown (non-toggle)', () => {
    const onPressStart = vi.fn();
    render(<PTTButton onPressStart={onPressStart} onPressEnd={vi.fn()} />);
    fireEvent.mouseDown(screen.getByTestId('ptt-button'));
    expect(onPressStart).toHaveBeenCalled();
  });

  it('calls onPressEnd on mouseleave (non-toggle)', () => {
    const onPressEnd = vi.fn();
    render(<PTTButton onPressStart={vi.fn()} onPressEnd={onPressEnd} />);
    const btn = screen.getByTestId('ptt-button');
    fireEvent.mouseDown(btn);
    fireEvent.mouseLeave(btn);
    expect(onPressEnd).toHaveBeenCalled();
  });
});
