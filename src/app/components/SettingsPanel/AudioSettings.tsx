import { usePTTStore } from '../../store/usePTTStore';
import { toast } from 'sonner';
import { requestBatteryWhitelist } from '../../utils/backgroundSurvival';

export function AudioSettings() {
  const {
    maxQueue,
    audioMode,
    builtInEcho,
    echoFeedback,
    noiseMode,
    pttVolume,
    vibrateOnStart,
    toneOnStartEnd,
    bgActive,
    fullDuplex,
    updateSettings,
  } = usePTTStore();

  const setMaxQueue = (val: string) => updateSettings({ maxQueue: val });
  const setAudioMode = (val: 'discussion' | 'music') => updateSettings({ audioMode: val });
  const setBuiltInEcho = (val: boolean) => updateSettings({ builtInEcho: val });
  const setEchoFeedback = (val: number) => updateSettings({ echoFeedback: val });
  const setNoiseMode = (val: 'normal' | 'ojol' | 'wind' | 'crowd' | 'emergency') =>
    updateSettings({ noiseMode: val });
  const setPttVolume = (val: number) => updateSettings({ pttVolume: val });
  const setVibrateOnStart = (val: boolean) => updateSettings({ vibrateOnStart: val });
  const setToneOnStartEnd = (val: boolean) => updateSettings({ toneOnStartEnd: val });
  const setBgActive = (val: boolean) => updateSettings({ bgActive: val });
  const setFullDuplex = (val: boolean) => updateSettings({ fullDuplex: val });

  return (
    <div className="flex flex-col gap-4">
      {/* ANTRIAN MAKSIMAL SECTION */}
      <div>
        <div className="w-full bg-[#e2e8f0] py-1.5 px-6 text-[11px] font-bold text-[#475569] uppercase tracking-wider">
          Antrian Maksimal Pemutar Suara (per 20ms)
        </div>
        <div className="bg-white px-6 py-4 border-b border-gray-200">
          <label htmlFor="maxQueueInput" className="sr-only">
            Max Queue
          </label>
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
      </div>

      {/* MODE AUDIO SECTION */}
      <div>
        <div className="w-full bg-[#e2e8f0] py-1.5 px-6 text-[11px] font-bold text-[#475569] uppercase tracking-wider">
          Mode Audio
        </div>
        <div className="bg-white px-6 py-5 border-b border-gray-200 flex flex-col gap-4">
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
        </div>
      </div>

      {/* PEREDAM BISING & BACKGROUND SURVIVAL SECTION */}
      <div>
        <div className="w-full bg-[#e2e8f0] py-1.5 px-6 text-[11px] font-bold text-[#475569] uppercase tracking-wider">
          Peredam Bising & Siaga Latar Belakang
        </div>
        <div className="bg-white px-6 py-5 border-b border-gray-200 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="noiseModeSelect" className="text-xs font-semibold text-gray-700">
              Mode Peredam Bising Adaptif (HPF/AGC/Bandpass)
            </label>
            <select
              id="noiseModeSelect"
              title="Mode Peredam Bising"
              aria-label="Mode Peredam Bising"
              value={noiseMode}
              onChange={(e) =>
                setNoiseMode(e.target.value as 'normal' | 'ojol' | 'wind' | 'crowd' | 'emergency')
              }
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
      </div>

      {/* AUDIO VOLUME SLIDER & OPTIONS */}
      <div>
        <div className="w-full bg-[#e2e8f0] py-1.5 px-6 text-[11px] font-bold text-[#475569] uppercase tracking-wider">
          Volume & Nada Sinyal
        </div>
        <div className="bg-white px-6 py-5 border-b border-gray-200 flex flex-col gap-4">
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
        </div>
      </div>
    </div>
  );
}
