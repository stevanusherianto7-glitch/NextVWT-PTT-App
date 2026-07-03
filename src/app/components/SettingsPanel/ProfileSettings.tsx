import React, { useState, useRef } from 'react';
import { usePTTStore } from '../../store/usePTTStore';
import { toast } from 'sonner';
import { PROVINCE_CITIES } from '../../data/provinceCities';

export function ProfileSettings() {
  const {
    infoText,
    locationText,
    showMyPhoto,
    showOtherPhotos,
    profilePhotoOption,
    customPhotoUrl,
    user,
    signOut,
    updateSettings,
  } = usePTTStore();

  const [isPhraseModalOpen, setIsPhraseModalOpen] = useState(false);
  const [isProvinceModalOpen, setIsProvinceModalOpen] = useState(false);
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setInfoText = (val: string) => updateSettings({ infoText: val });
  const setLocationText = (val: string) => updateSettings({ locationText: val });
  const setShowMyPhoto = (val: boolean) => updateSettings({ showMyPhoto: val });
  const setShowOtherPhotos = (val: boolean) => updateSettings({ showOtherPhotos: val });

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

  const emailText = user?.email || 'Guest User';

  return (
    <div className="flex flex-col gap-4">
      {/* INFO SECTION */}
      <div>
        <div className="w-full bg-[#e2e8f0] py-1.5 px-6 text-[11px] font-bold text-[#475569] uppercase tracking-wider">
          Info
        </div>
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex gap-2">
          <label htmlFor="infoTextInput" className="sr-only">
            Display Name
          </label>
          <input
            id="infoTextInput"
            title="Username or Display name"
            aria-label="Username or Display name"
            type="text"
            value={infoText}
            onChange={(e) => setInfoText(e.target.value)}
            className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-sm bg-white text-black font-semibold outline-none focus:border-blue-500"
            placeholder="Username / Display name..."
          />
          <button
            type="button"
            aria-label="Daftar kata"
            onClick={() => setIsPhraseModalOpen(true)}
            className="p-2 rounded text-white font-bold bg-gradient-to-b from-[#38bdf8] via-[#0ea5e9] to-[#0284c7] border-t border-white/40 border-b border-black/20 shadow-[0_3px_0_#0369a1,inset_0_1px_0_rgba(255,255,255,0.4)] active:translate-y-[2px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none"
          >
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
      </div>

      {/* LOKASI SECTION */}
      <div>
        <div className="w-full bg-[#e2e8f0] py-1.5 px-6 text-[11px] font-bold text-[#475569] uppercase tracking-wider">
          Lokasi
        </div>
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex gap-2">
          <label htmlFor="locationTextInput" className="sr-only">
            Lokasi
          </label>
          <input
            id="locationTextInput"
            title="User Location"
            aria-label="User Location"
            type="text"
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-sm bg-white text-black font-semibold outline-none focus:border-blue-500"
          />
          <button
            type="button"
            aria-label="Pilih lokasi"
            onClick={() => setIsProvinceModalOpen(true)}
            className="p-2 rounded text-white font-bold bg-gradient-to-b from-[#38bdf8] via-[#0ea5e9] to-[#0284c7] border-t border-white/40 border-b border-black/20 shadow-[0_3px_0_#0369a1,inset_0_1px_0_rgba(255,255,255,0.4)] active:translate-y-[2px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none"
          >
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
      </div>

      {/* AKUN SECTION */}
      <div>
        <div className="w-full bg-[#e2e8f0] py-1.5 px-6 text-[11px] font-bold text-[#475569] uppercase tracking-wider">
          Akun
        </div>
        <div className="bg-white px-6 py-5 border-b border-gray-200 flex flex-col items-center">
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
                (e.target as HTMLImageElement).src =
                  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%234A5568"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
              }}
            />
          </div>

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

          <div className="w-full flex flex-col gap-2.5">
            {!user?.app_metadata?.provider && (
              <button
                type="button"
                className="w-full text-center py-2.5 text-sm font-bold rounded text-slate-800 bg-gradient-to-b from-white via-[#f1f5f9] to-[#cbd5e1] border-t border-white/40 border-b border-black/20 shadow-[0_3px_0_#94a3b8,inset_0_1px_0_rgba(255,255,255,0.8)] active:translate-y-[2px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none"
              >
                Ubah Kata Sandi
              </button>
            )}
            <button
              type="button"
              onClick={signOut}
              className="w-full text-center py-2.5 text-sm font-bold rounded text-white bg-gradient-to-b from-red-400 via-red-500 to-red-600 border-t border-white/40 border-b border-black/20 shadow-[0_3px_0_#991b1b,inset_0_1px_0_rgba(255,255,255,0.4)] active:translate-y-[2px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none"
            >
              Keluar dari Akun Google
            </button>
          </div>

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
      </div>

      {/* Predefined Phrase Modal Dialog */}
      {isPhraseModalOpen && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0" onClick={() => setIsPhraseModalOpen(false)} />
          <div className="bg-white app-uniform-modal rounded-lg shadow-2xl flex flex-col z-10 overflow-hidden border border-gray-300">
            <div className="flex items-center px-4 py-3 bg-white shrink-0 border-b border-gray-200">
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
            <div className="flex-1 overflow-y-auto bg-white text-left divide-y divide-gray-100">
              {PREDEFINED_PHRASES.map((phrase, idx) => (
                <button
                  type="button"
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

      {/* Province Selector Modal Dialog */}
      {isProvinceModalOpen && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0" onClick={() => setIsProvinceModalOpen(false)} />
          <div className="bg-white app-uniform-modal rounded-lg shadow-2xl flex flex-col z-10 overflow-hidden border border-gray-300 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center px-4 py-3 bg-white shrink-0 border-b border-gray-200">
              <button
                type="button"
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
                <button
                  type="button"
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
              <button
                type="button"
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
                PROVINCE_CITIES[selectedProvince]?.map((city: string) => (
                  <button
                    type="button"
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
    </div>
  );
}
