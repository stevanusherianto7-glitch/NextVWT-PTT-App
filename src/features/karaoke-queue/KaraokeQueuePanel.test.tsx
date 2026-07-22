import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../moderation/useChannelRole', () => ({
  useChannelRole: vi.fn(),
}));
vi.mock('../moderation/useChannelSettings', () => ({
  useChannelSettings: vi.fn(),
}));

const mockGetSupabase = vi.fn();
vi.mock('../../app/utils/supabase', () => ({
  getSupabase: () => mockGetSupabase(),
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { KaraokeQueuePanel } from './KaraokeQueuePanel';
import { useChannelRole } from '../moderation/useChannelRole';
import { useChannelSettings } from '../moderation/useChannelSettings';
import { usePTTStore } from '../../app/store/usePTTStore';

describe('KaraokeQueuePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useChannelSettings as any).mockReturnValue({
      settings: { karaoke_queue_enabled: true, allow_guest_queue: true },
    });
    usePTTStore.setState({
      channelNumber: 100,
      userId: 'u1',
      infoText: 'Singer',
      customPhotoUrl: '',
      profilePhotoOption: 'none' as 'google' | 'custom',
      user: null,
    });
  });

  function mockRole(role: string) {
    (useChannelRole as any).mockReturnValue({ role, loading: false });
  }

  it('shows loading then empty state', async () => {
    mockRole('guest');
    mockGetSupabase.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({ in: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
        }),
      }),
      removeChannel: () => Promise.resolve(),
      channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    });
    render(<KaraokeQueuePanel onClose={vi.fn()} />);
    expect(screen.getByText(/Memuat antrean/i)).toBeInTheDocument();
    expect(await screen.findByText(/Belum ada antrean lagu/i)).toBeInTheDocument();
  });

  it('guest cannot join when guest queue disabled', async () => {
    (useChannelSettings as any).mockReturnValue({
      settings: { karaoke_queue_enabled: true, allow_guest_queue: false },
    });
    mockRole('guest');
    mockGetSupabase.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({ in: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
        }),
      }),
      removeChannel: () => Promise.resolve(),
      channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    });
    render(<KaraokeQueuePanel onClose={vi.fn()} />);
    await screen.findByText(/Belum ada antrean lagu/i);
    expect(screen.getByText(/Tamu tidak diizinkan masuk antrean/i)).toBeInTheDocument();
  });

  it('shows join form for member', async () => {
    mockRole('operator');
    mockGetSupabase.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({ in: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
        }),
      }),
      removeChannel: () => Promise.resolve(),
      channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    });
    render(<KaraokeQueuePanel onClose={vi.fn()} />);
    await screen.findByText(/Belum ada antrean lagu/i);
    expect(screen.getByPlaceholderText(/Ketik judul lagu/i)).toBeInTheDocument();
  });
});
