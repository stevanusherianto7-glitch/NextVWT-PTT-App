import { useState, useEffect } from 'react';
import { usePTTStore } from '../../app/store/usePTTStore';
import { getSupabase } from '../../app/utils/supabase';
import { STATIC_CHANNELS, ChannelItem } from '../../app/utils/constants';
import { useChannelRole } from './useChannelRole';
import { Shield, Key, Sparkles, Lock, Unlock, ArrowRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface PrivateChannelPanelProps {
  onClose: () => void;
}

export function PrivateChannelPanel({ onClose }: PrivateChannelPanelProps) {
  const { channelNumber, userId, setChannelNumber, user, infoText, callSign } = usePTTStore();
  const roomId = `ptt-room-${channelNumber}`;

  const [hasBadge, setHasBadge] = useState(false);
  const [checkingBadge, setCheckingBadge] = useState(true);
  const [isExchanging, setIsExchanging] = useState(false);

  // Locked channel PIN overlay
  const [selectedChannel, setSelectedChannel] = useState<ChannelItem | null>(null);
  const [pinCode, setPinCode] = useState('');

  const { role } = useChannelRole(roomId, userId);

  const isLocalUser = true;
  const localName = user?.user_metadata?.full_name || infoText || 'Pebe Herianto';
  const localCallSign = callSign;

  const isNocUser =
    userId === 'noc_global' ||
    (isLocalUser && (localName === 'NOC Global' || localCallSign === 'NOC-01'));

  const isSysAdminUser =
    userId === 'sys_admin_vwt' ||
    (isLocalUser && (localName === 'Sys Admin VWT' || localCallSign === 'SYS-01'));

  const isImplicitAllowed =
    role === 'operator' ||
    role === 'pjc' ||
    role === 'sys_admin' ||
    role === 'noc' ||
    isNocUser ||
    isSysAdminUser;
  const hasAccess = isImplicitAllowed || hasBadge;

  // Fetch badges to check if user has 'badge_merah'
  const checkBadgeStatus = async () => {
    setCheckingBadge(true);
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', userId)
        .eq('badge_key', 'badge_merah')
        .maybeSingle();

      if (!error && data) {
        setHasBadge(true);
      } else {
        setHasBadge(false);
      }
    } catch (err) {
      console.warn('Failed to check badge status:', err);
    } finally {
      setCheckingBadge(false);
    }
  };

  useEffect(() => {
    checkBadgeStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Exchange 10 coins for Badge Merah (Now FREE!)
  const handleExchangeBadge = async () => {
    setIsExchanging(true);
    try {
      const supabase = await getSupabase();

      // Insert badge directly without coin checks or deductions
      const { error: badgeErr } = await supabase.from('user_badges').insert({
        user_id: userId,
        badge_key: 'badge_merah',
        badge_label: 'Badge Merah',
      });

      if (badgeErr) throw badgeErr;

      // Log the badge activation action
      try {
        await supabase.from('channel_moderation_logs').insert({
          room_id: roomId,
          actor_id: userId,
          actor_role: role || 'guest',
          target_user_id: userId,
          action: 'ACTIVATE_BADGE_MERAH',
          detail: {
            actor_name: localName,
            target_name: localName,
            badge_key: 'badge_merah',
            badge_label: 'Badge Merah',
          },
        });
      } catch (logErr) {
        console.warn('Failed to insert badge moderation log:', logErr);
      }

      toast.success('Selamat! Anda berhasil mengaktifkan Badge Merah 🛡️');
      setHasBadge(true);
    } catch (err) {
      console.error('Failed to exchange badge:', err);
      toast.error('Gagal mengaktifkan Badge Merah.');
    } finally {
      setIsExchanging(false);
    }
  };

  // Verify PIN passcode
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannel) return;

    // Secret passcode is 1234 or 9999
    if (pinCode === '1234' || pinCode === '9999') {
      toast.success(`Akses masuk terbuka! Berpindah ke Saluran ${selectedChannel.number}`);
      setChannelNumber(selectedChannel.number);
      setSelectedChannel(null);
      setPinCode('');
      onClose();
    } else {
      toast.error('Kode PIN salah! Silakan coba lagi.');
      setPinCode('');
    }
  };

  // Get restricted channels (type === 'red')
  const redChannels = STATIC_CHANNELS.filter((ch) => ch.type === 'red');

  const handleChannelJoin = (ch: ChannelItem) => {
    if (hasAccess) {
      toast.success(`Memasuki Saluran Privat ${ch.number}`);
      setChannelNumber(ch.number);
      onClose();
    } else {
      // Trigger PIN verification
      setSelectedChannel(ch);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#111216] select-none text-white relative">
      {/* Header */}
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
        </button>

        <div className="flex flex-col justify-center relative z-25">
          <span
            className="text-[15px] font-bold tracking-wide leading-tight"
            style={{
              fontFamily: "'Outfit', 'Orbitron', sans-serif",
              color: 'var(--header-text-color)',
            }}
          >
            Saluran Privat
          </span>
          <span className="text-[10px] text-slate-400 font-bold tracking-wider mt-0.5 uppercase">
            Akses Eksklusif & Badge Merah
          </span>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#13151b] scrollbar-thin">
        {/* Status Card */}
        <div className="rounded-xl p-4 bg-slate-900 border border-slate-800 space-y-3 relative overflow-hidden shadow-lg">
          <div className="absolute -top-10 -right-10 w-20 h-20 bg-rose-500/10 rounded-full blur-xl" />

          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-extrabold">
                Status Badge Merah
              </span>
              {checkingBadge ? (
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1 font-bold">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Memeriksa status...
                </p>
              ) : hasAccess ? (
                <h3 className="text-emerald-400 text-sm font-black flex items-center gap-1.5 mt-1">
                  <Unlock className="w-4 h-4" /> AKSES TERBUKA 🛡️
                </h3>
              ) : (
                <h3 className="text-rose-500 text-sm font-black flex items-center gap-1.5 mt-1">
                  <Lock className="w-4 h-4" /> AKSES TERBATAS
                </h3>
              )}
            </div>
            <Shield
              className={`w-8 h-8 ${hasAccess ? 'text-emerald-400 fill-emerald-500/10' : 'text-rose-500 fill-rose-500/10'}`}
            />
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex justify-between items-center text-[10px] text-slate-400">
            <span className="flex items-center gap-1 font-bold">
              Akses Saluran: Bebas / Tanpa Koin
            </span>
          </div>
        </div>

        {/* Unlock via Coins Card (if user has no access) */}
        {!checkingBadge && !hasAccess && (
          <div className="rounded-xl p-4 bg-indigo-950/20 border border-indigo-500/20 space-y-3 shadow-md">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <h4 className="text-xs font-black text-indigo-300 uppercase tracking-wide">
                  Tukarkan Badge Merah
                </h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-normal font-semibold">
                  Mendapatkan akses penuh permanen ke seluruh Saluran Privat tanpa harus memasukkan
                  kode PIN.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExchangeBadge}
              disabled={isExchanging}
              className="w-full py-2.5 rounded-xl text-white font-bold text-[11px] uppercase bg-gradient-to-b from-[#818cf8] via-[#4f46e5] to-[#3730a3] border-t border-white/20 border-b border-black/20 shadow-md active:translate-y-[1px] active:shadow-none hover:brightness-105 transition-all duration-100 flex items-center justify-center gap-1.5 focus:outline-none cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              🛡️ Aktifkan Badge Merah — Gratis
            </button>
          </div>
        )}

        {/* Private Channels List */}
        <div className="space-y-2">
          <h4 className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider px-1">
            Daftar Saluran Privat ({redChannels.length})
          </h4>

          <div className="divide-y divide-slate-800/60">
            {redChannels.map((ch) => (
              <div key={ch.number} className="py-3.5 flex justify-between items-center gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Badge Label */}
                  <div
                    className="w-12 py-1.5 flex items-center justify-center text-white font-black text-xs shrink-0 bg-[#e11d48] border-t-2 border-l-2 border-t-white/45 border-l-white/45 border-r-2 border-b-2 border-r-black/55 border-b-black/55 shadow-[inset_1px_1px_0px_rgba(255,255,255,0.4)]"
                    style={{ textShadow: '1px 1px 1px rgba(0,0,0,0.8)' }}
                  >
                    {ch.number.toString().padStart(3, '0')}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-200 truncate">{ch.name}</p>
                    <p className="text-[9px] text-slate-400 font-semibold truncate mt-0.5">
                      {ch.users.length > 0 ? `${ch.users.length} ANGGOTA` : '0 ANGGOTA'}
                    </p>
                  </div>
                </div>

                {/* Entry Action */}
                <button
                  type="button"
                  onClick={() => handleChannelJoin(ch)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all ${
                    hasAccess
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/25'
                      : 'bg-rose-600/20 text-rose-500 border border-rose-500/25'
                  }`}
                >
                  {hasAccess ? (
                    <>
                      Masuk <ArrowRight className="w-3 h-3" />
                    </>
                  ) : (
                    <>
                      Kunci <Lock className="w-3 h-3" />
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secret PIN Passcode Unlock Dialog */}
      {selectedChannel && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-6 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-[300px] rounded-2xl shadow-2xl p-5 flex flex-col text-left space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-400 shrink-0" />
              <h3 className="text-sm font-extrabold text-white">Kode Akses PIN</h3>
            </div>

            <p className="text-[11px] text-slate-400 leading-normal font-semibold">
              Saluran {selectedChannel.number} memerlukan kode PIN untuk masuk.
            </p>

            <form onSubmit={handlePinSubmit} className="space-y-3">
              <input
                type="password"
                placeholder="Masukkan 4-digit PIN..."
                maxLength={6}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 focus:border-slate-700 outline-none rounded-xl px-3.5 py-2 text-center text-sm font-black tracking-widest text-white"
              />

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedChannel(null);
                    setPinCode('');
                  }}
                  className="flex-1 py-2 rounded-xl text-[10px] font-bold bg-slate-800 hover:bg-slate-750 text-slate-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!pinCode}
                  className="flex-1 py-2 rounded-xl text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 cursor-pointer disabled:opacity-40"
                >
                  Buka Kunci
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
