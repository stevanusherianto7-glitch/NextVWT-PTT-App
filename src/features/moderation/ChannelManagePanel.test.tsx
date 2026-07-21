import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChannelManagePanel } from './ChannelManagePanel';

// ── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock('./ChannelMemberList', () => ({
  ChannelMemberList: () => <div data-testid="member-list">member-list</div>,
}));
vi.mock('./ChannelSettingsPanel', () => ({
  ChannelSettingsPanel: () => <div data-testid="settings-panel">settings-panel</div>,
}));
vi.mock('./ModerationLogPanel', () => ({
  ModerationLogPanel: () => <div data-testid="logs-panel">logs-panel</div>,
}));

const roleRef = vi.hoisted(() => ({ role: 'noc' as 'noc' | 'operator', status: 'active' as const }));
vi.mock('./useChannelRole', () => ({
  useChannelRole: () => ({ role: roleRef.role, status: roleRef.status, loading: false }),
}));
vi.mock('./useChannelSettings', () => ({
  useChannelSettings: () => ({
    settings: {
      channel_name: 'Test Channel',
      channel_description: 'desc',
      channel_mode: 'public',
      theme_key: 'default',
      pjc_user_id: 'pjc-001',
    },
    loading: false,
    updateSettings: vi.fn(),
  }),
}));
vi.mock('./moderation.css', () => ({}));

const baseProps = {
  roomId: 'ptt-room-100',
  userId: 'user-1',
  initialChannelName: 'Test Channel',
  onClose: vi.fn(),
  onOpenPrivate: vi.fn(),
};

describe('ChannelManagePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    roleRef.role = 'noc';
    roleRef.status = 'active';
  });

  it('renders header + INFO tab for an authorized role (noc)', () => {
    render(<ChannelManagePanel {...baseProps} />);
    expect(screen.getByText('Kelola Channel')).toBeInTheDocument();
    expect(screen.getByText('Detail Room / Saluran')).toBeInTheDocument();
  });

  it('authorized role (noc) sees ANGGOTA / SETELAN / LOG tabs', () => {
    render(<ChannelManagePanel {...baseProps} />);
    expect(screen.getByText('ANGGOTA')).toBeInTheDocument();
    expect(screen.getByText('SETELAN')).toBeInTheDocument();
    expect(screen.getByText('LOG')).toBeInTheDocument();
  });

  it('operator role only gets the INFO tab (no members/settings/logs)', () => {
    roleRef.role = 'operator';
    render(<ChannelManagePanel {...baseProps} />);
    expect(screen.queryByText('ANGGOTA')).not.toBeInTheDocument();
    expect(screen.queryByText('SETELAN')).not.toBeInTheDocument();
    expect(screen.queryByText('LOG')).not.toBeInTheDocument();
  });

  it('switching to ANGGOTA tab renders the member list', () => {
    render(<ChannelManagePanel {...baseProps} />);
    fireEvent.click(screen.getByText('ANGGOTA'));
    expect(screen.getByTestId('member-list')).toBeInTheDocument();
  });

  it('switching to SETELAN tab renders the settings panel', () => {
    render(<ChannelManagePanel {...baseProps} />);
    fireEvent.click(screen.getByText('SETELAN'));
    expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
  });

  it('switching to LOG tab renders the logs panel', () => {
    render(<ChannelManagePanel {...baseProps} />);
    fireEvent.click(screen.getByText('LOG'));
    expect(screen.getByTestId('logs-panel')).toBeInTheDocument();
  });

  it('close button invokes onClose', () => {
    render(<ChannelManagePanel {...baseProps} />);
    fireEvent.click(screen.getByLabelText('Tutup'));
    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it('getRoleLabel formats roles correctly', () => {
    render(<ChannelManagePanel {...baseProps} />);
    expect(screen.getByText('N.O.C')).toBeInTheDocument();
    expect(screen.getByText('PJC (PENANGGUNG JAWAB)', { exact: false })).toBeInTheDocument();
  });

  it('shows channel number derived from roomId', () => {
    render(<ChannelManagePanel {...baseProps} />);
    expect(screen.getByText('100')).toBeInTheDocument();
  });
});
