import { useState, useEffect, useCallback } from 'react';
import { usePTTStore } from '../../app/store/usePTTStore';
import { getSupabase } from '../../app/utils/supabase';
import { useChannelRole } from '../moderation/useChannelRole';
import { useChannelSettings } from '../moderation/useChannelSettings';
import { KaraokeQueueItem } from './types';
import {
  Music,
  Play,
  SkipForward,
  AlertCircle,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface KaraokeQueuePanelProps {
  onClose: () => void;
}

export function KaraokeQueuePanel({ onClose }: KaraokeQueuePanelProps) {
  const { channelNumber, userId, infoText, customPhotoUrl, profilePhotoOption, user } =
    usePTTStore();
  const roomId = `ptt-room-${channelNumber}`;

  const [queueList, setQueueList] = useState<KaraokeQueueItem[]>([]);
  const [songTitle, setSongTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);

  // Fetch channel role and settings
  const { role } = useChannelRole(roomId, userId);
  const { settings: channelSettings } = useChannelSettings(roomId);

  const isGuest = role === 'guest';
  const queueEnabled = channelSettings?.karaoke_queue_enabled ?? true;
  const allowGuestQueue = channelSettings?.allow_guest_queue ?? true;

  const canJoin = queueEnabled && (!isGuest || allowGuestQueue);
  const isAdmin = role === 'operator' || role === 'pjc' || role === 'sys_admin' || role === 'noc';

  // Find if current user is in the queue
  const myActiveItem = queueList.find((item) => item.user_id === userId);

  // Fetch queue from database
  const fetchQueue = useCallback(async () => {
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('karaoke_queue')
        .select('*')
        .eq('room_id', roomId)
        .in('status', ['waiting', 'ready', 'live'])
        .order('queue_number', { ascending: true });

      if (error) throw error;
      setQueueList(data || []);
    } catch (err) {
      console.error('Failed to fetch karaoke queue:', err);
      toast.error('Gagal memuat antrean karaoke.');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  // Real-time Postgres changes subscription
  useEffect(() => {
    let mounted = true;
    let queueChannel: RealtimeChannel | null = null;

    fetchQueue();

    (async () => {
      try {
        const supabase = await getSupabase();
        if (!mounted) return;

        queueChannel = supabase
          .channel(`room-queue:${roomId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'karaoke_queue',
              filter: `room_id=eq.${roomId}`,
            },
            () => {
              if (mounted) {
                fetchQueue();
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.error('Realtime queue subscription failed:', err);
      }
    })();

    return () => {
      mounted = false;
      const channelToRemove = queueChannel;
      if (channelToRemove) {
        getSupabase().then((sub) => sub.removeChannel(channelToRemove));
      }
    };
  }, [roomId, fetchQueue]);

  // Join the queue
  const handleJoinQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songTitle.trim() || isJoining || !canJoin || myActiveItem) return;

    setIsJoining(true);
    const title = songTitle.trim();
    setSongTitle('');

    try {
      const supabase = await getSupabase();
      const avatarUrl =
        profilePhotoOption === 'google' ? user?.user_metadata?.avatar_url || '' : customPhotoUrl;

      // Determine next queue number
      const nextQueueNum =
        queueList.length > 0 ? Math.max(...queueList.map((q) => q.queue_number)) + 1 : 1;

      const { error } = await supabase.from('karaoke_queue').insert({
        room_id: roomId,
        user_id: userId,
        user_name: infoText || 'Singer',
        user_avatar: avatarUrl,
        song_title: title,
        queue_number: nextQueueNum,
        status: 'waiting',
      });

      if (error) throw error;
      toast.success('Berhasil bergabung ke antrean karaoke!');
      fetchQueue();
    } catch (err) {
      console.error('Failed to join queue:', err);
      toast.error('Gagal bergabung ke antrean.');
    } finally {
      setIsJoining(false);
    }
  };

  // Leave / Cancel queue
  const handleLeaveQueue = async (itemId: string) => {
    try {
      const supabase = await getSupabase();
      const { error } = await supabase
        .from('karaoke_queue')
        .update({ status: 'cancelled' })
        .eq('id', itemId);

      if (error) throw error;
      toast.success('Antrean Anda dibatalkan.');
      fetchQueue();
    } catch (err) {
      console.error('Failed to leave queue:', err);
      toast.error('Gagal membatalkan antrean.');
    }
  };

  // Admin action: Promote or change status
  const handleUpdateStatus = async (itemId: string, newStatus: string) => {
    try {
      const supabase = await getSupabase();
      const { error } = await supabase
        .from('karaoke_queue')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', itemId);

      if (error) throw error;
      toast.success(`Antrean berhasil diubah ke: ${newStatus.toUpperCase()}`);
      fetchQueue();
    } catch (err) {
      console.error('Failed to update status:', err);
      toast.error('Gagal mengubah status antrean.');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, JSX.Element> = {
      live: (
        <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase animate-pulse flex items-center gap-1">
          🎤 LIVE
        </span>
      ),
      ready: (
        <span className="bg-sky-50 text-sky-600 border border-sky-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase flex items-center gap-1">
          SIAP
        </span>
      ),
      waiting: (
        <span className="bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase flex items-center gap-1">
          ANTRE
        </span>
      ),
    };
    return badges[status] || null;
  };

  return (
    <div className="w-full h-full flex flex-col bg-white select-none text-gray-900">
      {/* Header */}
      <div className="w-full h-[90px] flex items-center px-5 z-20 relative overflow-hidden shrink-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-slate-100/50 to-transparent pointer-events-none z-10" />

        <button
          type="button"
          onClick={onClose}
          title="Kembali"
          aria-label="Kembali"
          className="mr-2.5 w-9 h-9 flex items-center justify-center rounded-full border border-slate-300 bg-gradient-to-b from-white via-[#f1f5f9] to-[#cbd5e1] shadow-[0_2px_0_#94a3b8,inset_0_1px_0_rgba(255,255,255,0.8)] active:translate-y-[1.5px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer focus:outline-none relative z-25 flex-shrink-0 text-gray-700"
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
            className="text-[15px] font-bold tracking-wide leading-tight text-gray-800"
            style={{
              fontFamily: "'Outfit', 'Orbitron', sans-serif",
            }}
          >
            Antrean Karaoke
          </span>
          <span className="text-[10px] font-bold tracking-wider mt-0.5 text-gray-500">
            ROOM: {String(channelNumber).padStart(3, '0')}
          </span>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white scrollbar-thin">
        {/* Join Queue Form (or active queue card for user) */}
        {!queueEnabled ? (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-500 text-xs font-bold uppercase select-none">
            <AlertCircle className="w-4 h-4" />
            Fitur Antrean Dinonaktifkan
          </div>
        ) : myActiveItem ? (
          /* User already inside the queue list */
          <div className="rounded-xl p-4 bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-200 shadow-sm flex justify-between items-center">
            <div className="space-y-1">
              <span className="text-[9px] bg-indigo-100 text-indigo-600 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Status Antrean Anda
              </span>
              <h4 className="text-sm font-extrabold text-gray-800 mt-1.5 truncate max-w-[200px]">
                {myActiveItem.song_title}
              </h4>
              <p className="text-[10px] text-gray-500">
                Nomor Antrean:{' '}
                <span className="font-extrabold text-indigo-500 text-xs">
                  #{myActiveItem.queue_number}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleLeaveQueue(myActiveItem.id)}
              className="p-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-500 cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5 font-bold text-xs"
            >
              <Trash2 className="w-4 h-4" /> Batal
            </button>
          </div>
        ) : (
          /* Join queue */
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-extrabold text-gray-600 flex items-center gap-1.5 uppercase tracking-wider">
              <Music className="w-4 h-4 text-emerald-500" /> Daftar Antre Menyanyi
            </h4>

            {!canJoin ? (
              <p className="text-[10px] text-gray-400 font-bold uppercase">
                Tamu tidak diizinkan masuk antrean.
              </p>
            ) : (
              <form onSubmit={handleJoinQueue} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ketik judul lagu & artis..."
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  disabled={isJoining}
                  required
                  className="flex-1 bg-white border border-gray-200 focus:border-emerald-400 outline-none rounded-xl px-3.5 py-2 text-xs font-semibold placeholder:text-gray-400 text-gray-800"
                />
                <button
                  type="submit"
                  title="Daftar antrean"
                  aria-label="Daftar antrean"
                  disabled={!songTitle.trim() || isJoining}
                  className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-b from-emerald-500 to-emerald-700 border-t border-white/20 border-b border-black/20 shadow-md active:translate-y-[1px] active:shadow-none hover:brightness-105 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Plus className="w-4 h-4 text-white" />
                </button>
              </form>
            )}
          </div>
        )}

        {/* Queue List Area */}
        <div className="space-y-2">
          <h4 className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider px-1">
            Daftar Antrean Aktif ({queueList.length})
          </h4>

          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-gray-400 text-xs font-semibold">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
              Memuat antrean...
            </div>
          ) : queueList.length === 0 ? (
            <div className="text-center py-12 border border-gray-200 rounded-xl bg-gray-50 text-gray-400 text-xs font-semibold">
              Belum ada antrean lagu saat ini.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto pr-1">
              {queueList.map((item, index) => {
                const isUser = item.user_id === userId;
                return (
                  <div key={item.id} className="py-3 flex justify-between items-center gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Queue Number */}
                      <span className="text-xs font-black text-gray-400 shrink-0 w-6">
                        #{index + 1}
                      </span>

                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 bg-gray-100 shrink-0 relative">
                        {item.user_avatar ? (
                          <img
                            src={item.user_avatar}
                            alt="avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs font-bold uppercase text-gray-600">
                            {item.user_name?.slice(0, 2) || 'SG'}
                          </div>
                        )}
                        {item.status === 'live' && (
                          <div className="absolute inset-0 bg-emerald-500/20 border border-emerald-400 rounded-full animate-ping" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-extrabold truncate ${isUser ? 'text-indigo-500' : 'text-gray-800'}`}
                        >
                          {item.song_title}
                        </p>
                        <p className="text-[9px] text-gray-400 mt-0.5 truncate font-bold uppercase">
                          {item.user_name}
                        </p>
                      </div>
                    </div>

                    {/* Status / Admin Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {getStatusBadge(item.status)}

                      {/* Admin Controls */}
                      {isAdmin && (
                        <div className="flex gap-1">
                          {item.status !== 'live' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(item.id, 'live')}
                              title="Set Live"
                              className="w-6 h-6 rounded bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center cursor-pointer transition-all active:scale-90"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" />
                            </button>
                          )}
                          {item.status === 'live' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(item.id, 'finished')}
                              title="Selesai"
                              className="w-6 h-6 rounded bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center cursor-pointer transition-all active:scale-90"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(item.id, 'skipped')}
                            title="Lewati"
                            className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 text-gray-600 flex items-center justify-center cursor-pointer transition-all active:scale-90"
                          >
                            <SkipForward className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
