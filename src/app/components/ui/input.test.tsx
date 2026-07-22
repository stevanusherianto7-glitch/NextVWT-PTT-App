import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from './input';

describe('ui/Input', () => {
  it('renders an input', () => {
    render(<Input placeholder="type" />);
    expect(screen.getByPlaceholderText('type')).toBeInTheDocument();
  });

  it('is disabled when prop set', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});
