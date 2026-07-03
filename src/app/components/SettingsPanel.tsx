import { useState } from 'react';
import vintageMic from '../../assets/vintage_mic.png';
import { AudioSettings } from './SettingsPanel/AudioSettings';
import { ProfileSettings } from './SettingsPanel/ProfileSettings';
import { AppearanceSettings } from './SettingsPanel/AppearanceSettings';
import { NetworkSettings } from './SettingsPanel/NetworkSettings';

export interface SettingsPanelProps {
  onClose: () => void;
  onOpenModeration?: () => void;
  onOpenRoip?: () => void;
}

export function SettingsPanel({ onClose, onOpenModeration, onOpenRoip }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'audio' | 'appearance' | 'network'>(
    'profile'
  );
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);

  const handleOpenModeration = () => {
    onClose();
    if (onOpenModeration) {
      onOpenModeration();
    }
  };

  const handleOpenRoip = () => {
    onClose();
    if (onOpenRoip) {
      onOpenRoip();
    }
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
        <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-white/35 to-transparent pointer-events-none z-10" />

        <button
          type="button"
          onClick={onClose}
          className="mr-2.5 w-9 h-9 flex items-center justify-center rounded-full border border-slate-300 bg-gradient-to-b from-white via-[#f1f5f9] to-[#cbd5e1] shadow-[0_2px_0_#94a3b8,inset_0_1px_0_rgba(255,255,255,0.8)] active:translate-y-[1.5px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none relative z-25 flex-shrink-0"
          style={{ color: 'var(--header-text-color)' }}
        >
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

        <svg
          viewBox="0 0 100 100"
          className="w-[52px] h-[52px] relative z-25 mr-0"
          style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.25))' }}
        >
          <image
            href={vintageMic}
            x="0"
            y="0"
            width="100"
            height="100"
            preserveAspectRatio="xMidYMid meet"
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

      {/* Tab Navigation Menu */}
      <div className="flex border-b border-gray-200 bg-white shrink-0 shadow-sm relative z-20">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all cursor-pointer focus:outline-none ${
            activeTab === 'profile'
              ? 'border-[#0ea5e9] text-[#0ea5e9]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Profil
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('audio')}
          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all cursor-pointer focus:outline-none ${
            activeTab === 'audio'
              ? 'border-[#0ea5e9] text-[#0ea5e9]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Audio
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('appearance')}
          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all cursor-pointer focus:outline-none ${
            activeTab === 'appearance'
              ? 'border-[#0ea5e9] text-[#0ea5e9]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Tampilan
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('network')}
          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all cursor-pointer focus:outline-none ${
            activeTab === 'network'
              ? 'border-[#0ea5e9] text-[#0ea5e9]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Lainnya
        </button>
      </div>

      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto w-full pb-8">
        {activeTab === 'profile' && <ProfileSettings />}
        {activeTab === 'audio' && <AudioSettings />}
        {activeTab === 'appearance' && <AppearanceSettings />}
        {activeTab === 'network' && (
          <NetworkSettings
            onOpenModeration={handleOpenModeration}
            onOpenRoip={handleOpenRoip}
            onOpenUserGuide={() => setIsUserGuideOpen(true)}
          />
        )}
      </div>

      {/* User Guide Modal Dialog */}
      {isUserGuideOpen && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0" onClick={() => setIsUserGuideOpen(false)} />
          <div className="bg-white app-uniform-modal rounded-lg shadow-2xl flex flex-col z-10 overflow-hidden border border-gray-300">
            <div className="flex items-center px-4 py-3 bg-white shrink-0 border-b border-gray-200">
              <button
                type="button"
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

            <div className="flex-1 overflow-y-auto p-4 text-left text-xs text-gray-700 space-y-4 bg-gray-50 leading-relaxed">
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
    </div>
  );
}
