import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Slider } from './slider';

describe('ui/Slider', () => {
  it('renders a slider', () => {
    const { container } = render(<Slider defaultValue={[50]} min={0} max={100} step={1} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
