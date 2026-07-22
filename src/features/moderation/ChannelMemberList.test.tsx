import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('./useModerationActions', () => ({
  useModerationActions: vi.fn(),
}));
vi.mock('./permissions', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    getGlobalRole: (userId: string) => (userId === 'noc_global' ? 'noc' : null),
  };
});

const mockGetSupabase = vi.fn();
vi.mock('../../app/utils/supabase', () => ({
  getSupabase: () => mockGetSupabase(),
}));

import { ChannelMemberList } from './ChannelMemberList';
import { useModerationActions } from './useModerationActions';
import { usePTTStore } from '../../app/store/usePTTStore';

describe('ChannelMemberList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useModerationActions as any).mockReturnValue({
      setUserRole: vi.fn().mockResolvedValue(undefined),
      muteUser: vi.fn(),
      unmuteUser: vi.fn(),
      blockPTT: vi.fn(),
      unblockPTT: vi.fn(),
      blockChat: vi.fn(),
      unblockChat: vi.fn(),
      kickUser: vi.fn(),
      banUser: vi.fn(),
      unbanUser: vi.fn(),
    });
    mockGetSupabase.mockResolvedValue({
      from: () => ({
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
      }),
      removeChannel: () => Promise.resolve(),
      channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    });
    usePTTStore.setState({
      activeUsers: [
        { userId: 'u1', displayName: 'Andi', callSign: 'AN1', avatarUrl: '' },
        { userId: 'noc_global', displayName: 'NOC', callSign: 'NOC-01', avatarUrl: '' },
      ] as any,
    });
  });

  it('renders online members (excludes NOC)', async () => {
    render(<ChannelMemberList roomId="ptt-room-100" actorRole="noc" actorId="admin" />);
    expect(await screen.findByText('Andi')).toBeInTheDocument();
    expect(screen.queryByText('NOC')).not.toBeInTheDocument();
  });

  it('filters members by search', async () => {
    render(<ChannelMemberList roomId="ptt-room-100" actorRole="noc" actorId="admin" />);
    await screen.findByText('Andi');
    fireEvent.change(screen.getByPlaceholderText(/Cari nama atau callsign/i), {
      target: { value: 'andi' },
    });
    expect(screen.getByText('Andi')).toBeInTheDocument();
  });

  it('shows add member form for role manager and adds', async () => {
    const setUserRole = vi.fn().mockResolvedValue(undefined);
    (useModerationActions as any).mockReturnValue({
      setUserRole,
      muteUser: vi.fn(),
      unmuteUser: vi.fn(),
      blockPTT: vi.fn(),
      unblockPTT: vi.fn(),
      blockChat: vi.fn(),
      unblockChat: vi.fn(),
      kickUser: vi.fn(),
      banUser: vi.fn(),
      unbanUser: vi.fn(),
    });
    render(<ChannelMemberList roomId="ptt-room-100" actorRole="noc" actorId="admin" />);
    await screen.findByText('Andi');
    fireEvent.click(screen.getByTitle('Tambah Warga Tetap'));
    fireEvent.change(screen.getByPlaceholderText(/ID User/i), { target: { value: 'XY9' } });
    fireEvent.change(screen.getByPlaceholderText(/Nama User/i), { target: { value: 'X User' } });
    fireEvent.click(screen.getByText('Tambahkan'));
    await waitFor(() => expect(setUserRole).toHaveBeenCalled());
  });

  it('shows banned tab for ban-capable role', async () => {
    render(<ChannelMemberList roomId="ptt-room-100" actorRole="noc" actorId="admin" />);
    await screen.findByText('Andi');
    fireEvent.click(screen.getByText(/^Banned/));
    expect(await screen.findByText(/Tidak ada pengguna yang di-ban/i)).toBeInTheDocument();
  });
});
