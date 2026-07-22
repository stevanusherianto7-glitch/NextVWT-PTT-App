import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Switch } from './switch';

describe('ui/Switch', () => {
  it('renders a switch', () => {
    const { container } = render(<Switch />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders checked', () => {
    const { container } = render(<Switch checked />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
