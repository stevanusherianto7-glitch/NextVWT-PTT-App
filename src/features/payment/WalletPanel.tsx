import { useState, useEffect } from 'react';
import { usePTTStore } from '../../app/store/usePTTStore';
import { getSupabase } from '../../app/utils/supabase';
import { toast } from 'sonner';
import { Wallet, QrCode, Coins, ArrowRight, History, Sparkles, RefreshCw } from 'lucide-react';

interface WalletPanelProps {
  onClose: () => void;
}

interface TransactionItem {
  id: string;
  amount_koin: number;
  amount_rupiah: number;
  status: string;
  reference_id: string;
  created_at: string;
}

// Helper to generate HMAC-SHA256 signature in browser
async function generateHMAC(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await window.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const messageData = encoder.encode(message);
  const signature = await window.crypto.subtle.sign('HMAC', key, messageData);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function WalletPanel({ onClose }: WalletPanelProps) {
  const { user, coins, fetchCoins } = usePTTStore();
  const [amountOption, setAmountOption] = useState<{ koin: number; rupiah: number }>({
    koin: 20,
    rupiah: 20000,
  });
  const [referenceId, setReferenceId] = useState('');
  const [qrisGenerated, setQrisGenerated] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<TransactionItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const topupOptions = [
    { koin: 10, rupiah: 10000 },
    { koin: 20, rupiah: 20000 },
    { koin: 50, rupiah: 50000 },
    { koin: 100, rupiah: 100000 },
    { koin: 250, rupiah: 250000 },
  ];

  // Fetch transaction history
  const fetchTxHistory = async () => {
    if (!user) return;
    setIsLoadingHistory(true);
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.warn('Failed to fetch transaction history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchTxHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleGenerateQRIS = () => {
    const randomRef = `TX-QRIS-${Math.floor(100000 + Math.random() * 900000)}`;
    setReferenceId(randomRef);
    setQrisGenerated(true);
    toast.success('QRIS Dinamis berhasil di-generate!');
  };

  const handleSimulatePayment = async () => {
    if (!user || !referenceId) return;
    setIsProcessing(true);

    try {
      // 1. Calculate HMAC-SHA256 Signature
      // Webhook secret matches the default env fallback value
      const webhookSecret = 'dummy_webhook_secret_key_12345';
      const payloadString = `${user.id}:${amountOption.koin}:${amountOption.rupiah}:${referenceId}`;
      const signature = await generateHMAC(webhookSecret, payloadString);

      // 2. Call Edge Function Webhook
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

      const response = await fetch(`${supabaseUrl}/functions/v1/payment-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          userId: user.id,
          amountKoin: amountOption.koin,
          amountRupiah: amountOption.rupiah,
          referenceId: referenceId,
          signature: signature,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Server error');
      }

      toast.success(`Simulasi Top Up berhasil! +${amountOption.koin} Koin.`);
      setQrisGenerated(false);
      setReferenceId('');

      // Update local state
      fetchCoins();
      fetchTxHistory();
    } catch (error: unknown) {
      const err = error as Error;
      console.error(err);
      toast.error(`Gagal memproses pembayaran: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f0f0] select-none text-black">
      {/* Header Bar */}
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
          title="Kembali"
          aria-label="Kembali"
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
        </button>

        <span
          className="text-[16px] font-bold tracking-wide relative z-25 ml-0.5"
          style={{
            fontFamily: "'Outfit', 'Orbitron', system-ui, -apple-system, sans-serif",
            color: 'var(--header-text-color)',
          }}
        >
          Dompet Koin (Wallet)
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Balance Card - Premium Glassmorphism styling */}
        <div
          className="w-full rounded-2xl p-5 relative overflow-hidden border border-white/40 shadow-lg text-white"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            boxShadow: '0 8px 32px 0 rgba(15, 23, 42, 0.3), inset 0 2px 4px rgba(255,255,255,0.15)',
          }}
        >
          {/* Decorative glows */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-amber-500/20 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />

          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5" /> Saldo Koin Anda
              </p>
              <h2 className="text-3xl font-extrabold tracking-tight mt-1 flex items-center gap-2 text-amber-400">
                <Coins className="w-8 h-8 drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]" />
                {coins} <span className="text-xs text-slate-300 font-semibold uppercase">Koin</span>
              </h2>
            </div>
            <div className="bg-white/10 px-3 py-1.5 rounded-full border border-white/10 text-[10px] font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-300" /> Utility Coin
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700/60 flex justify-between items-center text-[10px] text-slate-400">
            <span>ID Akun: {user?.id?.slice(0, 8)}...</span>
            <button
              type="button"
              onClick={fetchCoins}
              className="flex items-center gap-1 hover:text-white cursor-pointer active:scale-95 transition-all"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
        </div>

        {/* Top Up Section */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <QrCode className="w-4 h-4 text-sky-500" /> Pengisian Koin (Top Up QRIS)
          </h3>

          {!qrisGenerated ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                {topupOptions.map((opt) => (
                  <button
                    type="button"
                    key={opt.koin}
                    onClick={() => setAmountOption(opt)}
                    className={`py-3 px-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      amountOption.koin === opt.koin
                        ? 'border-sky-500 bg-sky-50/50 shadow-sm ring-1 ring-sky-500/20'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-sm font-extrabold text-gray-800 flex items-center gap-1">
                      <Coins
                        className={`w-3.5 h-3.5 ${amountOption.koin === opt.koin ? 'text-amber-500' : 'text-gray-400'}`}
                      />
                      {opt.koin} Koin
                    </span>
                    <span className="text-[10px] text-gray-500 mt-1 font-semibold">
                      Rp {opt.rupiah.toLocaleString('id-ID')}
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleGenerateQRIS}
                className="w-full py-3 px-4 rounded-xl text-white font-bold text-xs bg-gradient-to-b from-[#38bdf8] via-[#0ea5e9] to-[#0284c7] border-t border-white/30 border-b border-black/20 shadow-[0_3px_0_#0284c7,inset_0_1px_0_rgba(255,255,255,0.4)] active:translate-y-[2px] active:shadow-none hover:brightness-105 transition-all duration-100 flex items-center justify-center gap-1.5 focus:outline-none cursor-pointer"
              >
                Generate QRIS Dinamis <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-4">
              <div className="text-center">
                <p className="text-xs font-bold text-gray-800">QRIS Dinamis Terbuat</p>
                <p className="text-[10px] text-gray-500">
                  Nominal: Rp {amountOption.rupiah.toLocaleString('id-ID')} ({amountOption.koin}{' '}
                  Koin)
                </p>
                <p className="text-[9px] font-mono text-gray-400 mt-0.5">Ref: {referenceId}</p>
              </div>

              {/* QRIS Simulated Visual casing */}
              <div className="w-[180px] h-[180px] bg-white border border-gray-200 p-3 rounded-lg flex flex-col justify-between items-center shadow-inner relative">
                {/* QR lines simulator */}
                <div className="w-full h-full flex flex-col gap-1.5 justify-center items-center opacity-85">
                  <div className="w-12 h-12 border-2 border-black rounded flex justify-center items-center">
                    <div className="w-6 h-6 bg-black" />
                  </div>
                  <div className="text-[9px] font-bold text-gray-700 tracking-wider">
                    QRIS SIMULATOR
                  </div>
                  <div className="flex gap-1 w-full justify-center">
                    <div className="w-2 h-2 bg-black" />
                    <div className="w-6 h-2 bg-black" />
                    <div className="w-2 h-2 bg-black" />
                  </div>
                </div>
              </div>

              <div className="w-full flex gap-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setQrisGenerated(false)}
                  className="flex-1 py-2 rounded-lg text-[10px] font-bold bg-white border border-gray-300 text-gray-700 cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleSimulatePayment}
                  className="flex-1 py-2 rounded-lg text-[10px] font-bold text-white bg-gradient-to-b from-[#4ade80] via-[#22c55e] to-[#16a34a] border-t border-white/40 border-b border-black/20 shadow-[0_2.5px_0_#15803d] active:translate-y-[2px] active:shadow-none hover:brightness-105 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {isProcessing ? 'Memproses...' : 'Simulasi Sukses'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* History Section */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <History className="w-4 h-4 text-emerald-500" /> Riwayat Transaksi Terbaru
          </h3>

          {isLoadingHistory ? (
            <div className="text-center py-6 text-xs text-gray-500">Memuat riwayat...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-400">
              Belum ada riwayat transaksi.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[220px] overflow-y-auto pr-1">
              {history.map((item) => (
                <div key={item.id} className="py-2.5 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-gray-800 flex items-center gap-1">
                      Top Up +{item.amount_koin} Koin
                    </p>
                    <p className="text-[9px] text-gray-400">
                      {new Date(item.created_at).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-700">
                      Rp {item.amount_rupiah.toLocaleString('id-ID')}
                    </p>
                    <span
                      className={`inline-block text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        item.status === 'success'
                          ? 'bg-emerald-100 text-emerald-700'
                          : item.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
