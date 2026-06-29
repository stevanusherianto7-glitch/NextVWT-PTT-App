import { useState } from 'react';
import { usePTTStore } from '../../store/usePTTStore';

export function AppearanceSettings() {
  const {
    showPhotosInList,
    fastClick,
    showModulator,
    showPTT,
    pttSize,
    pttBottom,
    togglePtt,
    themeText,
    updateSettings,
  } = usePTTStore();

  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  const setShowPhotosInList = (val: boolean) => updateSettings({ showPhotosInList: val });
  const setFastClick = (val: boolean) => updateSettings({ fastClick: val });
  const setShowModulator = (val: boolean) => updateSettings({ showModulator: val });
  const setShowPTT = (val: boolean) => updateSettings({ showPTT: val });
  const setPttSize = (val: number) => updateSettings({ pttSize: val });
  const setPttBottom = (val: number) => updateSettings({ pttBottom: val });
  const setTogglePtt = (val: boolean) => updateSettings({ togglePtt: val });
  const setThemeText = (val: string) => updateSettings({ themeText: val });

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

  return (
    <div className="flex flex-col gap-4">
      {/* TAMPILAN DAFTAR PENGGUNA SECTION */}
      <div>
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
      </div>

      {/* PTT LAYOUT SECTION */}
      <div>
        <div className="w-full bg-[#e2e8f0] py-1.5 px-6 text-[11px] font-bold text-[#475569] uppercase tracking-wider">
          Tata Letak Tombol PTT
        </div>
        <div className="bg-white px-6 py-5 border-b border-gray-200 flex flex-col gap-4">
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
        </div>
      </div>

      {/* TEMA SECTION */}
      <div>
        <div className="w-full bg-[#e2e8f0] py-1.5 px-6 text-[11px] font-bold text-[#475569] uppercase tracking-wider">
          Tema
        </div>
        <div className="bg-white px-6 py-5 border-b border-gray-200">
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
        </div>
      </div>

      {/* Theme Selector Modal Dialog */}
      {isThemeModalOpen && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="absolute inset-0" onClick={() => setIsThemeModalOpen(false)} />
          <div className="bg-white app-uniform-modal rounded-lg shadow-2xl flex flex-col z-10 overflow-hidden border border-gray-300 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center px-4 py-3 bg-white shrink-0 border-b border-gray-200">
              <button
                type="button"
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
                  <button
                    type="button"
                    key={themeOpt.key}
                    onClick={() => {
                      setThemeText(themeOpt.key);
                      setIsThemeModalOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left cursor-pointer transition-all ${isActive ? 'bg-blue-50/50 border-blue-500 shadow-sm' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
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
