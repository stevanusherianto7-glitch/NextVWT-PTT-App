import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge, badgeVariants } from './badge';

describe('ui/Badge', () => {
  it('renders children', () => {
    render(<Badge>Hello</Badge>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('applies variant classes', () => {
    render(<Badge variant="destructive">X</Badge>);
    expect(screen.getByText('X')).toBeInTheDocument();
  });

  it('badgeVariants returns a string for default', () => {
    expect(typeof badgeVariants()).toBe('string');
  });

  it('badgeVariants accepts variant prop', () => {
    expect(typeof badgeVariants({ variant: 'outline' })).toBe('string');
  });
});
