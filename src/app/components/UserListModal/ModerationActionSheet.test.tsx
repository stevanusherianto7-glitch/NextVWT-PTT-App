import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModerationActionSheet } from './ModerationActionSheet';

const profile = {
  userId: 'u2',
  displayName: 'Budi',
  callSign: 'BD2',
  location: 'Jakarta',
  avatarColor: '#fff',
  avatarUrl: '',
  role: 'guest' as const,
  isMuted: false,
  isControlled: false,
  isWait: false,
  isWaitControlled: false,
};

describe('ModerationActionSheet', () => {
  it('renders profile info', () => {
    render(
      <ModerationActionSheet
        activeZoomedAvatar={profile as any}
        localRole="sys_admin"
        canModerateTarget={false}
        onClose={vi.fn()}
        handleUpdateStatus={vi.fn()}
        handleUpdateRole={vi.fn()}
      />
    );
    expect(screen.getByText('Budi')).toBeInTheDocument();
    expect(screen.getByText('BD2')).toBeInTheDocument();
  });

  it('hides moderation panel when cannot moderate', () => {
    render(
      <ModerationActionSheet
        activeZoomedAvatar={profile as any}
        localRole="guest"
        canModerateTarget={false}
        onClose={vi.fn()}
        handleUpdateStatus={vi.fn()}
        handleUpdateRole={vi.fn()}
      />
    );
    expect(screen.queryByText('Mode Moderasi Jalur')).not.toBeInTheDocument();
  });

  it('shows moderation panel and calls handleUpdateStatus on Voice', () => {
    const handleUpdateStatus = vi.fn();
    render(
      <ModerationActionSheet
        activeZoomedAvatar={profile as any}
        localRole="sys_admin"
        canModerateTarget={true}
        onClose={vi.fn()}
        handleUpdateStatus={handleUpdateStatus}
        handleUpdateRole={vi.fn()}
      />
    );
    expect(screen.getByText('Mode Moderasi Jalur')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Voice'));
    expect(handleUpdateStatus).toHaveBeenCalledWith('u2', 'normal');
  });

  it('calls onClose when backdrop clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <ModerationActionSheet
        activeZoomedAvatar={profile as any}
        localRole="sys_admin"
        canModerateTarget={true}
        onClose={onClose}
        handleUpdateStatus={vi.fn()}
        handleUpdateRole={vi.fn()}
      />
    );
    fireEvent.click(container.firstChild as HTMLElement);
    expect(onClose).toHaveBeenCalled();
  });
});
