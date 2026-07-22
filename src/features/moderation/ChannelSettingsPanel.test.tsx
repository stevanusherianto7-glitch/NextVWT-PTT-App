import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('./useChannelSettings', () => ({
  useChannelSettings: vi.fn(),
}));
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { ChannelSettingsPanel } from './ChannelSettingsPanel';
import { useChannelSettings } from './useChannelSettings';

function mockSettings(settings: any, loading = false) {
  (useChannelSettings as any).mockReturnValue({
    settings,
    loading,
    updateSettings: vi.fn().mockResolvedValue(undefined),
  });
}

const fullSettings = {
  channel_name: 'Test',
  channel_description: 'Program',
  channel_mode: 'public',
  theme_key: 'green-crystal',
  allow_guest_ptt: true,
  ptt_cooldown_seconds: 2,
  guest_max_ptt_seconds: 10,
  member_max_ptt_seconds: 60,
  chat_enabled: true,
  allow_guest_chat: true,
  slow_mode_seconds: 5,
  reaction_enabled: true,
  allow_guest_reaction: true,
  karaoke_queue_enabled: true,
  allow_guest_queue: true,
};

describe('ChannelSettingsPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows loading state', () => {
    mockSettings(null, true);
    render(<ChannelSettingsPanel roomId="ptt-room-100" actorRole="noc" />);
    expect(screen.getByText(/Memuat setelan channel/i)).toBeInTheDocument();
  });

  it('shows error when no settings', () => {
    mockSettings(null, false);
    render(<ChannelSettingsPanel roomId="ptt-room-100" actorRole="noc" />);
    expect(screen.getByText(/Gagal memuat setelan/i)).toBeInTheDocument();
  });

  it('renders settings + allows toggle for noc', async () => {
    const { toast } = await import('sonner');
    const update = vi.fn().mockResolvedValue(undefined);
    (useChannelSettings as any).mockReturnValue({
      settings: fullSettings,
      loading: false,
      updateSettings: update,
    });
    render(<ChannelSettingsPanel roomId="ptt-room-100" actorRole="noc" />);
    expect(screen.getByText(/ATURAN SUARA \/ PTT/i)).toBeInTheDocument();
    // theme perm for noc
    expect(screen.getByText(/TEMA SKIN CHANNEL/i)).toBeInTheDocument();
    const ptt = screen.getByLabelText(/Izinkan Tamu Bicara \(PTT\)/i) as HTMLInputElement;
    fireEvent.click(ptt);
    await waitFor(() => expect(update).toHaveBeenCalledWith({ allow_guest_ptt: false }));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('guest role has no settings perm (toggles disabled)', () => {
    mockSettings(fullSettings, false);
    render(<ChannelSettingsPanel roomId="ptt-room-100" actorRole="guest" />);
    const ptt = screen.getByLabelText(/Izinkan Tamu Bicara \(PTT\)/i) as HTMLInputElement;
    expect(ptt.disabled).toBe(true);
    // theme panel hidden for guest
    expect(screen.queryByText(/TEMA SKIN CHANNEL/i)).not.toBeInTheDocument();
  });
});
