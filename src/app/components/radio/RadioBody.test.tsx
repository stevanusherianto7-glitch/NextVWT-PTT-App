import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { usePTTStore } from '../../store/usePTTStore';

vi.mock('../PTTButton', () => ({
  PTTButton: (props: any) => (
    <button data-testid="ptt" onClick={props.onPressStart}>
      PTT
    </button>
  ),
}));
vi.mock('./UserListOverlay', () => ({
  UserListOverlay: () => <div data-testid="userlist">USERLIST</div>,
}));
vi.mock('./PTTArea', () => ({
  PTTArea: (props: any) => <div data-testid="pttarea">{props.lcd ? 'has-lcd' : ''}</div>,
}));
vi.mock('./ReactionsOverlay', () => ({
  ReactionsOverlay: () => <div data-testid="reactions">REACTIONS</div>,
}));

import { RadioBody } from './RadioBody';

describe('RadioBody', () => {
  beforeEach(() => {
    usePTTStore.setState({
      isPowerOn: true,
      isTransmitting: false,
      showPTT: true,
      channelNumber: 100,
    });
  });

  const baseProps = {
    isUserListOpen: false,
    setIsUserListOpen: vi.fn(),
    floatingReactions: [] as any[],
    waitTimer: null,
    isBusy: false,
    status: 'active',
    dynamicUserList: [] as any[],
    channelNameStr: 'TEST',
    onPressStart: vi.fn(),
    onPressEnd: vi.fn(),
    lcd: <div />,
    footer: <div />,
    quickDock: <div data-testid="quickdock">QD</div>,
    karaokePlayer: null as any,
  };

  it('renders PTTArea when user list closed', () => {
    render(<RadioBody {...baseProps} />);
    expect(screen.getByTestId('pttarea')).toBeInTheDocument();
    expect(screen.queryByTestId('userlist')).not.toBeInTheDocument();
  });

  it('renders UserListOverlay when user list open', () => {
    render(<RadioBody {...baseProps} isUserListOpen={true} />);
    expect(screen.getByTestId('userlist')).toBeInTheDocument();
  });

  it('calls onPressStart when PTT clicked (power on)', () => {
    const onPressStart = vi.fn();
    render(<RadioBody {...baseProps} onPressStart={onPressStart} />);
    fireEvent.click(screen.getByTestId('ptt'));
    expect(onPressStart).toHaveBeenCalled();
  });

  it('does not call onPressStart when power off', () => {
    usePTTStore.setState({ isPowerOn: false });
    const onPressStart = vi.fn();
    render(<RadioBody {...baseProps} onPressStart={onPressStart} />);
    fireEvent.click(screen.getByTestId('ptt'));
    expect(onPressStart).not.toHaveBeenCalled();
  });

  it('renders reactions overlay when power on + reactions present', () => {
    render(<RadioBody {...baseProps} floatingReactions={[{ id: '1' }] as any} />);
    expect(screen.getByTestId('reactions')).toBeInTheDocument();
  });

  it('renders karaoke player when provided', () => {
    render(<RadioBody {...baseProps} karaokePlayer={<div data-testid="karaoke">K</div>} />);
    expect(screen.getByTestId('karaoke')).toBeInTheDocument();
  });

  it('renders quick dock', () => {
    render(<RadioBody {...baseProps} />);
    expect(screen.getByTestId('quickdock')).toBeInTheDocument();
  });
});
