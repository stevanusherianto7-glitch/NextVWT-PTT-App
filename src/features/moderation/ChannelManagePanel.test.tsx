import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('./useChannelRole', () => ({
  useChannelRole: vi.fn(),
}));
vi.mock('./useChannelSettings', () => ({
  useChannelSettings: vi.fn(),
}));
vi.mock('./ChannelMemberList', () => ({
  ChannelMemberList: () => <div data-testid="members">MEMBERS</div>,
}));
vi.mock('./ChannelSettingsPanel', () => ({
  ChannelSettingsPanel: () => <div data-testid="settings">SETTINGS</div>,
}));
vi.mock('./ModerationLogPanel', () => ({
  ModerationLogPanel: () => <div data-testid="logs">LOGS</div>,
}));

import { ChannelManagePanel } from './ChannelManagePanel';
import { useChannelRole } from './useChannelRole';
import { useChannelSettings } from './useChannelSettings';

function setRole(role: string, status = 'active') {
  (useChannelRole as any).mockReturnValue({
    role,
    status,
    loading: false,
  });
  (useChannelSettings as any).mockReturnValue({
    settings: {
      channel_name: 'Test CH',
      channel_description: 'desc',
      channel_mode: 'public',
      theme_key: 'emerald',
      pjc_user_id: 'admin_vwt',
    },
    loading: false,
    updateSettings: vi.fn(),
  });
}

describe('ChannelManagePanel', () => {
  it('shows loading state', () => {
    (useChannelRole as any).mockReturnValue({ role: 'guest', status: 'active', loading: true });
    (useChannelSettings as any).mockReturnValue({
      settings: null,
      loading: true,
      updateSettings: vi.fn(),
    });
    render(<ChannelManagePanel roomId="ptt-room-100" userId="u1" onClose={vi.fn()} />);
    expect(screen.getByText(/Mengamankan koneksi/i)).toBeInTheDocument();
  });

  it('guest sees only INFO tab (no members/settings/logs)', async () => {
    setRole('guest');
    render(<ChannelManagePanel roomId="ptt-room-100" userId="u1" onClose={vi.fn()} />);
    expect(screen.getByText('INFO')).toBeInTheDocument();
    expect(screen.queryByText('ANGGOTA')).not.toBeInTheDocument();
    expect(screen.getByText(/Tamu biasa/i)).toBeInTheDocument();
  });

  it('noc sees all tabs and can open members/settings/logs', async () => {
    setRole('noc');
    render(<ChannelManagePanel roomId="ptt-room-100" userId="u1" onClose={vi.fn()} />);
    expect(screen.getByText('ANGGOTA')).toBeInTheDocument();
    expect(screen.getByText('SETELAN')).toBeInTheDocument();
    expect(screen.getByText('LOG')).toBeInTheDocument();
    fireEvent.click(screen.getByText('ANGGOTA'));
    expect(await screen.findByTestId('members')).toBeInTheDocument();
    fireEvent.click(screen.getByText('SETELAN'));
    expect(await screen.findByTestId('settings')).toBeInTheDocument();
    fireEvent.click(screen.getByText('LOG'));
    expect(await screen.findByTestId('logs')).toBeInTheDocument();
  });

  it('operator sees INFO only (operator gated out of admin tabs)', async () => {
    setRole('operator');
    render(<ChannelManagePanel roomId="ptt-room-100" userId="u1" onClose={vi.fn()} />);
    expect(screen.getByText('INFO')).toBeInTheDocument();
    expect(screen.queryByText('ANGGOTA')).not.toBeInTheDocument();
    expect(screen.getByText(/Operator Otomatis/i)).toBeInTheDocument();
  });

  it('calls onClose', () => {
    setRole('guest');
    const onClose = vi.fn();
    render(<ChannelManagePanel roomId="ptt-room-100" userId="u1" onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Tutup'));
    expect(onClose).toHaveBeenCalled();
  });
});
