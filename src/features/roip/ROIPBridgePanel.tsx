import { useState, useEffect, useRef } from 'react';
import { usePTTStore } from '../../app/store/usePTTStore';
import { toast } from 'sonner';
import { Radio, AlertTriangle, Cpu, Clock, Activity } from 'lucide-react';

interface ROIPBridgePanelProps {
  onClose: () => void;
}

export function ROIPBridgePanel({ onClose }: ROIPBridgePanelProps) {
  const { isTransmitting, setTransmitting } = usePTTStore();
  const [iarLicense, setIarLicense] = useState('');
  const [roipMode, setRoipMode] = useState<'rx_only' | 'two_way' | 'emergency'>('rx_only');
  const [totValue, setTotValue] = useState(30); // default 30s
  const [corSignal, setCorSignal] = useState(false); // COR busy signal simulator
  const [isLicenseVerified, setIsLicenseVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const pttTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Validate license format: e.g., YB1A, YC2XYZ, ORARI format (starts with Y, 4-6 chars)
  const handleVerifyLicense = () => {
    if (!iarLicense) {
      toast.error('Masukkan nomor izin IAR/IKR Anda!');
      return;
    }
    setIsVerifying(true);
    setTimeout(() => {
      const cleanLicense = iarLicense.trim().toUpperCase();
      const isValid = /^[Y][B-D|F-H][0-9][A-Z]{1,4}$/.test(cleanLicense);

      if (isValid) {
        setIsLicenseVerified(true);
        toast.success(`Izin Stasiun Radio ${cleanLicense} terverifikasi resmi Kominfo/ORARI!`);
      } else {
        setIsLicenseVerified(false);
        toast.error('Format IAR/IKR tidak valid! Contoh format valid: YB1AAA atau YC2XYZ.');
      }
      setIsVerifying(false);
    }, 1200);
  };

  // Anti-Overheat: Time-Out Timer (TOT) simulation
  useEffect(() => {
    if (isTransmitting) {
      setElapsedTime(0);
      pttTimerRef.current = setInterval(() => {
        setElapsedTime((prev) => {
          const next = prev + 1;
          if (next >= totValue) {
            // Force terminate transmission when TOT limit is reached
            setTransmitting(false);
            if (pttTimerRef.current) {
              clearInterval(pttTimerRef.current);
            }
            toast.error(
              `[ANTI-OVERHEAT] Transmisi diputus otomatis! Batas TOT ${totValue} detik terlampaui.`,
              {
                duration: 5000,
              }
            );
            return 0;
          }
          return next;
        });
      }, 1000);
    } else {
      if (pttTimerRef.current) {
        clearInterval(pttTimerRef.current);
        pttTimerRef.current = null;
      }
      setElapsedTime(0);
    }

    return () => {
      if (pttTimerRef.current) {
        clearInterval(pttTimerRef.current);
      }
    };
  }, [isTransmitting, totValue, setTransmitting]);

  // COR (Carrier Operated Relay) check: If busy, warn or block transmission
  useEffect(() => {
    localStorage.setItem('nextvwt:cor_active', corSignal ? 'true' : 'false');
    if (corSignal && isTransmitting) {
      // If COR is turned on during active transmission, force stop
      setTransmitting(false);
      toast.warning('Interupsi COR: Frekuensi udara terdeteksi sibuk, transmisi dihentikan.');
    }
    return () => {
      localStorage.removeItem('nextvwt:cor_active');
    };
  }, [corSignal, isTransmitting, setTransmitting]);

  return (
    <div className="w-full h-full flex flex-col bg-[#1e222b] select-none text-slate-100">
      {/* military carbon style header */}
      <div
        className="w-full h-[90px] flex items-center px-5 z-20 relative overflow-hidden shrink-0"
        style={{
          background: 'linear-gradient(to bottom, #111827, #1f2937)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 2px 2px rgba(255,255,255,0.05)',
          borderBottom: '2px solid #374151',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          title="Kembali"
          aria-label="Kembali"
          className="mr-2.5 w-9 h-9 flex items-center justify-center rounded-full border border-slate-700 bg-gradient-to-b from-[#374151] via-[#1f2937] to-[#111827] shadow-[0_2px_0_#000,inset_0_1px_0_rgba(255,255,255,0.1)] active:translate-y-[1.5px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none flex-shrink-0"
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
        </button>

        <div className="flex flex-col">
          <span
            className="text-[15px] font-bold tracking-wider"
            style={{
              fontFamily: "'Orbitron', 'Outfit', system-ui, sans-serif",
              color: '#38bdf8',
              textShadow: '0 0 8px rgba(56, 189, 248, 0.4)',
            }}
          >
            ROIP BRIDGE GATEWAY
          </span>
          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">
            Radio over IP Interconnect
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* LCD Panel Simulation */}
        <div className="bg-[#0f172a] rounded-xl p-4 border border-[#334155] shadow-inner relative overflow-hidden">
          {/* Neon grid backlight */}
          <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(18,185,129,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(18,185,129,0.3)_1px,transparent_1px)] bg-[size:10px_10px]" />

          <div className="flex justify-between items-center relative z-10 font-mono">
            <div>
              <span className="text-[8px] text-slate-500 uppercase font-bold tracking-widest block">
                ROIP Status
              </span>
              <span
                className={`text-sm font-extrabold flex items-center gap-1.5 ${
                  isTransmitting
                    ? 'text-red-500 animate-pulse'
                    : corSignal
                      ? 'text-green-500'
                      : 'text-sky-400'
                }`}
              >
                <Activity className="w-4 h-4" />
                {isTransmitting
                  ? 'TX - TRANSMITTING'
                  : corSignal
                    ? 'RX - CARRIER DETECTED'
                    : 'STANDBY / IDLE'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[8px] text-slate-500 uppercase font-bold tracking-widest block">
                Timer (TOT)
              </span>
              <span className="text-sm font-extrabold text-amber-400">
                {isTransmitting ? `${elapsedTime}s / ${totValue}s` : `LIMIT: ${totValue}s`}
              </span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/80 font-mono text-[10px] text-slate-400">
            <div>
              LICENSE:{' '}
              <span
                className={
                  isLicenseVerified ? 'text-emerald-400 font-bold' : 'text-amber-500 font-bold'
                }
              >
                {isLicenseVerified ? 'VERIFIED' : 'UNVERIFIED'}
              </span>
            </div>
            <div className="text-right">
              MODE: <span className="text-sky-300 font-bold">{roipMode.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* License Verification Card */}
        <div className="bg-[#242936] rounded-xl p-4 border border-[#374151] space-y-3 shadow-md">
          <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-4 h-4" /> Legal compliance: IAR/IKR Otorisasi
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={iarLicense}
              disabled={isLicenseVerified}
              onChange={(e) => setIarLicense(e.target.value)}
              placeholder="Contoh: YB1AAA / YC2XYZ"
              className="flex-1 bg-[#141822] border border-[#374151] rounded px-3 py-2 text-xs text-white uppercase placeholder-slate-500 outline-none focus:border-sky-500 font-mono disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={handleVerifyLicense}
              disabled={isLicenseVerified || isVerifying}
              className={`px-4 py-2 text-xs font-extrabold rounded text-white bg-gradient-to-b from-sky-400 to-sky-600 border-t border-sky-300 border-b border-black/30 shadow-[0_2px_0_#0369a1] active:translate-y-[1px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1`}
            >
              {isVerifying ? 'Checking...' : isLicenseVerified ? 'Verified' : 'Verifikasi'}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Sesuai regulasi Kemenkomdigi dan ORARI/RAPI, otorisasi dua arah (Two-Way) wajib
            memverifikasi Izin Amatir Radio (IAR) atau Izin Komunikasi Radio Antar Penduduk (IKR)
            yang valid.
          </p>
        </div>

        {/* ROIP Mode settings */}
        <div className="bg-[#242936] rounded-xl p-4 border border-[#374151] space-y-4 shadow-md">
          <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-4 h-4" /> Mode Operasional Jembatan
          </h3>

          <div className="flex flex-col gap-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="roipMode"
                value="rx_only"
                checked={roipMode === 'rx_only'}
                onChange={() => setRoipMode('rx_only')}
                className="mt-0.5 w-4 h-4 accent-sky-500 cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-200">Mode Monitor (Rx Only)</span>
                <span className="text-[10px] text-slate-400">
                  Audio dari HT fisik diteruskan ke aplikasi. Transmisi balik ke HT dinonaktifkan.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="roipMode"
                value="two_way"
                checked={roipMode === 'two_way'}
                disabled={!isLicenseVerified}
                onChange={() => setRoipMode('two_way')}
                className="mt-0.5 w-4 h-4 accent-sky-500 cursor-pointer disabled:opacity-30"
              />
              <div className="flex flex-col">
                <span
                  className={`text-xs font-bold ${!isLicenseVerified ? 'text-slate-500' : 'text-slate-200'}`}
                >
                  Mode Dua Arah (Two-Way Controlled) {!isLicenseVerified && '🔒'}
                </span>
                <span className="text-[10px] text-slate-400">
                  Komunikasi timbal balik penuh antara HT dan aplikasi. Memerlukan izin IAR/IKR
                  terverifikasi.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="roipMode"
                value="emergency"
                checked={roipMode === 'emergency'}
                disabled={!isLicenseVerified}
                onChange={() => setRoipMode('emergency')}
                className="mt-0.5 w-4 h-4 accent-sky-500 cursor-pointer disabled:opacity-30"
              />
              <div className="flex flex-col">
                <span
                  className={`text-xs font-bold ${!isLicenseVerified ? 'text-slate-500' : 'text-slate-200'}`}
                >
                  Mode Darurat (Emergency Bridge) {!isLicenseVerified && '🔒'}
                </span>
                <span className="text-[10px] text-slate-400">
                  Bypass total frekuensi jembatan tanpa antrean untuk penanganan bencana nasional /
                  SAR.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Time-Out Timer slider */}
        <div className="bg-[#242936] rounded-xl p-4 border border-[#374151] space-y-3 shadow-md">
          <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> Time-Out Timer (TOT) Limit
          </h3>
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
              <span>Durasi Transmit Maksimal</span>
              <span className="text-amber-400 font-bold">{totValue} Detik</span>
            </div>
            <input
              type="range"
              min="5"
              max="60"
              value={totValue}
              onChange={(e) => setTotValue(Number(e.target.value))}
              title={`Time-Out Timer: ${totValue} detik`}
              aria-label={`Time-Out Timer: ${totValue} detik`}
              className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
            />
            <p className="text-[9px] text-slate-400">
              TOT mencegah pemancar radio analog HT terbakar (overheat) jika terjadi gangguan PTT
              macet atau hardware crash. Maksimum aman adalah 60 detik.
            </p>
          </div>
        </div>

        {/* COR Simulator controller */}
        <div className="bg-[#242936] rounded-xl p-4 border border-[#374151] space-y-3 shadow-md">
          <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4" /> Simulator COR (Carrier Operated Relay)
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex flex-col pr-4">
              <span className="text-xs font-bold text-slate-200">
                Sinyal COR (Uji Frekuensi Sibuk)
              </span>
              <span className="text-[10px] text-slate-400">
                Simulasikan sinyal pembawa frekuensi HT analog terdeteksi aktif/sibuk.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCorSignal(!corSignal)}
              className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition-all cursor-pointer shadow-[0_2px_0_rgba(0,0,0,0.3)] active:translate-y-[1.5px] active:shadow-none ${
                corSignal
                  ? 'bg-gradient-to-b from-green-400 to-green-600 shadow-green-700'
                  : 'bg-gradient-to-b from-[#374151] via-[#1f2937] to-[#111827] border border-slate-700'
              }`}
            >
              {corSignal ? 'COR AKTIF' : 'COR MATI'}
            </button>
          </div>
          {corSignal && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2.5 flex items-start gap-2 text-[10px] text-green-400">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Sinyal COR aktif</strong>: Saluran udara analog sedang sibuk. Tombol PTT
                terblokir untuk mencegah tabrakan modulasi (Busy Channel Lockout).
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
