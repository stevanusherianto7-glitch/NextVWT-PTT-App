import { useState, useEffect } from 'react';
import { useChannelSettings, type ChannelSettings } from './useChannelSettings';
import type { ChannelRole } from './permissions';
import { canPerformAction } from './permissions';
import { Mic, MessageSquare, Smile, Palette, Check, RefreshCw, Sliders } from 'lucide-react';
import { toast } from 'sonner';

interface ChannelSettingsPanelProps {
  roomId: string;
  actorRole: ChannelRole;
}

export function ChannelSettingsPanel({ roomId, actorRole }: ChannelSettingsPanelProps) {
  const { settings, loading, updateSettings } = useChannelSettings(roomId);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [localProgramName, setLocalProgramName] = useState('');

  useEffect(() => {
    if (settings) {
      setLocalProgramName(settings.channel_description || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.channel_description]);

  const hasSettingsPerm = canPerformAction(actorRole, 'MANAGE_SETTINGS');
  const hasThemePerm = canPerformAction(actorRole, 'MANAGE_THEME');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-slate-400 text-sm">
        <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
        Memuat setelan channel...
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center text-red-400 py-8 text-sm">
        Gagal memuat setelan channel atau channel tidak terdaftar.
      </div>
    );
  }

  const handleToggle = async (key: keyof ChannelSettings, value: boolean) => {
    if (!hasSettingsPerm) return;
    try {
      setSaveStatus('saving');
      await updateSettings({ [key]: value });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 1200);
    } catch (err: unknown) {
      const e = err as Error;
      console.error(e);
      toast.error(`Gagal menyimpan: ${e.message || 'Unknown error'}`);
      setSaveStatus('error');
    }
  };

  const handleSelectChange = async (key: keyof ChannelSettings, value: string | number) => {
    if (!hasSettingsPerm) return;
    try {
      setSaveStatus('saving');
      await updateSettings({ [key]: value });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 1200);
    } catch (err: unknown) {
      const e = err as Error;
      console.error(e);
      toast.error(`Gagal menyimpan: ${e.message || 'Unknown error'}`);
      setSaveStatus('error');
    }
  };

  const THEMES = [
    { key: 'green-crystal', label: 'Green Crystal (Default)' },
    { key: 'classic-radio', label: 'Classic Radio' },
    { key: 'dark-premium', label: 'Dark Premium' },
    { key: 'gold-karaoke', label: 'Gold Karaoke' },
    { key: 'aquarium-skin', label: 'Aquarium Skin' },
    { key: 'gaming-neon', label: 'Gaming Neon' },
    { key: 'community-skin', label: 'Community Skin' },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Header and status info */}
      <div className="flex justify-between items-center bg-black/10 p-2 rounded-lg border border-white/5">
        <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
          <Sliders className="h-3.5 w-3.5 text-emerald-400" />
          Konfigurasi Channel
        </span>
        {saveStatus === 'saving' && (
          <span className="text-[10px] text-emerald-400 animate-pulse">Menyimpan...</span>
        )}
        {saveStatus === 'success' && (
          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
            <Check className="h-3 w-3" /> Tersimpan
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="text-[10px] text-red-400">Gagal menyimpan!</span>
        )}
      </div>

      {/* 0. Informasi Program */}
      <div className="moderation-glass-card flex flex-col gap-2">
        <h3 className="text-xs font-bold text-white flex items-center gap-2 pb-1.5 border-b border-white/5">
          <MessageSquare className="h-3.5 w-3.5 text-emerald-400" /> INFORMASI PROGRAM
        </h3>
        <div className="flex flex-col pt-2 pb-1 border-b border-slate-200">
          <div className="setting-info !max-w-full mb-3">
            <span className="setting-label">Nama Program Saat Ini (Marquee)</span>
            <span className="setting-desc">
              Teks ini akan berjalan pada header utama (atas) seluruh pengguna. Kosongkan untuk
              menampilkan teks default.
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Contoh: Bincang Pagi, Karaoke Malam..."
              value={localProgramName}
              onChange={(e) => setLocalProgramName(e.target.value)}
              disabled={!hasSettingsPerm}
              className="w-full bg-black/20 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
            <button
              onClick={() => handleSelectChange('channel_description', localProgramName)}
              disabled={
                !hasSettingsPerm || localProgramName === (settings?.channel_description || '')
              }
              className="w-full px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-md transition-colors"
            >
              Simpan
            </button>
          </div>
        </div>
      </div>

      {/* 1. Pengaturan PTT */}
      <div className="moderation-glass-card flex flex-col gap-2">
        <h3 className="text-xs font-bold text-white flex items-center gap-2 pb-1.5 border-b border-white/5">
          <Mic className="h-3.5 w-3.5 text-emerald-400" /> ATURAN SUARA / PTT
        </h3>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">Izinkan Tamu Bicara (PTT)</span>
            <span className="setting-desc">
              Tamu (guest) diizinkan menekan tombol PTT untuk mentransmisikan suara
            </span>
          </div>
          <input
            type="checkbox"
            title="Izinkan Tamu Bicara (PTT)"
            aria-label="Izinkan Tamu Bicara (PTT)"
            checked={settings.allow_guest_ptt}
            disabled={!hasSettingsPerm}
            onChange={(e) => handleToggle('allow_guest_ptt', e.target.checked)}
            className="w-4 h-4 rounded accent-emerald-500 cursor-pointer disabled:opacity-50"
          />
        </div>

        <div className="flex flex-col pt-2 pb-1 border-b border-slate-200">
          <div className="setting-info !max-w-full mb-3">
            <span className="setting-label">Cooldown PTT (detik)</span>
            <span className="setting-desc">
              Jeda waktu minimum yang harus dipenuhi sebelum boleh berbicara kembali
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 0, label: 'Tanpa Cooldown' },
              { value: 1, label: '1 Detik' },
              { value: 2, label: '2 Detik' },
              { value: 3, label: '3 Detik' },
              { value: 5, label: '5 Detik' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelectChange('ptt_cooldown_seconds', opt.value)}
                disabled={!hasSettingsPerm}
                className={`p-2 rounded-lg border text-xs font-bold transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed ${
                  settings.ptt_cooldown_seconds === opt.value
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col pt-2 pb-1 border-b border-slate-200">
          <div className="setting-info !max-w-full mb-3">
            <span className="setting-label">Durasi Bicara Tamu (detik)</span>
            <span className="setting-desc">Batas durasi maksimum bicara tamu sekali tekan PTT</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 5, label: '5 Detik' },
              { value: 10, label: '10 Detik' },
              { value: 15, label: '15 Detik' },
              { value: 30, label: '30 Detik' },
              { value: 60, label: '60 Detik' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelectChange('guest_max_ptt_seconds', opt.value)}
                disabled={!hasSettingsPerm}
                className={`p-2 rounded-lg border text-xs font-bold transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed ${
                  settings.guest_max_ptt_seconds === opt.value
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col pt-2 pb-1">
          <div className="setting-info !max-w-full mb-3">
            <span className="setting-label">Durasi Bicara Anggota (detik)</span>
            <span className="setting-desc">
              Batas durasi maksimum bicara anggota / operator sekali tekan PTT
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 30, label: '30 Detik' },
              { value: 60, label: '60 Detik (1 Menit)' },
              { value: 120, label: '120 Detik (2 Menit)' },
              { value: 300, label: '300 Detik (5 Menit)' },
              { value: 0, label: 'Tanpa Batas' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelectChange('member_max_ptt_seconds', opt.value)}
                disabled={!hasSettingsPerm}
                className={`p-2 rounded-lg border text-xs font-bold transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed ${
                  settings.member_max_ptt_seconds === opt.value
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Pengaturan Chat */}
      <div className="moderation-glass-card flex flex-col gap-2">
        <h3 className="text-xs font-bold text-white flex items-center gap-2 pb-1.5 border-b border-white/5">
          <MessageSquare className="h-3.5 w-3.5 text-blue-400" /> PENGATURAN CHAT
        </h3>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">Aktifkan Fitur Chat</span>
            <span className="setting-desc">
              Membuka atau menutup kolom chat di dalam channel ini secara keseluruhan
            </span>
          </div>
          <input
            type="checkbox"
            title="Aktifkan Fitur Chat"
            aria-label="Aktifkan Fitur Chat"
            checked={settings.chat_enabled}
            disabled={!hasSettingsPerm}
            onChange={(e) => handleToggle('chat_enabled', e.target.checked)}
            className="w-4 h-4 rounded accent-emerald-500 cursor-pointer disabled:opacity-50"
          />
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">Tamu Diizinkan Chat</span>
            <span className="setting-desc">
              Mengontrol apakah tamu biasa boleh mengirim pesan di chat
            </span>
          </div>
          <input
            type="checkbox"
            title="Tamu Diizinkan Chat"
            aria-label="Tamu Diizinkan Chat"
            checked={settings.allow_guest_chat}
            disabled={!hasSettingsPerm || !settings.chat_enabled}
            onChange={(e) => handleToggle('allow_guest_chat', e.target.checked)}
            className="w-4 h-4 rounded accent-emerald-500 cursor-pointer disabled:opacity-50"
          />
        </div>

        <div className="flex flex-col pt-2 pb-1">
          <div className="setting-info !max-w-full mb-3">
            <span className="setting-label">Slow Mode Chat (detik)</span>
            <span className="setting-desc">
              Jeda waktu antar pesan yang dikirim oleh user biasa
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 0, label: 'Nonaktif (0s)' },
              { value: 3, label: '3 Detik' },
              { value: 5, label: '5 Detik' },
              { value: 10, label: '10 Detik' },
              { value: 30, label: '30 Detik' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSelectChange('slow_mode_seconds', opt.value)}
                disabled={!hasSettingsPerm || !settings.chat_enabled}
                className={`p-2 rounded-lg border text-xs font-bold transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed ${
                  settings.slow_mode_seconds === opt.value
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Pengaturan Reaction & Karaoke */}
      <div className="moderation-glass-card flex flex-col gap-2">
        <h3 className="text-xs font-bold text-white flex items-center gap-2 pb-1.5 border-b border-white/5">
          <Smile className="h-3.5 w-3.5 text-purple-400" /> REACTION & KARAOKE QUEUE
        </h3>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">Aktifkan Reaction Animasi</span>
            <span className="setting-desc">Izinkan emoji reaction melayang di atas stage</span>
          </div>
          <input
            type="checkbox"
            title="Aktifkan Reaction Animasi"
            aria-label="Aktifkan Reaction Animasi"
            checked={settings.reaction_enabled}
            disabled={!hasSettingsPerm}
            onChange={(e) => handleToggle('reaction_enabled', e.target.checked)}
            className="w-4 h-4 rounded accent-emerald-500 cursor-pointer disabled:opacity-50"
          />
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">Tamu Boleh Kirim Reaction</span>
            <span className="setting-desc">Kontrol izin reaction melayang bagi tamu biasa</span>
          </div>
          <input
            type="checkbox"
            title="Tamu Boleh Kirim Reaction"
            aria-label="Tamu Boleh Kirim Reaction"
            checked={settings.allow_guest_reaction}
            disabled={!hasSettingsPerm || !settings.reaction_enabled}
            onChange={(e) => handleToggle('allow_guest_reaction', e.target.checked)}
            className="w-4 h-4 rounded accent-emerald-500 cursor-pointer disabled:opacity-50"
          />
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">Antrian Karaoke Aktif</span>
            <span className="setting-desc">Buka panel antrian karaoke (Queue List)</span>
          </div>
          <input
            type="checkbox"
            title="Antrian Karaoke Aktif"
            aria-label="Antrian Karaoke Aktif"
            checked={settings.karaoke_queue_enabled}
            disabled={!hasSettingsPerm}
            onChange={(e) => handleToggle('karaoke_queue_enabled', e.target.checked)}
            className="w-4 h-4 rounded accent-emerald-500 cursor-pointer disabled:opacity-50"
          />
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-label">Tamu Ikut Antrian Karaoke</span>
            <span className="setting-desc">
              Tamu diizinkan bergabung ke antrian antre panggung karaoke
            </span>
          </div>
          <input
            type="checkbox"
            title="Tamu Ikut Antrian Karaoke"
            aria-label="Tamu Ikut Antrian Karaoke"
            checked={settings.allow_guest_queue}
            disabled={!hasSettingsPerm || !settings.karaoke_queue_enabled}
            onChange={(e) => handleToggle('allow_guest_queue', e.target.checked)}
            className="w-4 h-4 rounded accent-emerald-500 cursor-pointer disabled:opacity-50"
          />
        </div>
      </div>

      {/* 4. Theme Channel */}
      {hasThemePerm && (
        <div className="moderation-glass-card flex flex-col gap-2">
          <h3 className="text-xs font-bold text-white flex items-center gap-2 pb-1.5 border-b border-white/5">
            <Palette className="h-3.5 w-3.5 text-pink-400" /> TEMA SKIN CHANNEL
          </h3>
          <div className="flex flex-col pt-1">
            <div className="setting-info !max-w-full mb-3">
              <span className="setting-label">Pilih Skin Visual</span>
              <span className="setting-desc">
                Mengubah skin/warna tema channel secara visual untuk seluruh pendengar
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => handleSelectChange('theme_key', t.key)}
                  className={`p-2 rounded-lg border text-xs font-bold transition-all text-center ${
                    settings.theme_key === t.key
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-slate-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
