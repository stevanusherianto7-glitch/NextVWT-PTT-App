import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRadioOrchestrator } from '../hooks/useRadioOrchestrator';

const toastMock = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), warning: vi.fn() }));

// Mock orchestrator so we control view-model + callbacks
vi.mock('../hooks/useRadioOrchestrator', () => ({
  useRadioOrchestrator: vi.fn(),
}));

// Mock child components
vi.mock('./radio/RadioHeader', () => ({
  RadioHeader: ({ marqueeText }: { marqueeText: string }) => (
    <div data-testid="header">{marqueeText}</div>
  ),
  RadioLCD: (props: any) => (
    <button data-testid="lcd" onClick={props.onUserCountClick}>
      LCD
    </button>
  ),
}));
vi.mock('./radio/RadioBody', () => ({
  RadioBody: (props: any) => (
    <div data-testid="body">
      <button data-testid="ptt" onClick={props.onPressStart}>
        PTT
      </button>
      <button data-testid="ptt-end" onClick={props.onPressEnd}>
        END
      </button>
      {props.lcd}
      {props.footer}
      {props.quickDock}
      {props.karaokePlayer}
    </div>
  ),
}));
vi.mock('./radio/RadioFooter', () => ({
  RadioFooter: (props: any) => (
    <div data-testid="footer">
      <button data-testid="scan" onClick={props.onScan}>
        scan
      </button>
      <button data-testid="set" onClick={props.onSet}>
        set
      </button>
    </div>
  ),
  RadioQuickDock: (props: any) => (
    <div data-testid="quickdock">
      <button data-testid="chat" onClick={props.onOpenChat}>
        chat
      </button>
      <button data-testid="queue" onClick={props.onOpenQueue}>
        queue
      </button>
      <button data-testid="reaction" onClick={() => props.onSendReaction('sound', 'lol')}>
        reaction
      </button>
    </div>
  ),
}));
vi.mock('./radio/RadioQuickDock', () => ({
  RadioQuickDock: (props: any) => (
    <div data-testid="quickdock">
      <button data-testid="chat" onClick={props.onOpenChat}>
        chat
      </button>
      <button data-testid="queue" onClick={props.onOpenQueue}>
        queue
      </button>
      <button data-testid="reaction" onClick={() => props.onSendReaction('sound', 'lol')}>
        reaction
      </button>
    </div>
  ),
}));
vi.mock('./radio/RadioPanels', () => ({
  RadioPanels: () => <div data-testid="panels">PANELS</div>,
}));
vi.mock('./radio/RadioLCD', () => ({
  RadioLCD: (props: any) => (
    <button data-testid="lcd" onClick={props.onUserCountClick}>
      LCD
    </button>
  ),
}));
vi.mock('./LazyFloatingKaraokePlayer', () => ({
  FloatingKaraokePlayer: () => <div data-testid="karaoke">KARAOKE</div>,
}));
vi.mock('./ChannelListModal', () => ({
  ChannelListModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="channellist">
      <button data-testid="cl-close" onClick={onClose}>
        close
      </button>
    </div>
  ),
}));
vi.mock('sonner', () => ({ toast: toastMock }));

import { RadioLayout } from './RadioLayout';

function baseOrchestrator(overrides: Record<string, unknown> = {}) {
  return {
    isPowerOn: true,
    setChannelNumber: vi.fn(),
    audioMode: 'discussion',
    isKaraokePlayerOpen: false,
    setIsKaraokePlayerOpen: vi.fn(),
    setIsTransmitting: vi.fn(),
    activeChannelObj: { name: 'Test Channel' },
    isSettingsOpen: false,
    setIsSettingsOpen: vi.fn(),
    isChannelListOpen: false,
    setIsChannelListOpen: vi.fn(),
    isUserListOpen: false,
    setIsUserListOpen: vi.fn(),
    isManageOpen: false,
    setIsManageOpen: vi.fn(),
    isWalletOpen: false,
    setIsWalletOpen: vi.fn(),
    isRoipOpen: false,
    setIsRoipOpen: vi.fn(),
    isChatOpen: false,
    setIsChatOpen: vi.fn(),
    isQueueOpen: false,
    setIsQueueOpen: vi.fn(),
    isPrivateOpen: false,
    setIsPrivateOpen: vi.fn(),
    floatingReactions: [],
    waitTimer: null,
    dynamicUserList: [],
    dynamicUserCount: 0,
    getThemeClass: (t: string) => `theme-${t}`,
    themeText: 'theme-v1',
    status: 'active',
    pttAllowed: true,
    isBusy: false,
    handleSet: vi.fn(),
    handleSendReaction: vi.fn(),
    marqueeText: 'MARQUEE',
    channelNameStr: 'TEST CHANNEL',
    isPanelOpen: false,
    roomId: 'ptt-room-100',
    userId: 'me',
    channel: 100,
    ...overrides,
  };
}

describe('RadioLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toastMock.error.mockClear();
    vi.mocked(useRadioOrchestrator).mockReturnValue(baseOrchestrator() as never);
  });

  it('renders header + body (not panels) when no panel open', () => {
    render(<RadioLayout />);
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('body')).toBeInTheDocument();
    expect(screen.queryByTestId('panels')).not.toBeInTheDocument();
  });

  it('renders panels when isPanelOpen', () => {
    vi.mocked(useRadioOrchestrator).mockReturnValue(
      baseOrchestrator({ isPanelOpen: true }) as never
    );
    render(<RadioLayout />);
    expect(screen.getByTestId('panels')).toBeInTheDocument();
    expect(screen.queryByTestId('body')).not.toBeInTheDocument();
  });

  it('closes user list on container click when power on', () => {
    const setIsUserListOpen = vi.fn();
    vi.mocked(useRadioOrchestrator).mockReturnValue(
      baseOrchestrator({ isUserListOpen: true, setIsUserListOpen }) as never
    );
    const { container } = render(<RadioLayout />);
    fireEvent.click(container.firstChild as HTMLElement);
    expect(setIsUserListOpen).toHaveBeenCalledWith(false);
  });

  it('starts transmitting on PTT press when allowed', () => {
    const setIsTransmitting = vi.fn();
    vi.mocked(useRadioOrchestrator).mockReturnValue(
      baseOrchestrator({ setIsTransmitting, pttAllowed: true }) as never
    );
    render(<RadioLayout />);
    fireEvent.click(screen.getByTestId('ptt'));
    expect(setIsTransmitting).toHaveBeenCalledWith(true);
  });

  it('blocks PTT and toasts when not allowed (muted)', () => {
    const setIsTransmitting = vi.fn();
    vi.mocked(useRadioOrchestrator).mockReturnValue(
      baseOrchestrator({ setIsTransmitting, pttAllowed: false, status: 'muted' }) as never
    );
    render(<RadioLayout />);
    fireEvent.click(screen.getByTestId('ptt'));
    expect(setIsTransmitting).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalled();
  });

  it('shows karaoke player only when power on + music mode + open', () => {
    vi.mocked(useRadioOrchestrator).mockReturnValue(
      baseOrchestrator({
        audioMode: 'music',
        isKaraokePlayerOpen: true,
      }) as never
    );
    render(<RadioLayout />);
    expect(screen.getByTestId('karaoke')).toBeInTheDocument();
  });

  it('hides karaoke player when not music mode', () => {
    vi.mocked(useRadioOrchestrator).mockReturnValue(
      baseOrchestrator({ audioMode: 'discussion', isKaraokePlayerOpen: true }) as never
    );
    render(<RadioLayout />);
    expect(screen.queryByTestId('karaoke')).not.toBeInTheDocument();
  });

  it('opens channel list modal when scan pressed', () => {
    const setIsChannelListOpen = vi.fn();
    vi.mocked(useRadioOrchestrator).mockReturnValue(
      baseOrchestrator({ setIsChannelListOpen }) as never
    );
    render(<RadioLayout />);
    fireEvent.click(screen.getByTestId('scan'));
    expect(setIsChannelListOpen).toHaveBeenCalledWith(true);
  });

  it('opens user list when LCD clicked', () => {
    const setIsUserListOpen = vi.fn();
    vi.mocked(useRadioOrchestrator).mockReturnValue(
      baseOrchestrator({ setIsUserListOpen }) as never
    );
    render(<RadioLayout />);
    fireEvent.click(screen.getByTestId('lcd'));
    expect(setIsUserListOpen).toHaveBeenCalledWith(true);
  });
});
