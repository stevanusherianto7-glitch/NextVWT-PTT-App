import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToggleGroup, ToggleGroupItem } from './toggle-group';

describe('ui/ToggleGroup', () => {
  it('renders group with items', () => {
    render(
      <ToggleGroup type="single" aria-label="opsi">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
      </ToggleGroup>
    );
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('activates item on click', () => {
    render(
      <ToggleGroup type="single" aria-label="opsi">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
      </ToggleGroup>
    );
    const a = screen.getByText('A');
    fireEvent.click(a);
    expect(a).toHaveAttribute('data-state', 'on');
  });
});
