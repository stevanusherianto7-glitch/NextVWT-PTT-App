import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { usePTTStore } from '../store/usePTTStore';

const insertMock = vi.fn(() => Promise.resolve({ error: null }));
vi.mock('../utils/supabase', () => ({
  getSupabase: vi.fn(() => Promise.resolve((globalThis as any).__sb)),
}));

import { UserListModal } from './UserListModal';

const users = [
  { userId: 'u1', displayName: 'Andi', callSign: 'AND1', location: 'JKT' },
  { userId: 'u2', displayName: 'Budi', callSign: 'BUD2', location: 'BDG' },
];

describe('UserListModal', () => {
  beforeEach(() => {
    (globalThis as any).__sb = {
      from: () => ({ insert: insertMock }),
    };
    insertMock.mockClear();
    localStorage.clear();
    usePTTStore.setState({
      userId: 'u1',
      user: null,
      infoText: '',
      callSign: 'AND1',
      isTransmitting: false,
      activeTransmitter: null,
    });
  });

  it('renders user list', () => {
    render(<UserListModal channel={1} channelName="Test" users={users as any} onClose={vi.fn()} />);
    expect(screen.getByText('Andi')).toBeInTheDocument();
    expect(screen.getByText('Budi')).toBeInTheDocument();
  });

  it('shows empty state when no users', () => {
    render(<UserListModal channel={1} channelName="Test" users={[]} onClose={vi.fn()} />);
    expect(screen.getByText(/Tidak ada pengguna/i)).toBeInTheDocument();
  });

  it('opens zoom modal and mutes target (localStorage + broadcast)', async () => {
    localStorage.setItem('channel-role:ptt-room-1:u1', 'sys_admin');
    render(<UserListModal channel={1} channelName="Test" users={users as any} onClose={vi.fn()} />);
    const budi = screen.getByText('Budi');
    fireEvent.click(budi);
    const muteBtn = await screen.findByText('Silent');
    fireEvent.click(muteBtn);
    await waitFor(() => expect(localStorage.getItem('channel-status:ptt-room-1:u2')).toBe('muted'));
    expect(insertMock).toHaveBeenCalled();
  });
});
