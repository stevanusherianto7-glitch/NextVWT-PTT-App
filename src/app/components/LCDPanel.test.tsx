import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LCDPanel } from './LCDPanel';

describe('LCDPanel', () => {
  it('renders channel number zero-padded', () => {
    render(<LCDPanel channel={1} userCount={5} />);
    expect(screen.getByText('001')).toBeInTheDocument();
  });

  it('renders user count zero-padded', () => {
    render(<LCDPanel channel={7} userCount={12} />);
    expect(screen.getByText('007')).toBeInTheDocument();
    expect(screen.getByText('012')).toBeInTheDocument();
  });

  it('renders offline state', () => {
    render(<LCDPanel channel={3} isOffline={true} />);
    expect(screen.getByText('003')).toBeInTheDocument();
  });

  it('calls onUserCountClick when provided', () => {
    const onUserCountClick = vi.fn();
    render(<LCDPanel channel={2} userCount={3} onUserCountClick={onUserCountClick} />);
    fireEvent.click(screen.getByText('003'));
    expect(onUserCountClick).toHaveBeenCalledTimes(1);
  });
});
