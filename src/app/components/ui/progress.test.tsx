import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Progress } from './progress';

describe('ui/Progress', () => {
  it('renders a progress root', () => {
    const { container } = render(<Progress value={42} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
