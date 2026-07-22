import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('renders without crashing', () => {
    const { container } = render(<ProgressBar progress={50} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('shows full modulation label at high progress', () => {
    render(<ProgressBar progress={90} />);
    expect(screen.getByText(/MODULASI PENUH/)).toBeInTheDocument();
  });

  it('shows weak sound label at low progress', () => {
    render(<ProgressBar progress={30} />);
    expect(screen.getByText(/SUARA LEMAH/)).toBeInTheDocument();
  });

  it('renders at zero without label', () => {
    const { container } = render(<ProgressBar progress={0} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
