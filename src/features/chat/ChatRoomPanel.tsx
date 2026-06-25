import { useState, useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { usePTTStore } from '../../app/store/usePTTStore';
import { getSupabase } from '../../app/utils/supabase';
import { useChannelRole } from '../moderation/useChannelRole';
import { useChannelSettings } from '../moderation/useChannelSettings';
import { ChannelMessage } from './types';
import { Send, MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface ChatRoomPanelProps {
  onClose: () => void;
}

export function ChatRoomPanel({ onClose }: ChatRoomPanelProps) {
  const { channelNumber, userId, infoText, customPhotoUrl, profilePhotoOption, user } =
    usePTTStore();
  const roomId = `ptt-room-${channelNumber}`;

  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [memberRoles, setMemberRoles] = useState<Record<string, string>>({});
  const [slowModeCooldown, setSlowModeCooldown] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch channel role and settings
  const { role, status } = useChannelRole(roomId, userId);
  const { settings: channelSettings } = useChannelSettings(roomId);

  const isGuest = role === 'guest';
  const chatEnabled = channelSettings?.chat_enabled ?? true;
  const allowGuestChat = channelSettings?.allow_guest_chat ?? true;
  const isChatBlocked = status === 'chat_blocked' || status === 'suspended' || status === 'banned';

  const canChat = chatEnabled && (!isGuest || allowGuestChat) && !isChatBlocked;

  // Fetch members to display role badges in chat
  const fetchMemberRoles = async () => {
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('channel_members')
        .select('user_id, role')
        .eq('room_id', roomId);
      if (!error && data) {
        const roleMap: Record<string, string> = {};
        data.forEach((m) => {
          roleMap[m.user_id] = m.role;
        });
        setMemberRoles(roleMap);
      }
    } catch (err) {
      console.warn('Failed to fetch member roles:', err);
    }
  };

  // Fetch messages from database
  const fetchMessages = async () => {
    setLoading(true);
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('channel_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(55);

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Failed to load chat messages:', err);
      toast.error('Gagal memuat pesan obrolan.');
    } finally {
      setLoading(false);
    }
  };

  // Real-time Postgres insert subscription
  useEffect(() => {
    let mounted = true;
    let chatChannel: RealtimeChannel | null = null;

    fetchMessages();
    fetchMemberRoles();

    (async () => {
      try {
        const supabase = await getSupabase();
        if (!mounted) return;

        chatChannel = supabase
          .channel(`room-chat:${roomId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'channel_messages',
              filter: `room_id=eq.${roomId}`,
            },
            (payload) => {
              if (mounted) {
                setMessages((prev) => {
                  // Prevent duplicates from optimistic additions
                  if (prev.some((m) => m.id === payload.new.id)) return prev;
                  return [...prev, payload.new as ChannelMessage];
                });
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.error('Realtime chat subscription failed:', err);
      }
    })();

    return () => {
      mounted = false;
      if (chatChannel) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        getSupabase().then((sub) => sub.removeChannel(chatChannel!));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Handle slow mode countdown timer
  useEffect(() => {
    if (slowModeCooldown <= 0) return;
    const timer = setTimeout(() => {
      setSlowModeCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [slowModeCooldown]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending || !canChat) return;

    // Check slow mode cooldown
    if (slowModeCooldown > 0) {
      toast.warning(`Harap tunggu ${slowModeCooldown} detik sebelum mengirim pesan lagi.`);
      return;
    }

    setIsSending(true);
    const textToSend = inputText.trim();
    setInputText('');

    try {
      const avatarUrl =
        profilePhotoOption === 'google' ? user?.user_metadata?.avatar_url || '' : customPhotoUrl;

      const supabase = await getSupabase();

      // Optimistic ID
      const tempId = Math.random().toString();
      const tempMsg: ChannelMessage = {
        id: tempId,
        room_id: roomId,
        sender_id: userId,
        sender_name: infoText || 'User',
        sender_avatar: avatarUrl,
        message: textToSend,
        message_type: 'text',
        created_at: new Date().toISOString(),
      };

      // Show optimistically
      setMessages((prev) => [...prev, tempMsg]);

      const { data, error } = await supabase
        .from('channel_messages')
        .insert({
          room_id: roomId,
          sender_id: userId,
          sender_name: infoText || 'User',
          sender_avatar: avatarUrl,
          message: textToSend,
          message_type: 'text',
        })
        .select()
        .single();

      if (error) throw error;

      // Replace temp message with actual database message
      setMessages((prev) => prev.map((m) => (m.id === tempId ? data : m)));

      // Trigger slow mode cooldown for non-admin roles
      const isModerator =
        role === 'operator' || role === 'pjc' || role === 'sys_admin' || role === 'noc';
      const slowModeSec = channelSettings?.slow_mode_seconds ?? 0;
      if (!isModerator && slowModeSec > 0) {
        setSlowModeCooldown(slowModeSec);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error('Gagal mengirim pesan.');
    } finally {
      setIsSending(false);
    }
  };

  const getRoleBadge = (senderId: string) => {
    const sRole = memberRoles[senderId] || 'guest';
    const badges: Record<string, JSX.Element> = {
      noc: (
        <span className="bg-red-500 text-white font-extrabold text-[8px] px-1 py-0.2 rounded uppercase shrink-0">
          NOC
        </span>
      ),
      sys_admin: (
        <span className="bg-purple-500 text-white font-extrabold text-[8px] px-1 py-0.2 rounded uppercase shrink-0">
          ADM
        </span>
      ),
      pjc: (
        <span className="bg-amber-500 text-black font-extrabold text-[8px] px-1 py-0.2 rounded uppercase shrink-0">
          PJC
        </span>
      ),
      operator: (
        <span className="bg-sky-500 text-white font-extrabold text-[8px] px-1 py-0.2 rounded uppercase shrink-0">
          OP
        </span>
      ),
    };
    return badges[sRole] || null;
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
            Obrolan Saluran
          </span>
          <span className="text-[10px] font-bold tracking-wider mt-0.5 text-gray-500">
            ROOM: {String(channelNumber).padStart(3, '0')}
          </span>
        </div>
      </div>

      {/* Messages List Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center h-full gap-2 text-slate-500 text-xs font-semibold">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
            Memuat obrolan...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
            <MessageSquare className="w-8 h-8 mb-2 opacity-30 text-emerald-400" />
            <p className="text-xs font-bold text-gray-600">Belum ada obrolan</p>
            <p className="text-[10px] text-gray-400 mt-1">Kirim pesan pertama di saluran ini!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === userId;
            return (
              <div
                key={msg.id}
                className={`flex gap-2 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div className="w-7 h-7 rounded-full overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                  {msg.sender_avatar ? (
                    <img
                      src={msg.sender_avatar}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-[10px] font-bold uppercase text-gray-600">
                      {msg.sender_name?.slice(0, 2) || 'US'}
                    </div>
                  )}
                </div>

                {/* Bubble details */}
                <div className="flex flex-col space-y-0.5">
                  {/* Name and callsgn */}
                  <div
                    className={`flex items-center gap-1.5 text-[9px] font-bold text-gray-400 ${isMe ? 'justify-end' : ''}`}
                  >
                    <span>{msg.sender_name}</span>
                    {getRoleBadge(msg.sender_id)}
                  </div>

                  {/* Text Bubble */}
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-xs break-all leading-normal border shadow-sm ${
                      isMe
                        ? 'bg-emerald-600 border-emerald-500 text-white rounded-tr-none'
                        : 'bg-gray-100 border-gray-200 text-gray-800 rounded-tl-none'
                    }`}
                  >
                    {msg.message}
                  </div>

                  {/* Timestamp */}
                  <span
                    className={`text-[8px] text-gray-400 font-semibold ${isMe ? 'text-right' : ''}`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form at Bottom */}
      <div className="p-3 bg-white border-t border-gray-200 shrink-0">
        {!canChat ? (
          <div className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-red-950/20 border border-red-900/40 text-red-400 text-[10px] font-bold uppercase select-none text-center">
            <AlertCircle className="w-3.5 h-3.5" />
            {!chatEnabled
              ? 'Fitur Chat Dinonaktifkan oleh Admin'
              : isChatBlocked
                ? 'Hak Chat Anda Sedang Ditangguhkan'
                : 'Tamu Tidak Diizinkan Mengirim Chat'}
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              placeholder={
                slowModeCooldown > 0
                  ? `Slow mode (${slowModeCooldown}s)...`
                  : 'Tulis pesan obrolan...'
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isSending || slowModeCooldown > 0}
              className="flex-1 bg-gray-50 border border-gray-200 focus:border-emerald-400 outline-none rounded-xl px-3.5 py-2 text-xs font-semibold placeholder:text-gray-400 text-gray-800 disabled:opacity-50"
            />
            <button
              type="submit"
              title="Kirim pesan"
              aria-label="Kirim pesan"
              disabled={!inputText.trim() || isSending || slowModeCooldown > 0}
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-b from-emerald-500 to-emerald-700 border-t border-white/20 border-b border-black/20 shadow-md active:translate-y-[1px] active:shadow-none hover:brightness-105 transition-all duration-100 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
