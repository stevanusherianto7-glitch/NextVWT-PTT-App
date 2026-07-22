import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Label } from './label';

describe('ui/Label', () => {
  it('renders text', () => {
    render(<Label>Name</Label>);
    expect(screen.getByText('Name')).toBeInTheDocument();
  });
});
