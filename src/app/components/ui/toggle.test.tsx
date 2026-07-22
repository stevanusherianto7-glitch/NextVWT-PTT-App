import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toggle } from './toggle';

describe('ui/Toggle', () => {
  it('renders a toggle button', () => {
    render(<Toggle aria-label="sorot">Sorot</Toggle>);
    expect(screen.getByLabelText('sorot')).toBeInTheDocument();
  });

  it('toggles data-state on click', () => {
    render(<Toggle aria-label="sorot">Sorot</Toggle>);
    const btn = screen.getByLabelText('sorot');
    expect(btn).toHaveAttribute('data-state', 'off');
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('data-state', 'on');
  });

  it('respects pressed prop', () => {
    render(
      <Toggle aria-label="sorot" pressed>
        Sorot
      </Toggle>
    );
    expect(screen.getByLabelText('sorot')).toHaveAttribute('data-state', 'on');
  });
});
