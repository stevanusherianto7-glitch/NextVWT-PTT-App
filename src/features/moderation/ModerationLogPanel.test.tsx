import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockGetSupabase = vi.fn();
vi.mock('../../app/utils/supabase', () => ({
  getSupabase: () => mockGetSupabase(),
}));

import { ModerationLogPanel } from './ModerationLogPanel';

describe('ModerationLogPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSupabase.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
          }),
        }),
      }),
      removeChannel: () => Promise.resolve(),
      channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    });
  });

  it('shows loading then empty state', async () => {
    render(<ModerationLogPanel roomId="ptt-room-100" />);
    expect(screen.getByText(/Memuat log/i)).toBeInTheDocument();
    expect(await screen.findByText(/Belum ada aktivitas moderasi/i)).toBeInTheDocument();
  });

  it('renders logs list', async () => {
    mockGetSupabase.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () =>
                Promise.resolve({
                  data: [
                    {
                      id: '1',
                      room_id: 'ptt-room-100',
                      actor_id: 'actor-123',
                      actor_role: 'noc',
                      target_user_id: 'u-target',
                      action: 'MUTE_USER',
                      detail: { minutes: 15, target_name: 'Budi' },
                      created_at: '2026-07-22T10:00:00Z',
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        }),
      }),
      removeChannel: () => Promise.resolve(),
      channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    });
    render(<ModerationLogPanel roomId="ptt-room-100" />);
    expect(await screen.findByText(/Membungkam Budi/i)).toBeInTheDocument();
  });

  it('refresh button reloads', async () => {
    render(<ModerationLogPanel roomId="ptt-room-100" />);
    await screen.findByText(/Belum ada aktivitas moderasi/i);
    fireEvent.click(screen.getByTitle('Segarkan Log'));
    expect(mockGetSupabase).toHaveBeenCalled();
  });
});
