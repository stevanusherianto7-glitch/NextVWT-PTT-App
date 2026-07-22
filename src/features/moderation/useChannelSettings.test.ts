import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useChannelSettings } from './useChannelSettings';
import { usePTTStore } from '../../app/store/usePTTStore';

function makeSupabase(overrides: Record<string, unknown> = {}) {
  const channelCallbacks: Record<string, (payload: unknown) => void> = {};
  const mockChannel = {
    on: vi.fn((_evt: string, _cfg: unknown, cb: (payload: unknown) => void) => {
      channelCallbacks['postgres_changes'] = cb;
      return mockChannel;
    }),
    subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
    unsubscribe: vi.fn(),
  };
  const mockFrom = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(() =>
          Promise.resolve(overrides.channelSettings ?? { data: null, error: null })
        ),
      })),
    })),
  }));
  const mockSupabase = {
    _callbacks: channelCallbacks,
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
    from: mockFrom,
    functions: {
      invoke: vi.fn(() => Promise.resolve(overrides.functions ?? { data: null, error: null })),
    },
  };
  return { mockSupabase, channelCallbacks };
}

vi.mock('../../app/utils/supabase', () => {
  return { getSupabase: vi.fn(() => Promise.resolve((globalThis as any).__sb)) };
});

describe('useChannelSettings', () => {
  let ctx: ReturnType<typeof makeSupabase>;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    usePTTStore.setState({ userId: 'actor-1' });
    ctx = makeSupabase();
    (globalThis as any).__sb = ctx.mockSupabase;
  });

  it('returns null settings with no loading when roomId empty', async () => {
    const { result } = renderHook(() => useChannelSettings(''));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.settings).toBeNull();
  });

  it('loads existing settings from DB', async () => {
    const existing = {
      room_id: 'room-9',
      channel_name: 'Test',
      channel_mode: 'public',
      theme_key: 'green-crystal',
      allow_guest_ptt: true,
      allow_guest_chat: true,
      allow_guest_reaction: true,
      allow_guest_queue: false,
      allow_guest_song_request: true,
      chat_enabled: true,
      reaction_enabled: true,
      karaoke_queue_enabled: true,
      song_request_enabled: true,
      ptt_cooldown_seconds: 2,
      guest_max_ptt_seconds: 15,
      member_max_ptt_seconds: 60,
      slow_mode_seconds: 0,
    };
    ctx = makeSupabase({ channelSettings: { data: existing, error: null } });
    (globalThis as any).__sb = ctx.mockSupabase;

    const { result } = renderHook(() => useChannelSettings('room-9'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.settings?.channel_name).toBe('Test');
    expect(ctx.mockSupabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('creates defaults via Edge Function when no settings exist', async () => {
    ctx = makeSupabase({
      channelSettings: { data: null, error: null },
      functions: { data: { result: null }, error: null },
    });
    (globalThis as any).__sb = ctx.mockSupabase;

    const { result } = renderHook(() => useChannelSettings('room-new', 'New Channel'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(ctx.mockSupabase.functions.invoke).toHaveBeenCalledWith(
      'moderate-channel',
      expect.objectContaining({ body: expect.objectContaining({ action: 'UPDATE_SETTINGS' }) })
    );
    expect(result.current.settings?.channel_name).toBe('New Channel');
    expect(result.current.settings?.allow_guest_ptt).toBe(true);
  });

  it('updateSettings does optimistic update + invokes edge fn', async () => {
    const existing = {
      room_id: 'room-7',
      channel_name: 'Editable',
      channel_mode: 'public',
      theme_key: 'green-crystal',
      allow_guest_ptt: true,
      allow_guest_chat: true,
      allow_guest_reaction: true,
      allow_guest_queue: false,
      allow_guest_song_request: true,
      chat_enabled: true,
      reaction_enabled: true,
      karaoke_queue_enabled: true,
      song_request_enabled: true,
      ptt_cooldown_seconds: 2,
      guest_max_ptt_seconds: 15,
      member_max_ptt_seconds: 60,
      slow_mode_seconds: 0,
    };
    ctx = makeSupabase({ channelSettings: { data: existing, error: null } });
    (globalThis as any).__sb = ctx.mockSupabase;

    const { result } = renderHook(() => useChannelSettings('room-7'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateSettings({ chat_enabled: false });
    });

    expect(result.current.settings?.chat_enabled).toBe(false);
    expect(ctx.mockSupabase.functions.invoke).toHaveBeenCalledWith(
      'moderate-channel',
      expect.objectContaining({ body: expect.objectContaining({ action: 'UPDATE_SETTINGS' }) })
    );
  });

  it('reacts to realtime DELETE by clearing settings', async () => {
    const existing = {
      room_id: 'room-8',
      channel_name: 'Deletable',
      channel_mode: 'public',
      theme_key: 'green-crystal',
      allow_guest_ptt: true,
      allow_guest_chat: true,
      allow_guest_reaction: true,
      allow_guest_queue: false,
      allow_guest_song_request: true,
      chat_enabled: true,
      reaction_enabled: true,
      karaoke_queue_enabled: true,
      song_request_enabled: true,
      ptt_cooldown_seconds: 2,
      guest_max_ptt_seconds: 15,
      member_max_ptt_seconds: 60,
      slow_mode_seconds: 0,
    };
    ctx = makeSupabase({ channelSettings: { data: existing, error: null } });
    (globalThis as any).__sb = ctx.mockSupabase;

    const { result } = renderHook(() => useChannelSettings('room-8'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.settings?.channel_name).toBe('Deletable');

    act(() => {
      ctx.channelCallbacks['postgres_changes']({ eventType: 'DELETE', new: null, old: {} });
    });

    expect(result.current.settings).toBeNull();
  });
});
