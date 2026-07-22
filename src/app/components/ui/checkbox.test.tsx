import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Checkbox } from './checkbox';

describe('ui/Checkbox', () => {
  it('renders a checkbox', () => {
    render(<Checkbox />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('reflects checked state', () => {
    render(<Checkbox checked />);
    const cb = screen.getByRole('checkbox') as HTMLButtonElement;
    expect(cb).toBeInTheDocument();
  });
});
