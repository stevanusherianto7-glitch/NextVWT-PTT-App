import { usePTTStore } from '../../store/usePTTStore';
import { useChannelRole } from '../../../features/moderation/useChannelRole';
import { canPerformAction } from '../../../features/moderation/permissions';
import { Shield, ChevronRight } from 'lucide-react';

interface NetworkSettingsProps {
  onOpenModeration?: () => void;
  onOpenRoip?: () => void;
  onOpenUserGuide: () => void;
}

export function NetworkSettings({
  onOpenModeration,
  onOpenRoip,
  onOpenUserGuide,
}: NetworkSettingsProps) {
  const { channelNumber: channel, userId } = usePTTStore();
  const roomId = `ptt-room-${channel}`;
  const { role } = useChannelRole(roomId, userId);

  return (
    <div className="flex flex-col gap-4">
      {/* MODERATION CHANNEL TAB */}
      {canPerformAction(role, 'VIEW_ADMIN_PANEL') && channel !== 100 && (
        <div>
          <div className="w-full bg-[#e2e8f0] py-1.5 px-6 text-[11px] font-bold text-[#475569] uppercase tracking-wider">
            Manajemen Saluran
          </div>
          <div className="w-full bg-white border-b border-gray-200">
            <button
              type="button"
              onClick={onOpenModeration}
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
        </div>
      )}

      {/* FITUR DEVELOPER & NOC */}
      {(role === 'noc' || role === 'sys_admin') && (
        <div>
          <div className="w-full bg-[#e2e8f0] py-2 px-6 border-b border-gray-200 flex flex-col gap-2.5">
            <span className="text-[10px] font-bold text-[#475569] uppercase tracking-wider">
              Akses Khusus NOC & Developer
            </span>
            <div className="flex pb-1.5">
              <button
                type="button"
                onClick={onOpenRoip}
                className="w-full text-center py-2 text-xs font-bold rounded text-white bg-gradient-to-b from-sky-400 to-sky-500 border-t border-white/30 border-b border-black/20 shadow-[0_2.5px_0_#0369a1] active:translate-y-[1.5px] active:shadow-none hover:brightness-105 cursor-pointer focus:outline-none flex items-center justify-center gap-1"
              >
                Jembatan ROIP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TENTANG SECTION */}
      <div>
        <div className="w-full bg-[#e2e8f0] py-1.5 px-6 text-[11px] font-bold text-[#475569] uppercase tracking-wider">
          Tentang
        </div>
        <div className="bg-white px-6 py-5 border-b border-gray-200 flex flex-col gap-3">
          <div className="text-xs font-semibold text-gray-700 mb-1">
            Versi: <span className="font-bold text-black">2.0.0</span>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              className="w-full text-left px-4 py-2.5 text-xs font-bold rounded text-slate-800 bg-gradient-to-b from-white via-[#f1f5f9] to-[#cbd5e1] border-t border-white/40 border-b border-black/20 shadow-[0_3px_0_#94a3b8,inset_0_1px_0_rgba(255,255,255,0.8)] active:translate-y-[2px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none"
            >
              Persyaratan & Ketentuan
            </button>
            <button
              type="button"
              className="w-full text-left px-4 py-2.5 text-xs font-bold rounded text-slate-800 bg-gradient-to-b from-white via-[#f1f5f9] to-[#cbd5e1] border-t border-white/40 border-b border-black/20 shadow-[0_3px_0_#94a3b8,inset_0_1px_0_rgba(255,255,255,0.8)] active:translate-y-[2px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none"
            >
              Kebijakan Privasi
            </button>
            <button
              type="button"
              onClick={onOpenUserGuide}
              className="w-full text-left px-4 py-2.5 text-xs font-bold rounded text-slate-800 bg-gradient-to-b from-white via-[#f1f5f9] to-[#cbd5e1] border-t border-white/40 border-b border-black/20 shadow-[0_3px_0_#94a3b8,inset_0_1px_0_rgba(255,255,255,0.8)] active:translate-y-[2px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none"
            >
              Panduan Pengguna
            </button>
            <button
              type="button"
              className="w-full text-left px-4 py-2.5 text-xs font-bold rounded text-slate-800 bg-gradient-to-b from-white via-[#f1f5f9] to-[#cbd5e1] border-t border-white/40 border-b border-black/20 shadow-[0_3px_0_#94a3b8,inset_0_1px_0_rgba(255,255,255,0.8)] active:translate-y-[2px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none"
            >
              Legal
            </button>
            <button
              type="button"
              className="w-full text-left px-4 py-2.5 text-xs font-bold rounded text-slate-800 bg-gradient-to-b from-white via-[#f1f5f9] to-[#cbd5e1] border-t border-white/40 border-b border-black/20 shadow-[0_3px_0_#94a3b8,inset_0_1px_0_rgba(255,255,255,0.8)] active:translate-y-[2px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none"
            >
              Jika Suka Berikan Rating
            </button>
            <button
              type="button"
              className="w-full text-left px-4 py-2.5 text-xs font-bold rounded text-white bg-gradient-to-b from-red-400 via-red-500 to-red-600 border-t border-white/40 border-b border-black/20 shadow-[0_3px_0_#991b1b,inset_0_1px_0_rgba(255,255,255,0.4)] active:translate-y-[2px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none mt-1"
            >
              Hapus Akun Saya
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
