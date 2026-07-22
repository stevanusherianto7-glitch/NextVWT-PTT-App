import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { usePTTStore } from '../../store/usePTTStore';

vi.mock('../ProgressBar', () => ({
  ProgressBar: ({ progress }: { progress: number }) => (
    <div data-testid="progress">{(progress * 100).toFixed(0)}%</div>
  ),
}));

import { PTTArea } from './PTTArea';

describe('PTTArea', () => {
  beforeEach(() => {
    usePTTStore.setState({ isPowerOn: true, showModulator: false, progress: 0.5 });
  });

  it('renders lcd and footer', () => {
    render(
      <PTTArea lcd={<div data-testid="lcd">LCD</div>} footer={<div data-testid="footer">FT</div>} />
    );
    expect(screen.getByTestId('lcd')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  it('renders ProgressBar when showModulator true', () => {
    usePTTStore.setState({ showModulator: true, progress: 0.42 });
    render(<PTTArea lcd={<div />} footer={<div />} />);
    expect(screen.getByTestId('progress')).toHaveTextContent('42%');
  });

  it('hides ProgressBar when showModulator false', () => {
    usePTTStore.setState({ showModulator: false });
    render(<PTTArea lcd={<div />} footer={<div />} />);
    expect(screen.queryByTestId('progress')).not.toBeInTheDocument();
  });
});
