import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { usePTTStore } from '../../store/usePTTStore';

vi.mock('../ControlButtons', () => ({
  ControlButtons: (props: any) => (
    <div data-testid="control">
      <button data-testid="scan" onClick={props.onScan}>
        scan
      </button>
      <button data-testid="set" onClick={props.onSet}>
        set
      </button>
    </div>
  ),
}));
vi.mock('../QuickActionDock', () => ({
  QuickActionDock: () => <div data-testid="quickdock">QD</div>,
}));

import { RadioFooter, RadioQuickDock } from './RadioFooter';

describe('RadioFooter', () => {
  beforeEach(() => {
    usePTTStore.setState({ isPowerOn: true, isScanning: false, channelNumber: 100 });
  });

  it('renders ControlButtons with handlers', () => {
    const onScan = vi.fn();
    const onSet = vi.fn();
    render(<RadioFooter onScan={onScan} onSet={onSet} />);
    expect(screen.getByTestId('control')).toBeInTheDocument();
  });

  it('RadioQuickDock returns null when user list closed', () => {
    const { container } = render(
      <RadioQuickDock
        isUserListOpen={false}
        onOpenChat={vi.fn()}
        onOpenQueue={vi.fn()}
        onSendReaction={vi.fn()}
        getThemeClass={(t: string) => t}
        channelNumber={100}
      />
    );
    expect(container.querySelector('[data-testid="quickdock"]')).not.toBeInTheDocument();
  });

  it('RadioQuickDock renders when user list open', () => {
    render(
      <RadioQuickDock
        isUserListOpen={true}
        onOpenChat={vi.fn()}
        onOpenQueue={vi.fn()}
        onSendReaction={vi.fn()}
        getThemeClass={(t: string) => t}
        channelNumber={200}
      />
    );
    expect(screen.getByTestId('quickdock')).toBeInTheDocument();
  });
});
