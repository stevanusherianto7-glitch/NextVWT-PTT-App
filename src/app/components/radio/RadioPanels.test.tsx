import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../../features/moderation/ChannelManagePanel', () => ({
  ChannelManagePanel: ({ onClose }: any) => (
    <div data-testid="manage">
      MANAGE<button onClick={onClose}>x</button>
    </div>
  ),
}));
vi.mock('../../../features/payment/WalletPanel', () => ({
  WalletPanel: ({ onClose }: any) => (
    <div data-testid="wallet">
      WALLET<button onClick={onClose}>x</button>
    </div>
  ),
}));
vi.mock('../../../features/roip/ROIPBridgePanel', () => ({
  ROIPBridgePanel: ({ onClose }: any) => (
    <div data-testid="roip">
      ROIP<button onClick={onClose}>x</button>
    </div>
  ),
}));
vi.mock('../../../features/chat/ChatRoomPanel', () => ({
  ChatRoomPanel: ({ onClose }: any) => (
    <div data-testid="chat">
      CHAT<button onClick={onClose}>x</button>
    </div>
  ),
}));
vi.mock('../../../features/karaoke-queue/KaraokeQueuePanel', () => ({
  KaraokeQueuePanel: ({ onClose }: any) => (
    <div data-testid="queue">
      QUEUE<button onClick={onClose}>x</button>
    </div>
  ),
}));
vi.mock('../../../features/moderation/PrivateChannelPanel', () => ({
  PrivateChannelPanel: ({ onClose }: any) => (
    <div data-testid="private">
      PRIVATE<button onClick={onClose}>x</button>
    </div>
  ),
}));
vi.mock('../SettingsPanel', () => ({
  SettingsPanel: ({ onClose }: any) => (
    <div data-testid="settings">
      SETTINGS<button onClick={onClose}>x</button>
    </div>
  ),
}));
vi.mock('../FeedbackModal', () => ({
  FeedbackModal: () => <div data-testid="feedback">FEEDBACK</div>,
}));
vi.mock('../ChannelListModal', () => ({
  ChannelListModal: ({ onClose }: any) => (
    <div data-testid="channellist">
      CHLIST<button onClick={onClose}>x</button>
    </div>
  ),
}));

import { RadioPanels } from './RadioPanels';

const baseProps = {
  roomId: 'ptt-room-100',
  userId: 'u1',
  channelName: 'Landing',
  isManageOpen: false,
  isWalletOpen: false,
  isRoipOpen: false,
  isChatOpen: false,
  isQueueOpen: false,
  isPrivateOpen: false,
  isSettingsOpen: false,
  isChannelListOpen: false,
  setIsManageOpen: vi.fn(),
  setIsWalletOpen: vi.fn(),
  setIsRoipOpen: vi.fn(),
  setIsChatOpen: vi.fn(),
  setIsQueueOpen: vi.fn(),
  setIsPrivateOpen: vi.fn(),
  setIsSettingsOpen: vi.fn(),
  setIsChannelListOpen: vi.fn(),
};

describe('RadioPanels', () => {
  it('renders manage panel when isManageOpen', () => {
    render(<RadioPanels {...baseProps} isManageOpen={true} isChannelListOpen={false} />);
    expect(screen.getByTestId('manage')).toBeInTheDocument();
  });

  it('renders wallet panel when isWalletOpen', () => {
    render(<RadioPanels {...baseProps} isWalletOpen={true} isChannelListOpen={false} />);
    expect(screen.getByTestId('wallet')).toBeInTheDocument();
  });

  it('renders roip panel when isRoipOpen', () => {
    render(<RadioPanels {...baseProps} isRoipOpen={true} isChannelListOpen={false} />);
    expect(screen.getByTestId('roip')).toBeInTheDocument();
  });

  it('renders chat panel when isChatOpen', () => {
    render(<RadioPanels {...baseProps} isChatOpen={true} isChannelListOpen={false} />);
    expect(screen.getByTestId('chat')).toBeInTheDocument();
  });

  it('renders queue panel when isQueueOpen', () => {
    render(<RadioPanels {...baseProps} isQueueOpen={true} isChannelListOpen={false} />);
    expect(screen.getByTestId('queue')).toBeInTheDocument();
  });

  it('renders private panel when isPrivateOpen', () => {
    render(<RadioPanels {...baseProps} isPrivateOpen={true} isChannelListOpen={false} />);
    expect(screen.getByTestId('private')).toBeInTheDocument();
  });

  it('renders settings panel when isSettingsOpen', async () => {
    render(<RadioPanels {...baseProps} isSettingsOpen={true} isChannelListOpen={false} />);
    expect(await screen.findByTestId('settings')).toBeInTheDocument();
  });

  it('renders channel list + feedback by default', () => {
    render(<RadioPanels {...baseProps} isChannelListOpen={true} />);
    expect(screen.getByTestId('channellist')).toBeInTheDocument();
    expect(screen.getByTestId('feedback')).toBeInTheDocument();
  });
});
