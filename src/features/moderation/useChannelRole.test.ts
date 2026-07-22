import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useChannelRole } from './useChannelRole';
import { usePTTStore } from '../../app/store/usePTTStore';

// ── Supabase mock ───────────────────────────────────────────────────────────
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
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve(overrides.channelRoles ?? { data: null, error: null })
          ),
        })),
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
  return { mockSupabase, channelCallbacks, mockFrom };
}

vi.mock('../../app/utils/supabase', () => {
  return { getSupabase: vi.fn(() => Promise.resolve((globalThis as any).__sb)) };
});

describe('useChannelRole', () => {
  let ctx: ReturnType<typeof makeSupabase>;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    usePTTStore.setState({ myChannelRole: 'guest', myChannelStatus: 'normal' });
    ctx = makeSupabase();
    (globalThis as any).__sb = ctx.mockSupabase;
  });

  it('returns guest/active with no loading when roomId or userId empty', async () => {
    const { result } = renderHook(() => useChannelRole('', ''));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBe('guest');
    expect(result.current.status).toBe('active');
  });

  it('loads role from DB when no local override', async () => {
    ctx = makeSupabase({
      channelRoles: { data: { role: 'operator', status: 'muted' }, error: null },
    });
    (globalThis as any).__sb = ctx.mockSupabase;

    const { result } = renderHook(() => useChannelRole('room-1', 'user-A'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBe('operator');
    expect(result.current.status).toBe('muted');
    // DB role written to localStorage
    expect(localStorage.getItem('channel-role:room-1:user-A')).toBe('operator');
  });

  it('prefers local override over DB role', async () => {
    localStorage.setItem('channel-role:room-2:user-B', 'sys_admin');
    ctx = makeSupabase({
      channelRoles: { data: { role: 'guest', status: 'active' }, error: null },
    });
    (globalThis as any).__sb = ctx.mockSupabase;

    const { result } = renderHook(() => useChannelRole('room-2', 'user-B'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBe('sys_admin');
  });

  it('reacts to realtime INSERT for this user and bridges to PTT store', async () => {
    const { result } = renderHook(() => useChannelRole('room-3', 'user-C'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      ctx.channelCallbacks['postgres_changes']({
        eventType: 'INSERT',
        new: { user_id: 'user-C', role: 'pjc', status: 'ptt_blocked' },
        old: {},
      });
    });

    expect(result.current.role).toBe('pjc');
    expect(result.current.status).toBe('ptt_blocked');
    expect(usePTTStore.getState().myChannelRole).toBe('pjc');
    expect(usePTTStore.getState().myChannelStatus).toBe('ptt_blocked');
  });

  it('reacts to realtime DELETE by resetting to guest', async () => {
    ctx = makeSupabase({
      channelRoles: { data: { role: 'operator', status: 'active' }, error: null },
    });
    (globalThis as any).__sb = ctx.mockSupabase;

    const { result } = renderHook(() => useChannelRole('room-4', 'user-D'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBe('operator');

    act(() => {
      ctx.channelCallbacks['postgres_changes']({
        eventType: 'DELETE',
        new: null,
        old: { user_id: 'user-D' },
      });
    });

    expect(result.current.role).toBe('guest');
    expect(result.current.status).toBe('active');
    expect(localStorage.getItem('channel-role:room-4:user-D')).toBeNull();
  });
});
