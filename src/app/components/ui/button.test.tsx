import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button, buttonVariants } from './button';

describe('ui/Button', () => {
  it('renders children', () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole('button', { name: 'Click' })).toBeInTheDocument();
  });

  it('handles onClick', () => {
    let clicked = false;
    render(<Button onClick={() => (clicked = true)}>Go</Button>);
    screen.getByRole('button', { name: 'Go' }).click();
    expect(clicked).toBe(true);
  });

  it('buttonVariants returns class string', () => {
    expect(typeof buttonVariants()).toBe('string');
    expect(typeof buttonVariants({ variant: 'destructive' })).toBe('string');
  });

  it('applies disabled', () => {
    render(<Button disabled>No</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
