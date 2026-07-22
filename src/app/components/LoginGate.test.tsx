import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginGate } from './LoginGate';

describe('LoginGate', () => {
  it('renders a login prompt', () => {
    render(<LoginGate onLogin={vi.fn()} />);
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('calls onLogin when button clicked', () => {
    const onLogin = vi.fn();
    render(<LoginGate onLogin={onLogin} />);
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(onLogin).toHaveBeenCalled();
  });
});
