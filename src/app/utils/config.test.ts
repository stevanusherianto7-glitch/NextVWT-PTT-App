import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockOrder: any = vi.fn(() => Promise.resolve({ data: [], error: null }));
const mockSelect: any = vi.fn(() => ({ order: mockOrder }));
const mockFrom: any = vi.fn(() => ({ select: mockSelect }));

vi.mock('@/app/utils/supabase', () => ({
  getSupabase: vi.fn(() => Promise.resolve({ from: mockFrom })),
  supabase: null,
}));

import {
  BRAND,
  USE_SFU,
  NO_REACTION_CHANNELS,
  CHANNELS,
  VISUAL_CONFIG,
  AUDIO_CONFIG,
  UI_MESSAGES,
  fetchChannels,
} from './config';

describe('config', () => {
  it('BRAND has expected identity fields', () => {
    expect(BRAND.name).toBe('NextVWT');
    expect(BRAND.supabaseRoomPrefix).toBe('ptt-room-');
    expect(BRAND.defaultChannel).toBe(1);
    expect(BRAND.isolatedChannels).toContain(100);
  });

  it('simulatedUserOffset is 0 in PROD, 125 otherwise', () => {
    expect(BRAND.simulatedUserOffset).toBe(125);
  });

  it('USE_SFU reflects BRAND.livekitUrl (empty in test -> false)', () => {
    expect(BRAND.livekitUrl).toBe('');
    expect(USE_SFU).toBe(false);
  });

  it('NO_REACTION_CHANNELS includes 0 and 100', () => {
    expect(NO_REACTION_CHANNELS.has(0)).toBe(true);
    expect(NO_REACTION_CHANNELS.has(100)).toBe(true);
  });

  it('CHANNELS has 300 entries and channel 100 exists', () => {
    expect(CHANNELS.length).toBe(300);
    expect(CHANNELS.find((c) => c.number === 100)).toBeTruthy();
  });

  it('VISUAL_CONFIG / AUDIO_CONFIG / UI_MESSAGES present', () => {
    expect(VISUAL_CONFIG.colors.primary).toBe('#00C853');
    expect(AUDIO_CONFIG.codec.type).toBe('opus');
    expect(UI_MESSAGES.errors.microphoneAccessDenied).toContain('mikrofon');
  });

  describe('fetchChannels', () => {
    beforeEach(() => {
      mockFrom.mockClear();
      mockSelect.mockClear();
      mockOrder.mockClear();
    });

    it('merges Supabase data over static channels', async () => {
      mockOrder.mockResolvedValueOnce({
        data: [{ number: 5, name: 'UPDATED', type: 'red', is_restricted: false, info: null }],
        error: null,
      });
      const result = await fetchChannels();
      const ch5 = result.find((c) => c.number === 5);
      expect(ch5?.name).toBe('UPDATED');
      expect(ch5?.type).toBe('red');
    });

    it('falls back to CHANNELS when Supabase returns error', async () => {
      mockOrder.mockResolvedValueOnce({ data: null, error: new Error('boom') });
      const result = await fetchChannels();
      expect(result.length).toBe(300);
    });

    it('falls back to CHANNELS when from() throws', async () => {
      mockFrom.mockImplementationOnce(() => {
        throw new Error('network');
      });
      const result = await fetchChannels();
      expect(result.length).toBe(300);
    });
  });
});
