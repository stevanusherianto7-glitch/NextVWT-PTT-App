import { useEffect, useState } from 'react';
import { getSupabase } from '../../app/utils/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { RefreshCw, ClipboardList, Clock } from 'lucide-react';

interface ModerationLog {
  id: string;
  room_id: string;
  actor_id: string;
  actor_role: string;
  target_user_id?: string;
  action: string;
  detail: Record<string, unknown>;
  created_at: string;
}

interface ModerationLogPanelProps {
  roomId: string;
}

export function ModerationLogPanel({ roomId }: ModerationLogPanelProps) {
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadLogs() {
    if (!roomId) return;
    try {
      setLoading(true);
      const supabaseInstance = await getSupabase();
      const { data, error } = await supabaseInstance
        .from('channel_moderation_logs')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(40);

      if (error) {
        console.error('Error loading logs:', error);
      } else if (data) {
        setLogs(data as ModerationLog[]);
      }
    } catch (err) {
      console.error('Failed loading moderation logs:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();

    let channel: RealtimeChannel | null = null;
    (async () => {
      const supabaseInstance = await getSupabase();
      channel = supabaseInstance
        .channel(`moderation-logs:${roomId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'channel_moderation_logs',
            filter: `room_id=eq.${roomId}`,
          },
          (payload) => {
            setLogs((prev) => [payload.new as ModerationLog, ...prev]);
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        getSupabase().then((sub) => sub.removeChannel(channel!));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const getActorRoleLabel = (role: string) => {
    switch (role) {
      case 'noc':
        return 'N.O.C';
      case 'sys_admin':
        return 'Sys Admin';
      case 'pjc':
        return 'P.J.C';
      case 'operator':
        return 'Operator';
      default:
        return role.toUpperCase();
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'noc':
        return 'N.O.C';
      case 'sys_admin':
        return 'Sys Admin';
      case 'pjc':
        return 'P.J.C';
      case 'operator':
        return 'Operator';
      case 'guest':
        return 'Tamu';
      default:
        return role;
    }
  };

  const getActorLabel = (log: ModerationLog) => {
    const actorName = log.detail?.actor_name as string | undefined;
    if (actorName) {
      return `${actorName} (${log.actor_id.substring(0, 8)})`;
    }
    return log.actor_id.length > 8 ? log.actor_id.substring(0, 8) : log.actor_id;
  };

  const formatActionDescription = (log: ModerationLog) => {
    const targetName = log.detail?.target_name as string | undefined;
    const target = targetName
      ? `${targetName} (${log.target_user_id?.substring(0, 8) || ''})`
      : log.target_user_id || 'Sistem';
    const detail = log.detail || {};

    switch (log.action) {
      case 'SET_USER_ROLE':
        return `Mengubah jabatan ${target} menjadi ${getRoleLabel((detail.nextRole as string) || 'guest')} (sebelumnya ${getRoleLabel((detail.previousRole as string) || 'guest')}).`;
      case 'MUTE_USER':
        return `Membungkam ${target} selama ${(detail.minutes as number) > 0 ? `${detail.minutes} menit` : 'permanen'}.`;
      case 'UNMUTE_USER':
        return `Membatalkan pembungkaman ${target}.`;
      case 'BLOCK_PTT':
        return `Memblokir tombol bicara (PTT) ${target} selama ${(detail.minutes as number) > 0 ? `${detail.minutes} menit` : 'permanen'}.`;
      case 'UNBLOCK_PTT':
        return `Membuka blokir PTT ${target}.`;
      case 'BLOCK_CHAT':
        return `Memblokir chat ${target} selama ${(detail.minutes as number) > 0 ? `${detail.minutes} menit` : 'permanen'}.`;
      case 'UNBLOCK_CHAT':
        return `Membuka blokir chat ${target}.`;
      case 'KICK_USER':
        return `Mengeluarkan ${target} dari channel.`;
      case 'BAN_USER':
        return `Memblokir permanen (ban) ${target}${detail.reason ? ` dengan alasan: "${detail.reason}"` : ''}.`;
      case 'UNBAN_USER':
        return `Membatalkan blokir permanen (unban) ${target}.`;
      case 'ACTIVATE_BADGE_MERAH':
        return `Mengaktifkan Badge Merah (Akses Saluran Privat) untuk ${target}.`;
      case 'SET_STATUS_NORMAL':
        return `Mengubah status jalur ${target} menjadi normal (Voice).`;
      case 'SET_STATUS_MUTED':
        return `Mengubah status jalur ${target} menjadi Silent (Mute).`;
      case 'SET_STATUS_CONTROLLED':
        return `Mengubah status jalur ${target} menjadi Controlled.`;
      case 'SET_STATUS_WAIT':
        return `Mengubah status jalur ${target} menjadi Wait (Antri).`;
      case 'SET_STATUS_WAIT_CONTROLLED':
        return `Mengubah status jalur ${target} menjadi Wait Controlled.`;
      default:
        return `${log.action} pada ${target} ${JSON.stringify(detail)}`;
    }
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Panel bar */}
      <div className="flex justify-between items-center bg-black/10 p-2 rounded-lg border border-white/5">
        <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
          <ClipboardList className="h-3.5 w-3.5 text-emerald-400" />
          Log Aktivitas Moderasi
        </span>
        <button
          type="button"
          onClick={loadLogs}
          className="p-1 hover:bg-white/5 rounded text-slate-400 hover:text-white transition-colors"
          title="Segarkan Log"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {/* Logs Scroll Container */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
        {loading && logs.length === 0 ? (
          <div className="flex justify-center items-center py-8 text-xs text-slate-400 gap-1.5">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
            Memuat log...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center text-slate-500 py-8 text-sm">
            Belum ada aktivitas moderasi yang dicatat.
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="log-item-row border-emerald-500/5">
              <div className="log-meta">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">
                    Mod: {getActorLabel(log)}
                  </span>
                  <span className={`role-badge ${log.actor_role} text-[9px] px-1 py-0`}>
                    {getActorRoleLabel(log.actor_role)}
                  </span>
                </div>
                <span className="flex items-center gap-1 text-[9px] text-slate-500">
                  <Clock className="h-2.5 w-2.5" />
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
              <span className="log-text">{formatActionDescription(log)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
