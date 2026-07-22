import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Separator } from './separator';

describe('ui/Separator', () => {
  it('renders a separator element', () => {
    const { container } = render(<Separator />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders vertical orientation', () => {
    const { container } = render(<Separator orientation="vertical" />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
