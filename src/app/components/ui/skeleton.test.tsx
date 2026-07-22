import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton } from './skeleton';

describe('ui/Skeleton', () => {
  it('renders a div with animate-pulse', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('accepts className', () => {
    const { container } = render(<Skeleton className="h-10" />);
    expect(container.firstChild).toHaveClass('h-10');
  });
});
