import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../UserListModal', () => ({
  UserListModal: ({ channel, channelName, users }: any) => (
    <div data-testid="userlist-modal">
      CH{channel}-{channelName}-{users.length}
    </div>
  ),
}));

import { UserListOverlay } from './UserListOverlay';

describe('UserListOverlay', () => {
  it('renders UserListModal with props', () => {
    render(
      <UserListOverlay
        isPowerOn={true}
        channel={100}
        channelNameStr="Landing"
        dynamicUserList={['a', 'b'] as any}
        floatingReactions={[]}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByTestId('userlist-modal')).toHaveTextContent('CH100-Landing-2');
  });

  it('renders lion video background when lion reaction present + power on', () => {
    const { container } = render(
      <UserListOverlay
        isPowerOn={true}
        channel={100}
        channelNameStr="Landing"
        dynamicUserList={[]}
        floatingReactions={[{ id: '1', reaction: 'lion' }] as any}
        onClose={vi.fn()}
      />
    );
    expect(container.querySelector('iframe')).toBeInTheDocument();
  });

  it('hides video when power off', () => {
    const { container } = render(
      <UserListOverlay
        isPowerOn={false}
        channel={100}
        channelNameStr="Landing"
        dynamicUserList={[]}
        floatingReactions={[{ id: '1', reaction: 'lion' }] as any}
        onClose={vi.fn()}
      />
    );
    expect(container.querySelector('iframe')).not.toBeInTheDocument();
  });
});
