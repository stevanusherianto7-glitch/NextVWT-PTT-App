import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToggleSwitch } from './ToggleSwitch';

describe('ToggleSwitch', () => {
  it('renders a checkbox input', () => {
    render(<ToggleSwitch isOn={true} onToggle={() => {}} />);
    const input = screen.getByRole('checkbox') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.checked).toBe(true);
  });

  it('renders unchecked when isOn false', () => {
    render(<ToggleSwitch isOn={false} onToggle={() => {}} />);
    const input = screen.getByRole('checkbox') as HTMLInputElement;
    expect(input.checked).toBe(false);
  });

  it('calls onToggle when changed', () => {
    const onToggle = vi.fn();
    render(<ToggleSwitch isOn={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
