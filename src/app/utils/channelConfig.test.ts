import { describe, it, expect, vi, beforeEach } from 'vitest';

const fromMock = vi.fn();
vi.mock('./supabase', () => ({
  getSupabase: async () => ({ from: fromMock }),
}));

import { CHANNELS, fetchChannels } from './channelConfig';

describe('channelConfig', () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it('CHANNELS has 300 entries sorted with 100 near front', () => {
    expect(CHANNELS.length).toBe(300);
    // channel 100 should sort before channel 1
    const idx100 = CHANNELS.findIndex((c) => c.number === 100);
    const idx1 = CHANNELS.findIndex((c) => c.number === 1);
    expect(idx100).toBeLessThan(idx1);
  });

  it('fallback to static CHANNELS when query errors', async () => {
    fromMock.mockReturnValue({
      select: () => ({
        order: () => ({ data: null, error: new Error('boom') }),
      }),
    });
    const result = await fetchChannels();
    expect(result.length).toBe(300);
  });

  it('merges DB channels over static fallback', async () => {
    fromMock.mockReturnValue({
      select: () => ({
        order: () => ({
          data: [{ number: 1, name: 'DB CH1', type: 'red', is_restricted: false, info: null }],
          error: null,
        }),
      }),
    });
    const result = await fetchChannels();
    const ch1 = result.find((c) => c.number === 1);
    expect(ch1?.name).toBe('DB CH1');
    expect(ch1?.type).toBe('red');
  });

  it('normalizes unknown type to gray', async () => {
    fromMock.mockReturnValue({
      select: () => ({
        order: () => ({
          data: [{ number: 2, name: 'X', type: 'banana', is_restricted: false, info: null }],
          error: null,
        }),
      }),
    });
    const result = await fetchChannels();
    const ch2 = result.find((c) => c.number === 2);
    expect(ch2?.type).toBe('gray');
  });
});
