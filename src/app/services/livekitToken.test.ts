import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../app/utils/supabase', () => {
  return {
    getSupabase: vi.fn(() => Promise.resolve((globalThis as any).__sb)),
  };
});

import { fetchLiveKitToken } from './livekitToken';

describe('livekitToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).__sb = {
      functions: {
        invoke: vi.fn(),
      },
    };
  });

  it('requests token from edge function with channel', async () => {
    const invoke = vi.fn(() =>
      Promise.resolve({
        data: { token: 'tk_123', room: 'ptt-room-5', identity: 'u1' },
        error: null,
      })
    );
    (globalThis as any).__sb.functions.invoke = invoke;

    const res = await fetchLiveKitToken(5);
    expect(invoke).toHaveBeenCalledWith('livekit-token', { body: { channel: 5 } });
    expect(res.token).toBe('tk_123');
    expect(res.room).toBe('ptt-room-5');
  });

  it('throws when edge function returns error', async () => {
    (globalThis as any).__sb.functions.invoke = vi.fn(() =>
      Promise.resolve({ data: null, error: { message: 'boom' } })
    );
    await expect(fetchLiveKitToken(5)).rejects.toThrow(/Gagal mint token LiveKit/);
  });

  it('throws when token/room missing in response', async () => {
    (globalThis as any).__sb.functions.invoke = vi.fn(() =>
      Promise.resolve({ data: { identity: 'u1' }, error: null })
    );
    await expect(fetchLiveKitToken(5)).rejects.toThrow(/tidak valid/);
  });
});
