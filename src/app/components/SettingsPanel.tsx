import { useState, useRef } from 'react';
import { usePTTStore } from '../store/usePTTStore';
import { toast } from 'sonner';

import { PROVINCE_CITIES } from '../data/provinceCities';
import { useChannelRole } from '../../features/moderation/useChannelRole';
import { canPerformAction } from '../../features/moderation/permissions';
import { Shield, ChevronRight } from 'lucide-react';
import { requestBatteryWhitelist } from '../utils/backgroundSurvival';
import vintageMic from '../../assets/vintage_mic.png';

export interface SettingsPanelProps {
  onClose: () => void;
  onOpenModeration?: () => void;
  onOpenWallet?: () => void;
  onOpenRoip?: () => void;
}

export function SettingsPanel({
  onClose,
  onOpenModeration,
  onOpenWallet,
  onOpenRoip,
}: SettingsPanelProps) {
  const {
    infoText,
    locationText,
    showMyPhoto,
    showOtherPhotos,
    showPhotosInList,
    fastClick,
    showModulator,
    showPTT,
    maxQueue,
    audioMode,
    pttSize,
    pttBottom,
    togglePtt,
    pttVolume,
    vibrateOnStart,
    toneOnStartEnd,
    bgActive,
    fullDuplex,
    themeText,
    builtInEcho,
    isKaraokePlayerOpen,
    echoFeedback,
    setKaraokePlayerOpen: setIsKaraokePlayerOpen,
    updateSettings,
    user,
    signOut,
    profilePhotoOption,
    customPhotoUrl,
    userId,
    channelNumber: channel,
    noiseMode,
  } = usePTTStore();

  const [isPhraseModalOpen, setIsPhraseModalOpen] = useState(false);
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);
  const [isProvinceModalOpen, setIsProvinceModalOpen] = useState(false);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const roomId = `ptt-room-${channel}`;
  const { role } = useChannelRole(roomId, userId);

  const handleOpenModeration = () => {
    onClose();
    if (onOpenModeration) {
      onOpenModeration();
    }
  };

  const PREDEFINED_PHRASES = [
    '1 ❤️ BERBAGI MODULASI NEXTVWT TETAP DI HATI',
    '1 NUSA 1 BANGSA 1 BAHASA',
    'ADA UDANG DI BALIK BATU... MODUS YA?',
    'AIR BERIAK TANDA TAK DALAM',
    'BERAT SAMA DIPIKUL RINGAN SAMA DIJINJING',
    'BHINNEKA TUNGGAL IKA TAN HANA DHARMA MANGRWA',
    'CINTAKU BERTEPUK SEBELAH CHANNEL',
    'DI MANA BUMI DIPIJAK DI SANA LANGIT DIJUNJUNG',
    'JANGAN ADA DUSTA DI ANTARA KITA',
    'JANGAN LUPA NGOPI ☕️☕️',
    'MALU BERTANYA TERSESAT DI CHANNEL',
    'MOHON MAAF, SEDANG BEKERJA',
    'MOHON MAAF, SEDANG DALAM PERJALANAN',
    'MOHON MAAF, SEDANG ISTIRAHAT',
    'MOHON MAAF, SEDANG MAKAN',
    'MOHON MAAF, SEDANG MENGASUH ANAK',
    'MOHON MAAF, SEDANG MENGEMUDI',
    'MOHON MAAF, SEDANG TIDAK DI TEMPAT',
    'MOHON MAAF, SEDANG TIDUR',
    'MOHON MAAF, SINYAL ADA GANGGUAN',
    'NKRI HARGA MATI',
    'SATU HATI BERBAGI MODULASI NKRI HARGA MATI',
    'TAK ADA JALAN YANG TAK BERLUBANG',
    'TAK KENAL MAKA TAK SAYANG',
    'TONG KOSONG NYARING BUNYINYA',
  ];

  // Map state setters to updateSettings
  const setInfoText = (val: string) => updateSettings({ infoText: val });
  const setLocationText = (val: string) => updateSettings({ locationText: val });
  const setShowMyPhoto = (val: boolean) => updateSettings({ showMyPhoto: val });
  const setShowOtherPhotos = (val: boolean) => updateSettings({ showOtherPhotos: val });
  const setShowPhotosInList = (val: boolean) => updateSettings({ showPhotosInList: val });
  const setFastClick = (val: boolean) => updateSettings({ fastClick: val });
  const setShowModulator = (val: boolean) => updateSettings({ showModulator: val });
  const setShowPTT = (val: boolean) => updateSettings({ showPTT: val });
  const setMaxQueue = (val: string) => updateSettings({ maxQueue: val });
  const setAudioMode = (val: 'discussion' | 'music') => updateSettings({ audioMode: val });
  const setPttSize = (val: number) => updateSettings({ pttSize: val });
  const setPttBottom = (val: number) => updateSettings({ pttBottom: val });
  const setTogglePtt = (val: boolean) => updateSettings({ togglePtt: val });
  const setPttVolume = (val: number) => updateSettings({ pttVolume: val });
  const setVibrateOnStart = (val: boolean) => updateSettings({ vibrateOnStart: val });
  const setToneOnStartEnd = (val: boolean) => updateSettings({ toneOnStartEnd: val });
  const setBgActive = (val: boolean) => updateSettings({ bgActive: val });
  const setFullDuplex = (val: boolean) => updateSettings({ fullDuplex: val });
  const setThemeText = (val: string) => updateSettings({ themeText: val });
  const setBuiltInEcho = (val: boolean) => updateSettings({ builtInEcho: val });
  const setEchoFeedback = (val: number) => updateSettings({ echoFeedback: val });
  const setNoiseMode = (val: 'normal' | 'ojol' | 'wind' | 'crowd' | 'emergency') =>
    updateSettings({ noiseMode: val });

  const getThemeLabel = (theme: string) => {
    const t = theme?.toLowerCase() || '';
    if (t === 'theme-classic' || t.includes('classic')) return 'Classic';
    if (t === 'theme-v1' || t.includes('v1')) return 'Glass Crystal V1 (Premium)';
    if (t === 'theme-v2' || t.includes('v2')) return 'Glass Crystal V2 (Premium Crystal)';
    if (t === 'theme-v3' || t.includes('v3')) return 'Glass Crystal V3 (Soft Crystal)';
    if (t === 'theme-v4' || t.includes('v4')) return 'Glass Crystal V4 (Smoked Crystal)';
    if (t === 'theme-v5' || t.includes('v5')) return 'Glass Crystal V5 (Aurora Crystal)';
    if (t === 'theme-v6' || t.includes('v6')) return 'Glass Crystal V6 (Live Aquarium)';
    if (t === 'theme-monokrom' || t.includes('monokrom')) return 'Monokrom (Legacy)';
    return 'Classic';
  };

  const emailText = user?.email || 'Guest User';

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar!');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 140;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imgRatio = img.width / img.height;
          const targetRatio = 120 / 140;
          let sx = 0,
            sy = 0,
            sw = img.width,
            sh = img.height;

          if (imgRatio > targetRatio) {
            sw = img.height * targetRatio;
            sx = (img.width - sw) / 2;
          } else {
            sh = img.width / targetRatio;
            sy = (img.height - sh) / 2;
          }

          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 120, 140);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
          updateSettings({
            customPhotoUrl: compressedBase64,
            profilePhotoOption: 'custom',
          });
          toast.success('Foto profil berhasil diunggah!');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    toast.success('Pengaturan berhasil disimpan!', {
      position: 'bottom-center',
      duration: 2000,
    });
    // Let settings close after short delay
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f0f0] select-none text-black">
      {/* Top Header Bar */}
      <div
        className="w-full h-[90px] flex items-center px-5 z-20 relative overflow-hidden shrink-0"
        style={{
          background: 'var(--header-bg)',
          boxShadow:
            'var(--header-shadow), inset 0 -12px 20px -6px rgba(0, 0, 0, 0.45), inset 0 3px 6px rgba(255, 255, 255, 0.4)',
          borderBottom: 'var(--header-border)',
        }}
      >
        {/* Top Glossy Reflection */}
        <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-white/35 to-transparent pointer-events-none z-10" />

        <button type="button"
          onClick={onClose}
          className="mr-2.5 w-9 h-9 flex items-center justify-center rounded-full border border-slate-300 bg-gradient-to-b from-white via-[#f1f5f9] to-[#cbd5e1] shadow-[0_2px_0_#94a3b8,inset_0_1px_0_rgba(255,255,255,0.8)] active:translate-y-[1.5px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none relative z-25 flex-shrink-0"
          style={{ color: 'var(--header-text-color)' }}
        >
          {/* Back arrow chevron */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="sr-only">Back</span>
        </button>

        {/* Brand Logo */}
        <svg
          viewBox="0 0 100 100"
          className="w-[52px] h-[52px] relative z-25 mr-2"
          style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.25))' }}
        >
          <defs>
            <clipPath id="micClipSettings">
              <circle cx="50" cy="50" r="36" />
            </clipPath>
          </defs>

          <path
            d="M 22 77 A 38 38 0 1 1 78 77"
            stroke="#0a2e1a"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
            transform="translate(1, 1.2)"
            opacity="0.5"
          />
          <path
            d="M 22 77 A 38 38 0 1 1 78 77"
            stroke="#34D399"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 22 77 A 38 38 0 1 1 78 77"
            stroke="#a7f3d0"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.65"
            transform="translate(-0.6, -0.7)"
          />

          <path
            d="M 29 71 A 28 28 0 1 1 71 71"
            stroke="#713f12"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
            transform="translate(1, 1.2)"
            opacity="0.5"
          />
          <path
            d="M 29 71 A 28 28 0 1 1 71 71"
            stroke="#eab308"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 29 71 A 28 28 0 1 1 71 71"
            stroke="#fef08a"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.65"
            transform="translate(-0.6, -0.7)"
          />

          <path
            d="M 36 65 A 18 18 0 1 1 64 65"
            stroke="#003a17"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
            transform="translate(1, 1.2)"
            opacity="0.5"
          />
          <path
            d="M 36 65 A 18 18 0 1 1 64 65"
            stroke="#00C853"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 36 65 A 18 18 0 1 1 64 65"
            stroke="#69f0ae"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.65"
            transform="translate(-0.6, -0.7)"
          />

          <circle
            cx="50"
            cy="50"
            r="11"
            fill="#1a0000"
            transform="translate(1.2, 1.5)"
            opacity="0.45"
          />
          <image 
            href={vintageMic} 
            x="14" 
            y="14" 
            width="72" 
            height="72" 
            clipPath="url(#micClipSettings)"
            preserveAspectRatio="xMidYMid slice"
          />
        </svg>

        <span
          className="text-[16px] font-bold tracking-wide relative z-25 ml-0.5"
          style={{
            fontFamily: "'Outfit', 'Orbitron', system-ui, -apple-system, sans-serif",
            color: 'var(--header-text-color)',
          }}
        >
          Pengaturan
        </span>
      </div>

      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto w-full pb-8">
        {/* MODERATION CHANNEL TAB */}
        {canPerformAction(role, 'VIEW_ADMIN_PANEL') && (
          <div className="w-full bg-white border-b border-gray-200">
            <button type="button"
              onClick={handleOpenModeration}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer text-left focus:outline-none"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-full flex items-center justify-center">
                  <Shield className="h-5 w-5" />
                </div>
                <span className="text-sm font-bold text-gray-800">Kelola & Moderasi Channel</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        )}

        {/* FITUR DEVELOPER & NOC */}
        {(role === 'noc' || role === 'sys_admin') && (
          <div className="w-full bg-[#e2e8f0] py-2 px-6 border-b border-gray-200 flex flex-col gap-2.5">
            <span className="text-[10px] font-bold text-[#475569] uppercase tracking-wider">
              Akses Khusus NOC & Developer
            </span>
            <div className="flex gap-3 pb-1.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenWallet) onOpenWallet();
                }}
                className="flex-1 text-center py-2 text-xs font-bold rounded text-white bg-gradient-to-b from-amber-400 to-amber-500 border-t border-white/30 border-b border-black/20 shadow-[0_2.5px_0_#b45309] active:translate-y-[1.5px] active:shadow-none hover:brightness-105 cursor-pointer focus:outline-none flex items-center justify-center gap-1"
              >
                Dompet Koin
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenRoip) onOpenRoip();
                }}
                className="flex-1 text-center py-2 text-xs font-bold rounded text-white bg-gradient-to-b from-sky-400 to-sky-500 border-t border-white/30 border-b border-black/20 shadow-[0_2.5px_0_#0369a1] active:translate-y-[1.5px] active:shadow-none hover:brightness-105 cursor-pointer focus:outline-none flex items-center justify-center gap-1"
              >
                Jembatan ROIP
              </button>
            </div>
          </div>
        )}

        {/* INFO SECTION */}
        <div className="w-full bg-[#e2e8f0] py-1.5 px-6 text-[11px] font-bold text-[#475569] uppercase tracking-wider">
          Info
        </div>
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex gap-2">
          <label htmlFor="infoTextInput" className="sr-only">Display Name</label>
          <input
            id="infoTextInput"
            title="Username or Display name"
            aria-label="Username or Display name"
            type="text"
            value={infoText}
            onChange={(e) => setInfoText(e.target.value)}
            className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-sm bg-white text-black outline-none focus:border-blue-500"
            placeholder="Username / Display name..."
          />
          <button type="button"
            aria-label="Daftar kata"
            onClick={() => setIsPhraseModalOpen(true)}
            className="p-2 rounded text-white font-bold bg-gradient-to-b from-[#38bdf8] via-[#0ea5e9] to-[#0284c7] border-t border-white/40 border-b border-black/20 shadow-[0_3px_0_#0369a1,inset_0_1px_0_rgba(255,255,255,0.4)] active:translate-y-[2px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none"
          >
            {/* Document icon */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span className="sr-only">Daftar kata</span>
          </button>
        </div>

        {/* LOKASI SECTION */}
        <div className="w-full bg-[#e2e8f0] py-1.5 px-6 text-[11px] font-bold text-[#475569] uppercase tracking-wider">
          Lokasi
        </div>
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex gap-2">
          <label htmlFor="locationTextInput" className="sr-only">Lokasi</label>
          <input
            id="locationTextInput"
            title="User Location"
            aria-label="User Location"
            type="text"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-sm bg-white text-black font-semibold outline-none focus:border-blue-500"
          />
          <button type="button"
            aria-label="Pilih lokasi"
            onClick={() => setIsProvinceModalOpen(true)}
            className="p-2 rounded text-white font-bold bg-gradient-to-b from-[#38bdf8] via-[#0ea5e9] to-[#0284c7] border-t border-white/40 border-b border-black/20 shadow-[0_3px_0_#0369a1,inset_0_1px_0_rgba(255,255,255,0.4)] active:translate-y-[2px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none"
          >
            {/* Search glass icon */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="sr-only">Pilih lokasi</span>
          </button>
        </div>

        {/* AKUN SECTION */}
        <div className="w-full bg-[#e2e8f0] py-1.5 px-6 text-[11px] font-bold text-[#475569] uppercase tracking-wider">
          Akun
        </div>
        <div className="bg-white px-6 py-5 border-b border-gray-200 flex flex-col items-center">
          {/* Square Profile Image Casing */}
          <div className="w-[120px] h-[140px] border border-gray-300 relative overflow-hidden bg-[#e0e0e0] flex items-center justify-center mb-3 shadow-inner">
            <img
              src={
                (profilePhotoOption === 'google'
                  ? user?.user_metadata?.avatar_url
                  : customPhotoUrl) ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
              }
              alt="Account Profile Avatar"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to silhouette if offline/fails to load
                (e.target as HTMLImageElement).src =
                  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%234A5568"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
              }}
            />
          </div>

          {/* Opsi Sumber Foto Profil */}
          <div className="w-full max-w-[240px] flex gap-1 bg-gray-200 p-1 rounded-lg mb-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] border border-gray-300/60">
            <button
              type="button"
              disabled={!user?.user_metadata?.avatar_url}
              onClick={() => updateSettings({ profilePhotoOption: 'google' })}
              className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                profilePhotoOption === 'google'
                  ? 'bg-gradient-to-b from-[#38bdf8] via-[#0ea5e9] to-[#0284c7] text-white border-t border-white/30 border-b border-black/20 shadow-[0_2px_0_#0284c7,inset_0_1px_0_rgba(255,255,255,0.4)]'
                  : 'text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
              title={
                !user?.user_metadata?.avatar_url ? 'Hanya tersedia jika masuk dengan Google' : ''
              }
            >
              Foto Google
            </button>
            <button
              type="button"
              onClick={() => {
                updateSettings({ profilePhotoOption: 'custom' });
                fileInputRef.current?.click();
              }}
              className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                profilePhotoOption === 'custom'
                  ? 'bg-gradient-to-b from-[#38bdf8] via-[#0ea5e9] to-[#0284c7] text-white border-t border-white/30 border-b border-black/20 shadow-[0_2px_0_#0284c7,inset_0_1px_0_rgba(255,255,255,0.4)]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Unggah Galeri
            </button>
          </div>

          <input
            title="Settings Input"
            aria-label="Settings Input"
            type="file"
            ref={fileInputRef}
            id="profile-photo-file-input"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />

          <div className="text-center text-xs font-semibold text-gray-700 mb-4">
            eMail ({emailText})
          </div>

          {/* Account action buttons */}
          <div className="w-full flex flex-col gap-2.5">
            {!user?.app_metadata?.provider && (
              <button type="button" className="w-full text-center py-2.5 text-sm font-bold rounded text-slate-800 bg-gradient-to-b from-white via-[#f1f5f9] to-[#cbd5e1] border-t border-white/40 border-b border-black/20 shadow-[0_3px_0_#94a3b8,inset_0_1px_0_rgba(255,255,255,0.8)] active:translate-y-[2px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none">
                Ubah Kata Sandi
              </button>
            )}
            <button type="button"
              onClick={() => {
                signOut();
                onClose();
              }}
              className="w-full text-center py-2.5 text-sm font-bold rounded text-white bg-gradient-to-b from-red-400 via-red-500 to-red-600 border-t border-white/40 border-b border-black/20 shadow-[0_3px_0_#991b1b,inset_0_1px_0_rgba(255,255,255,0.4)] active:translate-y-[2px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none"
            >
              Keluar dari Akun Google
            </button>
          </div>

          {/* Account checkboxes (Custom Toggle Switch) */}
          <div className="w-full mt-4 flex flex-col gap-4">
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-semibold text-gray-700 pr-4 leading-normal">
                Tampilkan Foto Saya Kepada Pengguna Lain (Koneksi Kembali Diharuskan)
              </span>
              <div className="relative flex items-center">
                <input
                  title="Settings Input"
                  aria-label="Settings Input"
                  type="checkbox"
                  id="toggle-showMyPhoto"
                  checked={showMyPhoto}
                  onChange={(e) => setShowMyPhoto(e.target.checked)}
                  className="settings-checkbox-input"
                />
                <label htmlFor="toggle-showMyPhoto" className="settings-toggle-switch"></label>
              </div>
            </div>
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-semibold text-gray-700 pr-4 leading-normal">
                Tampilkan Foto Pengguna Lain (Koneksi Kembali Diharuskan)
              </span>
              <div className="relative flex items-center">
                <input
                  title="Settings Input"
                  aria-label="Settings Input"
                  type="checkbox"
                  id="toggle-showOtherPhotos"
                  checked={showOtherPhotos}
                  onChange={(e) => setShowOtherPhotos(e.target.checked)}
                  className="settings-checkbox-input"
                />
                <label htmlFor="toggle-showOtherPhotos" className="settings-toggle-switch"></label>
              </div>
            </div>
          </div>
        </div>

        {/* TAMPILAN DAFTAR PENGGUNA SECTION */}
        <div className="w-full bg-[#e2e8f0] py-1.5 px-6 text-[11px] font-bold text-[#475569] uppercase tracking-wider">
          Tampilan Daftar Pengguna
        </div>
        <div className="bg-white px-6 py-5 border-b border-gray-200 flex flex-col gap-4">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-gray-700 pr-4 leading-normal">
              Tampilkan Foto (Koneksi Kembali Diharuskan)
            </span>
            <div className="relative flex items-center">
              <input
                title="Settings Input"
                aria-label="Settings Input"
                type="checkbox"
                id="toggle-showPhotosInList"
                checked={showPhotosInList}
                onChange={(e) => setShowPhotosInList(e.target.checked)}
                className="settings-checkbox-input"
              />
              <label htmlFor="toggle-showPhotosInList" className="settings-toggle-switch"></label>
            </div>
          </div>
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-gray-700 pr-4 leading-normal">
              Klik Cepat (Koneksi Kembali Disarankan)
            </span>
            <div className="relative flex items-center">
              <input
                title="Settings Input"
                aria-label="Settings Input"
                type="checkbox"
                id="toggle-fastClick"
                checked={fastClick}
                onChange={(e) => setFastClick(e.target.checked)}
                className="settings-checkbox-input"
              />
              <label htmlFor="toggle-fastClick" className="settings-toggle-switch"></label>
            </div>
          </div>
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-gray-700 pr-4 leading-normal">
              Tampilkan Modulator
            </span>
            <div className="relative flex items-center">
              <input
                title="Settings Input"
                aria-label="Settings Input"
                type="checkbox"
                id="toggle-showModulator"
                checked={showModulator}
                onChange={(e) => setShowModulator(e.target.checked)}
                className="settings-checkbox-input"
              />
              <label htmlFor="toggle-showModulator" className="settings-toggle-switch"></label>
            </div>
          </div>
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-gray-700 pr-4 leading-normal">
              Tampilkan PTT
            </span>
            <div className="relative flex items-center">
              <input
                title="Settings Input"
                aria-label="Settings Input"
                type="checkbox"
                id="toggle-showPTT"
                checked={showPTT}
                onChange={(e) => setShowPTT(e.target.checked)}
                className="settings-checkbox-input"
              />
              <label htmlFor="toggle-showPTT" className="settings-toggle-switch"></label>
            </div>
          </div>
        </div>

        {/* ANTRIAN MAKSIMAL SECTION */}
        <div className="w-full bg-[#e2e8f0] py-1.5 px-6 text-[11px] font-bold text-[#475569] uppercase tracking-wider">
          Antrian Maksimal Pemutar Suara (per 20ms)
        </div>
        <div className="bg-white px-6 py-4 border-b border-gray-200">
          <label htmlFor="maxQueueInput" className="sr-only">Max Queue</label>
          <input
            id="maxQueueInput"
            title="Max Audio Queue"
            aria-label="Max Audio Queue"
            type="text"
            value={maxQueue}
            onChange={(e) => setMaxQueue(e.target.value)}
            className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm bg-white text-black font-semibold outline-none focus:border-blue-500"
          />
        </div>

        {/* MODE AUDIO SECTION */}
        <div className="w-full bg-[#e2e8f0] py-1.5 px-6 text-[11px] font-bold text-[#475569] uppercase tracking-wider">
          Mode Audio
        </div>
        <div className="bg-white px-6 py-5 border-b border-gray-200 flex flex-col gap-4">
          {/* Radio Button 1 */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              title="Settings Input"
              aria-label="Settings Input"
              type="radio"
              name="audioMode"
              checked={audioMode === 'discussion'}
              onChange={() => setAudioMode('discussion')}
              className="w-4.5 h-4.5 text-green-500 accent-[#10B981] focus:ring-0 cursor-pointer"
            />
            <span className="text-xs font-semibold text-gray-700">Mode Diskusi</span>
          </label>
          {/* Radio Button 2 */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              title="Settings Input"
              aria-label="Settings Input"
              type="radio"
              name="audioMode"
              checked={audioMode === 'music'}
              onChange={() => setAudioMode('music')}
              className="w-4.5 h-4.5 text-green-500 accent-[#10B981] focus:ring-0 cursor-pointer"
            />
            <span className="text-xs font-semibold text-gray-700">Mode Musik & Karaoke</span>
          </label>

          {/* Software Echo Toggle (Only visible in Music Mode to keep it context-aware) */}
          {audioMode === 'music' && (
            <div className="flex items-center justify-between py-2 border-t border-gray-100 mt-1">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-700">
                  Efek Echo Built-in (Software)
                </span>
                <span className="text-[10px] text-gray-500 font-normal">
                  Matikan jika menggunakan soundcard eksternal
                </span>
              </div>
              <div className="relative flex items-center">
                <input
                  title="Settings Input"
                  aria-label="Settings Input"
                  type="checkbox"
                  id="toggle-builtInEcho"
                  checked={builtInEcho}
                  onChange={(e) => setBuiltInEcho(e.target.checked)}
                  className="settings-checkbox-input"
                />
                <label htmlFor="toggle-builtInEcho" className="settings-toggle-switch"></label>
              </div>
            </div>
          )}

          {/* Software Echo Slider (Only when built-in echo is enabled) */}
          {audioMode === 'music' && builtInEcho && (
            <div className="flex flex-col gap-1 py-2 border-t border-gray-100 mt-1">
              <div className="text-xs font-semibold text-gray-700">
                Intensitas Gema (Echo Level)
              </div>
              <div className="PB-range-slider-div">
                <input
                  title="Settings Input"
                  aria-label="Settings Input"
                  type="range"
                  min="0"
                  max="100"
                  value={echoFeedback}
                  onChange={(e) => setEchoFeedback(Number(e.target.value))}
                  className="PB-range-slider"
                  style={{
                    background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${echoFeedback}%, #d5dbe1 ${echoFeedback}%, #d5dbe1 100%)`,
                  }}
                />
                <span className="PB-range-slidervalue">{echoFeedback}%</span>
              </div>
            </div>
          )}

          {/* Open/Close Karaoke Player Button */}
          {audioMode === 'music' && (
            <div className="flex flex-col gap-2 py-2 border-t border-gray-100 mt-1">
              <button
                aria-label="Toggle Karaoke Player"
                type="button"
                onClick={() => setIsKaraokePlayerOpen(!isKaraokePlayerOpen)}
                className="w-full py-2.5 px-4 rounded text-white font-bold text-xs bg-gradient-to-b from-[#6366f1] via-[#5b21b6] to-[#4c1d95] border-t border-white/30 border-b border-black/20 shadow-[0_3px_0_#311068,inset_0_1px_0_rgba(255,255,255,0.4)] active:translate-y-[2px] active:shadow-none hover:brightness-105 transition-all duration-100 flex items-center justify-center gap-2 focus:outline-none cursor-pointer"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={isKaraokePlayerOpen ? 'animate-pulse' : ''}
                >
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
                {isKaraokePlayerOpen ? 'Tutup Pemutar Karaoke' : 'Buka Pemutar Karaoke'}
              </button>
            </div>
          )}
        </div>

        {/* PEREDAM BISING & BACKGROUND SURVIVAL SECTION */}
        <div className="w-full bg-[#e2e8f0] py-1.5 px-6 text-[11px] font-bold text-[#475569] uppercase tracking-wider">
          Peredam Bising & Siaga Latar Belakang
        </div>
        <div className="bg-white px-6 py-5 border-b border-gray-200 flex flex-col gap-4">
          {/* Dropdown pemilih Mode Peredam Bising */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="noiseModeSelect" className="text-xs font-semibold text-gray-700">
              Mode Peredam Bising Adaptif (HPF/AGC/Bandpass)
            </label>
            <select
              id="noiseModeSelect"
              title="Mode Peredam Bising"
              aria-label="Mode Peredam Bising"
              value={noiseMode}
              onChange={(e) => setNoiseMode(e.target.value as 'normal' | 'ojol' | 'wind' | 'crowd' | 'emergency')}
              className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm bg-white text-black font-semibold outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="normal">Mode Normal (Ruangan/Kantor)</option>
              <option value="ojol">Mode Ojol / Jalan Raya (Bising Motor/Klakson)</option>
              <option value="wind">Mode Hujan / Angin (Wind Rustle & Broadband)</option>
              <option value="crowd">Mode Keramaian (Pasar/Terminal/Babble Noise)</option>
              <option value="emergency">Mode Darurat / Critical (Ekstraksi Vokal Agresif)</option>
            </select>
            <p className="text-[10px] text-gray-500 leading-relaxed mt-0.5">
              Pilih profil peredaman kebisingan yang sesuai dengan kondisi lingkungan Anda saat
              mengudara.
            </p>
          </div>

          {/* Tombol Whitelisting Baterai */}
          <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
            <div className="flex flex-col mb-1">
              <span className="text-xs font-semibold text-gray-700">
                Optimalisasi Baterai Latar Belakang
              </span>
              <span className="text-[10px] text-gray-500 leading-normal">
                Kecualikan NextVWT dari penghemat daya OS agar koneksi audio tetap hidup saat layar
                mati (Deep Sleep).
              </span>
            </div>
            <button
              type="button"
              onClick={async () => {
                const res = await requestBatteryWhitelist();
                if (res === 'not_native') {
                  toast.info('Fitur ini hanya tersedia pada aplikasi Android native.');
                } else if (res === 'error') {
                  toast.error('Gagal membuka pengaturan optimalisasi baterai.');
                } else {
                  toast.success('Pengaturan baterai diminta.');
                }
              }}
              className="w-full text-center py-2.5 text-xs font-bold rounded text-slate-800 bg-gradient-to-b from-white via-[#f1f5f9] to-[#cbd5e1] border-t border-white/40 border-b border-black/20 shadow-[0_3px_0_#94a3b8,inset_0_1px_0_rgba(255,255,255,0.8)] active:translate-y-[2px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none"
            >
              Izinkan Berjalan di Latar Belakang (Whitelist)
            </button>
          </div>
        </div>

        {/* PTT SECTION */}
        <div className="w-full bg-[#e2e8f0] py-1.5 px-6 text-[11px] font-bold text-[#475569] uppercase tracking-wider">
          PTT
        </div>
        <div className="bg-white px-6 py-5 border-b border-gray-200 flex flex-col gap-4">
          {/* Slider 1: Ukuran */}
          <div className="flex flex-col gap-1">
            <div className="text-xs font-semibold text-gray-700">Ukuran</div>
            <div className="PB-range-slider-div">
              <input
                title="Settings Input"
                aria-label="Settings Input"
                type="range"
                min="10"
                max="100"
                value={pttSize}
                onChange={(e) => setPttSize(Number(e.target.value))}
                className="PB-range-slider"
                style={{
                  background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${((pttSize - 10) / 90) * 100}%, #d5dbe1 ${((pttSize - 10) / 90) * 100}%, #d5dbe1 100%)`,
                }}
              />
              <span className="PB-range-slidervalue">{pttSize}%</span>
            </div>
          </div>

          {/* Slider 2: Batas Bawah */}
          <div className="flex flex-col gap-1">
            <div className="text-xs font-semibold text-gray-700">Batas Bawah</div>
            <div className="PB-range-slider-div">
              <input
                title="Settings Input"
                aria-label="Settings Input"
                type="range"
                min="10"
                max="100"
                value={pttBottom}
                onChange={(e) => setPttBottom(Number(e.target.value))}
                className="PB-range-slider"
                style={{
                  background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${((pttBottom - 10) / 90) * 100}%, #d5dbe1 ${((pttBottom - 10) / 90) * 100}%, #d5dbe1 100%)`,
                }}
              />
              <span className="PB-range-slidervalue">{pttBottom}%</span>
            </div>
          </div>

          {/* Checkbox: Toggle PTT (Custom Toggle Switch) */}
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-gray-700 pr-4 leading-normal">
              Toggle PTT
            </span>
            <div className="relative flex items-center">
              <input
                title="Settings Input"
                aria-label="Settings Input"
                type="checkbox"
                id="toggle-togglePtt"
                checked={togglePtt}
                onChange={(e) => setTogglePtt(e.target.checked)}
                className="settings-checkbox-input"
              />
              <label htmlFor="toggle-togglePtt" className="settings-toggle-switch"></label>
            </div>
          </div>

          {/* Slider 3: Volume Pemutar Suara Saat Menekan PTT */}
          <div className="flex flex-col gap-1 mt-1">
            <div className="text-xs font-semibold text-gray-700">
              Volume Pemutar Suara Saat Menekan PTT
            </div>
            <div className="PB-range-slider-div">
              <input
                title="Settings Input"
                aria-label="Settings Input"
                type="range"
                min="0"
                max="100"
                value={pttVolume}
                onChange={(e) => setPttVolume(Number(e.target.value))}
                className="PB-range-slider"
                style={{
                  background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${pttVolume}%, #d5dbe1 ${pttVolume}%, #d5dbe1 100%)`,
                }}
              />
              <span className="PB-range-slidervalue">{pttVolume}%</span>
            </div>
          </div>

          {/* PTT Checkboxes (Custom Toggle Switch) */}
          <div className="flex flex-col gap-4 mt-1">
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-semibold text-gray-700 pr-4 leading-normal">
                Getar Mulai
              </span>
              <div className="relative flex items-center">
                <input
                  title="Settings Input"
                  aria-label="Settings Input"
                  type="checkbox"
                  id="toggle-vibrateOnStart"
                  checked={vibrateOnStart}
                  onChange={(e) => setVibrateOnStart(e.target.checked)}
                  className="settings-checkbox-input"
                />
                <label htmlFor="toggle-vibrateOnStart" className="settings-toggle-switch"></label>
              </div>
            </div>
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-semibold text-gray-700 pr-4 leading-normal">
                Nada Mulai dan Akhir
              </span>
              <div className="relative flex items-center">
                <input
                  title="Settings Input"
                  aria-label="Settings Input"
                  type="checkbox"
                  id="toggle-toneOnStartEnd"
                  checked={toneOnStartEnd}
                  onChange={(e) => setToneOnStartEnd(e.target.checked)}
                  className="settings-checkbox-input"
                />
                <label htmlFor="toggle-toneOnStartEnd" className="settings-toggle-switch"></label>
              </div>
            </div>
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-semibold text-gray-700 pr-4 leading-normal">
                Dapat Aktif di Latar Belakang
              </span>
              <div className="relative flex items-center">
                <input
                  title="Settings Input"
                  aria-label="Settings Input"
                  type="checkbox"
                  id="toggle-bgActive"
                  checked={bgActive}
                  onChange={(e) => setBgActive(e.target.checked)}
                  className="settings-checkbox-input"
                />
                <label htmlFor="toggle-bgActive" className="settings-toggle-switch"></label>
              </div>
            </div>
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-semibold text-gray-700 pr-4 leading-normal">
                Mode Untuk Channel Full-Duplex
              </span>
              <div className="relative flex items-center">
                <input
                  title="Settings Input"
                  aria-label="Settings Input"
                  type="checkbox"
                  id="toggle-fullDuplex"
                  checked={fullDuplex}
                  onChange={(e) => setFullDuplex(e.target.checked)}
                  className="settings-checkbox-input"
                />
                <label htmlFor="toggle-fullDuplex" className="settings-toggle-switch"></label>
              </div>
            </div>
          </div>

          <button type="button" className="w-full text-center py-2.5 text-sm font-bold rounded text-slate-800 bg-gradient-to-b from-white via-[#f1f5f9] to-[#cbd5e1] border-t border-white/40 border-b border-black/20 shadow-[0_3px_0_#94a3b8,inset_0_1px_0_rgba(255,255,255,0.8)] active:translate-y-[2px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none">
            Tambah Tombol PTT POC
          </button>
        </div>

        {/* TEMA SECTION */}
        <div className="w-full bg-[#e2e8f0] py-1.5 px-6 text-[11px] font-bold text-[#475569] uppercase tracking-wider">
          Tema
        </div>
        <div className="bg-white px-6 py-5 border-b border-gray-200 flex flex-col gap-4">
          <div className="flex gap-2">
            <input
              title="Settings Input"
              aria-label="Settings Input"
              type="text"
              readOnly
              value={getThemeLabel(themeText)}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsThemeModalOpen(true);
              }}
              className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-sm bg-white text-black font-semibold outline-none focus:border-blue-500 cursor-pointer"
            />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsThemeModalOpen(true);
              }}
              className="px-4 py-1.5 text-sm font-bold rounded text-white bg-gradient-to-b from-[#38bdf8] via-[#0ea5e9] to-[#0284c7] border-t border-white/40 border-b border-black/20 shadow-[0_3px_0_#0369a1,inset_0_1px_0_rgba(255,255,255,0.4)] active:translate-y-[2px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none"
            >
              Ganti
            </button>
          </div>

          {/* MAIN SIMPAN BUTTON */}
          <button type="button"
            onClick={handleSave}
            className="w-full text-center py-2.5 text-sm font-bold rounded text-white bg-gradient-to-b from-[#4ade80] via-[#22c55e] to-[#16a34a] border-t border-white/40 border-b border-black/20 shadow-[0_3px_0_#15803d,inset_0_1px_0_rgba(255,255,255,0.4)] active:translate-y-[2px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none"
          >
            Simpan
          </button>
        </div>

        {/* TENTANG SECTION */}
        <div className="w-full bg-[#e2e8f0] py-1.5 px-6 text-[11px] font-bold text-[#475569] uppercase tracking-wider">
          Tentang
        </div>
        <div className="bg-white px-6 py-5 border-b border-gray-200 flex flex-col gap-3">
          <div className="text-xs font-semibold text-gray-700 mb-1">
            Versi: <span className="font-bold text-black">2.0.0</span>
          </div>

          <div className="flex flex-col gap-2.5">
            <button type="button" className="w-full text-left px-4 py-2.5 text-xs font-bold rounded text-slate-800 bg-gradient-to-b from-white via-[#f1f5f9] to-[#cbd5e1] border-t border-white/40 border-b border-black/20 shadow-[0_3px_0_#94a3b8,inset_0_1px_0_rgba(255,255,255,0.8)] active:translate-y-[2px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none">
              Persyaratan & Ketentuan
            </button>
            <button type="button" className="w-full text-left px-4 py-2.5 text-xs font-bold rounded text-slate-800 bg-gradient-to-b from-white via-[#f1f5f9] to-[#cbd5e1] border-t border-white/40 border-b border-black/20 shadow-[0_3px_0_#94a3b8,inset_0_1px_0_rgba(255,255,255,0.8)] active:translate-y-[2px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none">
              Kebijakan Privasi
            </button>
            <button type="button"
              onClick={() => setIsUserGuideOpen(true)}
              className="w-full text-left px-4 py-2.5 text-xs font-bold rounded text-slate-800 bg-gradient-to-b from-white via-[#f1f5f9] to-[#cbd5e1] border-t border-white/40 border-b border-black/20 shadow-[0_3px_0_#94a3b8,inset_0_1px_0_rgba(255,255,255,0.8)] active:translate-y-[2px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none"
            >
              Panduan Pengguna
            </button>
            <button type="button" className="w-full text-left px-4 py-2.5 text-xs font-bold rounded text-slate-800 bg-gradient-to-b from-white via-[#f1f5f9] to-[#cbd5e1] border-t border-white/40 border-b border-black/20 shadow-[0_3px_0_#94a3b8,inset_0_1px_0_rgba(255,255,255,0.8)] active:translate-y-[2px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none">
              Legal
            </button>
            <button type="button" className="w-full text-left px-4 py-2.5 text-xs font-bold rounded text-slate-800 bg-gradient-to-b from-white via-[#f1f5f9] to-[#cbd5e1] border-t border-white/40 border-b border-black/20 shadow-[0_3px_0_#94a3b8,inset_0_1px_0_rgba(255,255,255,0.8)] active:translate-y-[2px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none">
              Jika Suka Berikan Rating
            </button>
            <button type="button" className="w-full text-left px-4 py-2.5 text-xs font-bold rounded text-white bg-gradient-to-b from-red-400 via-red-500 to-red-600 border-t border-white/40 border-b border-black/20 shadow-[0_3px_0_#991b1b,inset_0_1px_0_rgba(255,255,255,0.4)] active:translate-y-[2px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none mt-1">
              Hapus Akun Saya
            </button>
          </div>
        </div>
      </div>

      {/* Predefined Phrase Modal Dialog */}
      {isPhraseModalOpen && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          {/* Backdrop Click Dismiss */}
          <div className="absolute inset-0" onClick={() => setIsPhraseModalOpen(false)} />

          {/* Modal Container */}
          <div className="bg-white app-uniform-modal rounded-lg shadow-2xl flex flex-col z-10 overflow-hidden border border-gray-300">
            {/* Header */}
            <div className="flex items-center px-4 py-3 bg-white shrink-0 border-b border-gray-200">
              {/* Document Icon in Blue */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#48a4df"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2.5"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span className="text-[16px] font-bold text-[#059669]">Daftar kata/kalimat</span>
            </div>

            {/* Phrase List */}
            <div className="flex-1 overflow-y-auto bg-white text-left divide-y divide-gray-100">
              {PREDEFINED_PHRASES.map((phrase, idx) => (
                <button type="button"
                  key={idx}
                  onClick={() => {
                    setInfoText(phrase);
                    setIsPhraseModalOpen(false);
                  }}
                  className="w-full text-left py-3 px-4 hover:bg-gray-50 active:bg-gray-100 text-[11px] font-bold text-gray-800 leading-normal border-b border-gray-100 cursor-pointer select-none focus:outline-none"
                >
                  {phrase}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* User Guide Modal Dialog */}
      {isUserGuideOpen && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          {/* Backdrop Click Dismiss */}
          <div className="absolute inset-0" onClick={() => setIsUserGuideOpen(false)} />

          {/* Modal Container */}
          <div className="bg-white app-uniform-modal rounded-lg shadow-2xl flex flex-col z-10 overflow-hidden border border-gray-300">
            {/* Header */}
            <div className="flex items-center px-4 py-3 bg-white shrink-0 border-b border-gray-200">
              <button type="button"
                onClick={() => setIsUserGuideOpen(false)}
                className="mr-2.5 w-9 h-9 flex items-center justify-center rounded-full border border-slate-300 bg-gradient-to-b from-white via-[#f1f5f9] to-[#cbd5e1] shadow-[0_2px_0_#94a3b8,inset_0_1px_0_rgba(255,255,255,0.8)] active:translate-y-[1.5px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none text-black flex-shrink-0"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span className="text-[16px] font-bold text-[#48a4df]">Panduan Pengguna</span>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 text-left text-xs text-gray-700 space-y-4 bg-gray-50 leading-relaxed">
              {/* Section 1 */}
              <div className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="font-bold text-sm text-[#0066cc] mb-1.5 flex items-center gap-1.5">
                  <span className="bg-[#e0effa] text-[#0066cc] w-5 h-5 rounded-full flex items-center justify-center text-[11px]">
                    1
                  </span>
                  PENDAHULUAN
                </h3>
                <p>
                  <strong>NextVWT (Next Virtual Walkie Talkie)</strong> adalah aplikasi komunikasi
                  suara real-time berbasis internet (VoIP) yang mensimulasikan cara kerja perangkat
                  Handy Talkie (HT) klasik secara modern. Aplikasi ini beroperasi penuh menggunakan
                  Wi-Fi atau data seluler.
                </p>
              </div>

              {/* Section 2 */}
              <div className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="font-bold text-sm text-[#0066cc] mb-1.5 flex items-center gap-1.5">
                  <span className="bg-[#e0effa] text-[#0066cc] w-5 h-5 rounded-full flex items-center justify-center text-[11px]">
                    2
                  </span>
                  REGISTRASI & LOGIN
                </h3>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    Pertama kali masuk, lengkapi formulir pendaftaran akun menggunakan alamat eMail
                    aktif dan buat kata sandi yang aman.
                  </li>
                  <li>Lakukan verifikasi email sebelum melakukan login di layar utama.</li>
                  <li>
                    Disarankan untuk mengunggah foto profil asli agar pengguna lain dapat dengan
                    mudah mengenali Anda saat mengudara.
                  </li>
                </ul>
              </div>

              {/* Section 3 */}
              <div className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="font-bold text-sm text-[#0066cc] mb-1.5 flex items-center gap-1.5">
                  <span className="bg-[#e0effa] text-[#0066cc] w-5 h-5 rounded-full flex items-center justify-center text-[11px]">
                    3
                  </span>
                  KONFIGURASI PENTING (SET)
                </h3>
                <p className="mb-2 text-[#9c2424] font-semibold">
                  ⚠️ Konfigurasi Awal Sangat Disarankan:
                </p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>
                    Buka tombol <strong>SET</strong> pada menu utama.
                  </li>
                  <li>
                    Lengkapi kolom <strong>Username / Display name</strong> serta{' '}
                    <strong>Lokasi</strong> Anda.
                  </li>
                  <li>
                    Untuk kelancaran transmisi, ubah nilai kolom{' '}
                    <strong>Antrian Maksimal Pemutar Suara</strong> menjadi{' '}
                    <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-[#9c2424] font-bold">
                      99999
                    </code>
                    .
                  </li>
                  <li>
                    Klik tombol <strong>Simpan</strong> untuk menerapkan konfigurasi.
                  </li>
                </ol>
              </div>

              {/* Section 4 */}
              <div className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="font-bold text-sm text-[#0066cc] mb-1.5 flex items-center gap-1.5">
                  <span className="bg-[#e0effa] text-[#0066cc] w-5 h-5 rounded-full flex items-center justify-center text-[11px]">
                    4
                  </span>
                  PENGOPERASIAN CHANNEL
                </h3>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    Gunakan tombol arah <strong>UP (▲) / DOWN (▼)</strong> di panel tengah untuk
                    berpindah channel dari 1 hingga 999.
                  </li>
                  <li>
                    <strong>Landing Channel (CH 100)</strong> digunakan sebagai ruang uji coba
                    modulasi, tes volume suara, dan perkenalan awal.
                  </li>
                  <li>
                    Channel khusus 000 disediakan bagi bantuan darurat atau panduan teknis langsung
                    dari admin.
                  </li>
                </ul>
              </div>

              {/* Section 5 */}
              <div className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="font-bold text-sm text-[#0066cc] mb-1.5 flex items-center gap-1.5">
                  <span className="bg-[#e0effa] text-[#0066cc] w-5 h-5 rounded-full flex items-center justify-center text-[11px]">
                    5
                  </span>
                  MEKANISME PTT (PUSH TO TALK)
                </h3>
                <p className="mb-1.5">
                  Anda dapat mengubah mode penekanan tombol PTT melalui pengaturan{' '}
                  <strong>"Toggle PTT"</strong>:
                </p>
                <div className="space-y-1.5">
                  <div className="bg-gray-50 p-2 rounded border border-gray-100">
                    <p className="font-semibold text-gray-800">● Mode Toggle (Default / Aktif):</p>
                    <p className="text-gray-600 pl-3">
                      Klik tombol PTT satu kali untuk mulai berbicara (tombol berubah menjadi
                      merah). Jika sudah selesai bicara, klik sekali lagi untuk melepas (kembali
                      hijau).
                    </p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded border border-gray-100">
                    <p className="font-semibold text-gray-800">● Mode Momentary (Tidak Aktif):</p>
                    <p className="text-gray-600 pl-3">
                      Tekan dan tahan tombol PTT/Spacebar selama berbicara. Lepaskan tekanan tombol
                      saat selesai berbicara untuk mengakhiri transmisi secara langsung.
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 6 */}
              <div className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="font-bold text-sm text-[#0066cc] mb-1.5 flex items-center gap-1.5">
                  <span className="bg-[#e0effa] text-[#0066cc] w-5 h-5 rounded-full flex items-center justify-center text-[11px]">
                    6
                  </span>
                  INDIKATOR SINYAL & KONEKSI
                </h3>
                <p>Sinyal LCD panel di kanan atas menunjukkan latensi komunikasi server:</p>
                <ul className="list-disc pl-4 space-y-1 mt-1">
                  <li>
                    <span className="text-[#149c35] font-bold">Hijau (4/3 balok)</span>: Koneksi
                    sangat stabil, suara lancar.
                  </li>
                  <li>
                    <span className="text-[#ffbb00] font-bold">Kuning (2 balok)</span>: Latensi
                    sedang, suara berpotensi terputus-putus.
                  </li>
                  <li>
                    <span className="text-[#ff3333] font-bold">Merah (1 balok)</span>: Koneksi
                    buruk, disarankan standby atau ganti koneksi internet.
                  </li>
                  <li>
                    <span className="text-[#ff3333] font-bold">Tanda × Merah</span>: Terjadi
                    pemutusan jaringan (Offline). Aplikasi tidak akan mengirim suara sebelum koneksi
                    pulih secara otomatis.
                  </li>
                </ul>
              </div>

              {/* Section 7 */}
              <div className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="font-bold text-sm text-[#0066cc] mb-1.5 flex items-center gap-1.5">
                  <span className="bg-[#e0effa] text-[#0066cc] w-5 h-5 rounded-full flex items-center justify-center text-[11px]">
                    7
                  </span>
                  ETIKA BERKOMUNIKASI (RADIO ETIQUETTE)
                </h3>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    <strong>Antri Modulasi</strong>: Dilarang keras menabrak transmisi saat ada
                    rekan yang sedang mengudara.
                  </li>
                  <li>
                    <strong>Kata Sandi Udara</strong>: Gunakan kata penutup seperti "Ganti" (Over)
                    atau "Roger" (Diterima) agar rekan mengetahui Anda selesai berbicara.
                  </li>
                  <li>
                    <strong>Hormati Moderator</strong>: Patuhi arahan moderator channel (ikon
                    bintang) jika sedang diselenggarakan diskusi kelompok.
                  </li>
                </ul>
              </div>

              {/* Section 8 */}
              <div className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="font-bold text-sm text-[#0066cc] mb-1.5 flex items-center gap-1.5">
                  <span className="bg-[#e0effa] text-[#0066cc] w-5 h-5 rounded-full flex items-center justify-center text-[11px]">
                    8
                  </span>
                  DUKUNGAN & DARURAT
                </h3>
                <p>
                  Jika mendapati aktivitas mencurigakan atau penyalahgunaan fitur oleh pengguna
                  lain, silakan laporkan ke admin melalui eMail resmi di{' '}
                  <strong className="text-gray-800">info@nextvwt.id</strong> atau hubungi pusat
                  bantuan di WhatsApp darurat.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Province Selector Modal Dialog */}
      {isProvinceModalOpen && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0" onClick={() => setIsProvinceModalOpen(false)} />
          <div className="bg-white app-uniform-modal rounded-lg shadow-2xl flex flex-col z-10 overflow-hidden border border-gray-300 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center px-4 py-3 bg-white shrink-0 border-b border-gray-200">
              <button type="button"
                onClick={() => setIsProvinceModalOpen(false)}
                className="mr-2.5 w-9 h-9 flex items-center justify-center rounded-full border border-slate-300 bg-gradient-to-b from-white via-[#f1f5f9] to-[#cbd5e1] shadow-[0_2px_0_#94a3b8,inset_0_1px_0_rgba(255,255,255,0.8)] active:translate-y-[1.5px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none text-black flex-shrink-0"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span className="text-[16px] font-bold text-[#059669]">Pilih provinsi</span>
            </div>

            <div className="flex-1 overflow-y-auto bg-white text-left divide-y divide-gray-100">
              {Object.keys(PROVINCE_CITIES).map((prov) => (
                <button type="button"
                  key={prov}
                  onClick={() => {
                    setSelectedProvince(prov);
                    setIsProvinceModalOpen(false);
                    setIsCityModalOpen(true);
                  }}
                  className="w-full text-left py-3 px-4 hover:bg-gray-50 active:bg-gray-100 text-[12px] font-bold text-gray-800 border-b border-gray-100 cursor-pointer select-none focus:outline-none"
                >
                  {prov}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* City Selector Modal Dialog */}
      {isCityModalOpen && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0" onClick={() => setIsCityModalOpen(false)} />
          <div className="bg-white app-uniform-modal rounded-lg shadow-2xl flex flex-col z-10 overflow-hidden border border-gray-300 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center px-4 py-3 bg-white shrink-0 border-b border-gray-200">
              <button type="button"
                onClick={() => {
                  setIsCityModalOpen(false);
                  setIsProvinceModalOpen(true);
                }}
                className="mr-2.5 w-9 h-9 flex items-center justify-center rounded-full border border-slate-300 bg-gradient-to-b from-white via-[#f1f5f9] to-[#cbd5e1] shadow-[0_2px_0_#94a3b8,inset_0_1px_0_rgba(255,255,255,0.8)] active:translate-y-[1.5px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none text-black flex-shrink-0"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span className="text-[16px] font-bold text-gray-800">Pilih kota/kabupaten</span>
            </div>

            <div className="flex-1 overflow-y-auto bg-white text-left divide-y divide-gray-100">
              {selectedProvince &&
                PROVINCE_CITIES[selectedProvince]?.map((city) => (
                  <button type="button"
                    key={city}
                    onClick={() => {
                      setLocationText(`${city}, ${selectedProvince}`);
                      setIsCityModalOpen(false);
                    }}
                    className="w-full text-left py-3 px-4 hover:bg-gray-50 active:bg-gray-100 text-[12px] font-bold text-gray-800 border-b border-gray-100 cursor-pointer select-none focus:outline-none"
                  >
                    {city}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
      {/* Theme Selector Modal Dialog */}
      {isThemeModalOpen && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0" onClick={() => setIsThemeModalOpen(false)} />
          <div className="bg-white app-uniform-modal rounded-lg shadow-2xl flex flex-col z-10 overflow-hidden border border-gray-300 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center px-4 py-3 bg-white shrink-0 border-b border-gray-200">
              <button type="button"
                onClick={() => setIsThemeModalOpen(false)}
                className="mr-2.5 w-9 h-9 flex items-center justify-center rounded-full border border-slate-300 bg-gradient-to-b from-white via-[#f1f5f9] to-[#cbd5e1] shadow-[0_2px_0_#94a3b8,inset_0_1px_0_rgba(255,255,255,0.8)] active:translate-y-[1.5px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none text-black flex-shrink-0"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span className="text-[16px] font-bold text-gray-800">Pilih Tema</span>
            </div>

            <div className="flex-1 overflow-y-auto bg-white text-left divide-y divide-gray-100 p-2 flex flex-col gap-2">
              {[
                {
                  key: 'theme-classic',
                  label: 'Classic',
                  desc: 'Casing plastik abu-abu solid retro (Original)',
                  gradient: 'linear-gradient(135deg, #d5dbe1 0%, #a4b0be 100%)',
                },
                {
                  key: 'theme-v1',
                  label: 'Glass Crystal V1',
                  desc: 'Hybrid: Casing kristal transparan, panel plastik abu-abu',
                  gradient:
                    'linear-gradient(135deg, rgba(230, 239, 249, 0.9) 0%, rgba(125, 162, 207, 0.9) 100%)',
                },
                {
                  key: 'theme-v2',
                  label: 'Glass Crystal V2',
                  desc: 'Premium Crystal (Diamond Cut) - Glow biru es, LCD oranye',
                  gradient: 'linear-gradient(135deg, #e6eff9 0%, #FF9500 100%)',
                },
                {
                  key: 'theme-v3',
                  label: 'Glass Crystal V3',
                  desc: 'Glass Rounded (Soft Crystal) - Glow cyan, LCD biru',
                  gradient: 'linear-gradient(135deg, #00E5FF 0%, #2979ff 100%)',
                },
                {
                  key: 'theme-v4',
                  label: 'Glass Crystal V4',
                  desc: 'Dark Glass (Smoked Crystal) - Glow & LCD hijau neon',
                  gradient: 'linear-gradient(135deg, #263238 0%, #00C853 100%)',
                },
                {
                  key: 'theme-v5',
                  label: 'Glass Crystal V5',
                  desc: 'Aurora Glass (Color Crystal) - Glow & LCD ungu/pink',
                  gradient: 'linear-gradient(135deg, #ff4081 0%, #e040fb 100%)',
                },
                {
                  key: 'theme-v6',
                  label: 'Glass Crystal V6',
                  desc: 'Live Aquarium (Ocean Crystal) - Animasi ikan hidup & terumbu karang',
                  gradient: 'linear-gradient(135deg, #03045e 0%, #00b4d8 100%)',
                },
                {
                  key: 'theme-monokrom',
                  label: 'Monokrom',
                  desc: 'Retro grayscale plastic body & display style',
                  gradient: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                },
              ].map((themeOpt) => {
                const isActive = themeText === themeOpt.key;
                return (
                  <button type="button"
                    key={themeOpt.key}
                    onClick={() => {
                      setThemeText(themeOpt.key);
                      setIsThemeModalOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left cursor-pointer transition-all ${isActive ? 'bg-blue-50/50 border-blue-500 shadow-sm' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    {/* Circle Color Indicator */}
                    <div
                      className="w-10 h-10 rounded-full border border-gray-300 shadow-inner flex-shrink-0"
                      style={{ background: themeOpt.gradient }}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-bold text-gray-800">{themeOpt.label}</div>
                      <div className="text-[11px] font-semibold text-gray-500 leading-tight mt-0.5">
                        {themeOpt.desc}
                      </div>
                    </div>
                    {isActive && (
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[11px] font-bold">
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
