import { useState, useEffect } from 'react';
import { ChannelItem } from '../utils/constants';
import { usePTTStore } from '../store/usePTTStore';
import { NextVWTPremiumLogo } from './NextVWTPremiumLogo';
import './ChannelListModal.css';

interface ChannelListModalProps {
  onClose: () => void;
  onSelectChannel: (channelNum: number) => void;
}

export function ChannelListModal({ onClose, onSelectChannel }: ChannelListModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(15);
  const [activePrivateChannel, setActivePrivateChannel] = useState<ChannelItem | null>(null);
  const [restrictedChannel, setRestrictedChannel] = useState<ChannelItem | null>(null);
  const [infoChannel, setInfoChannel] = useState<ChannelItem | null>(null);

  const { channels, userId, user, infoText, callSign } = usePTTStore();
  const [hasBadge, setHasBadge] = useState(false);
  const [channelInfos, setChannelInfos] = useState<Record<string, string>>({});

  // Check badge status and load channel infos on mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { getSupabase } = await import('../utils/supabase');
        const supabase = await getSupabase();

        // Fetch badge status
        if (userId) {
          const { data: badgeData, error: badgeError } = await supabase
            .from('user_badges')
            .select('*')
            .eq('user_id', userId)
            .eq('badge_key', 'badge_merah')
            .maybeSingle();
          if (active && !badgeError && badgeData) {
            setHasBadge(true);
          }
        }

        // Fetch channel infos
        const { data: settingsData, error: settingsError } = await supabase
          .from('channel_settings')
          .select('room_id, channel_description');

        if (active && !settingsError && settingsData) {
          const infos: Record<string, string> = {};
          settingsData.forEach((row) => {
            if (row.channel_description) {
              infos[row.room_id] = row.channel_description;
            }
          });
          setChannelInfos(infos);
        }
      } catch (err) {
        console.warn('Failed to load initial data in ChannelListModal:', err);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const checkHasAccess = (ch: ChannelItem) => {
    const isLocalUser = true;
    const localName = user?.user_metadata?.full_name || infoText || 'Pebe Herianto';
    const localCallSign = callSign;

    const isNocUser =
      userId === 'noc_global' ||
      (isLocalUser && (localName === 'NOC Global' || localCallSign === 'NOC-01'));

    const isSysAdminUser =
      userId === 'sys_admin_vwt' ||
      (isLocalUser && (localName === 'Sys Admin VWT' || localCallSign === 'SYS-01'));

    const isOperatorUser =
      userId === 'Pebri Haryanto' ||
      userId === 'Pebe Herianto' ||
      userId === '2DYUA' ||
      (isLocalUser &&
        (localName === 'Pebri Haryanto' ||
          localName === 'Pebe Herianto' ||
          localCallSign === '2DYUA'));

    if (isNocUser || isSysAdminUser || isOperatorUser) return true;

    // Check specific role in localStorage for this room
    const roomId = `ptt-room-${ch.number}`;
    const localRole = localStorage.getItem(`channel-role:${roomId}:${userId}`);
    if (
      localRole === 'noc' ||
      localRole === 'sys_admin' ||
      localRole === 'operator' ||
      localRole === 'pjc'
    ) {
      return true;
    }

    return hasBadge;
  };

  const filteredChannels = channels.filter(
    (ch) =>
      ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ch.number.toString().includes(searchQuery)
  );

  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 pt-2 pb-3 px-4">
      {/* Backdrop Dismiss */}
      <div
        data-testid="modal-backdrop"
        className="absolute inset-0"
        onClick={() => {
          onClose();
          setSearchQuery('');
        }}
      />

      {/* Modal Container */}
      <div className="channel-modal h-full shadow-2xl flex flex-col z-10 overflow-hidden border-2 border-gray-400 animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="channel-modal-header shrink-0">
          <button type="button" onClick={onClose} className="modal-close-btn" aria-label="Tutup">
            ×
          </button>
          <NextVWTPremiumLogo />
          <div className="premium-divider">
            <span />
            <i />
            <span />
          </div>
          <div className="nextvwt-subtitle">NEXT VIRTUAL WALKIE TALKIE</div>
        </div>

        {/* Content Wrapper */}
        <div className="channel-modal-content flex flex-col flex-1 overflow-hidden p-0">
          {/* Search Bar */}
          <div className="p-3 bg-gray-50 border-b border-gray-100 shrink-0">
            <input
              type="text"
              placeholder="Cari channel..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(15);
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-xs bg-white text-black outline-none focus:border-blue-500 font-semibold"
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto bg-white text-left divide-y divide-gray-200">
            {filteredChannels.length > 0 ? (
              <>
                {filteredChannels.slice(0, visibleCount).map((ch) => {
                  let badgeClass = 'badge-gray-dark'; // Default gray
                  if (ch.type === 'green') {
                    if (ch.number === 0 || ch.number === 100) {
                      badgeClass = 'badge-green-dark';
                    } else {
                      badgeClass = 'badge-green-light';
                    }
                  } else if (ch.type === 'red') {
                    badgeClass = 'badge-red';
                  } else if (ch.type === 'violet') {
                    badgeClass = 'badge-violet';
                  }

                  const roomId = `ptt-room-${ch.number}`;
                  const customInfo = channelInfos[roomId];

                  const activeUserCount = ch.users.length;
                  let activeUsersStr =
                    activeUserCount > 0
                      ? `${activeUserCount} PENGGUNA • ${ch.users.join(', ')}`
                      : '0 PENGGUNA';

                  if (ch.number === 0) {
                    activeUsersStr = 'WWW.NEXTVWT.ID';
                  }

                  const row2Text = customInfo || activeUsersStr;

                  return (
                    <button
                      type="button"
                      key={ch.number}
                      onClick={() => {
                        setActivePrivateChannel(ch);
                      }}
                      className="w-full flex items-center p-0 hover:bg-gray-50 active:bg-gray-100 text-left cursor-pointer select-none focus:outline-none"
                    >
                      <div
                        className={`w-[55px] py-2.5 flex items-center justify-center text-white font-bold text-sm shrink-0 ${badgeClass} border-t-[2.5px] border-l-[2.5px] border-t-white/45 border-l-white/45 border-r-[2.5px] border-b-[2.5px] border-r-black/55 border-b-black/55 shadow-[inset_1px_1px_0px_rgba(255,255,255,0.4)]`}
                        style={{ textShadow: '1px 1px 1px rgba(0,0,0,0.8)' }}
                      >
                        {ch.number.toString().padStart(3, '0')}
                      </div>
                      <div className="ml-3 pr-3 flex-1 min-w-0 py-1">
                        <div className="text-xs font-bold text-black truncate">{ch.name}</div>
                        <div className="text-[10px] text-gray-500 font-semibold truncate mt-0.5 uppercase">
                          {row2Text}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {filteredChannels.length > visibleCount && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 15)}
                    className="w-full flex items-center p-0 hover:bg-gray-50 active:bg-gray-100 text-left border-b border-gray-200 cursor-pointer select-none focus:outline-none"
                  >
                    <div className="w-[55px] py-2.5 badge-gray-dark border-t-[2.5px] border-l-[2.5px] border-t-white/45 border-l-white/45 border-r-[2.5px] border-b-[2.5px] border-r-black/55 border-b-black/55 shadow-[inset_1px_1px_0px_rgba(255,255,255,0.4)] shrink-0 self-stretch flex items-center justify-center" />
                    <div className="ml-3 pr-3 flex-1 min-w-0 py-1">
                      <div className="text-xs font-bold text-gray-700">Selanjutnya..</div>
                    </div>
                  </button>
                )}
              </>
            ) : (
              <div className="p-6 text-center text-xs text-gray-500 font-medium">
                Tidak ada channel ditemukan
              </div>
            )}
          </div>
        </div>

        {/* Overlays inside Modal */}
        {activePrivateChannel && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-55 p-0 animate-in fade-in duration-100">
            <div className="absolute inset-0" onClick={() => setActivePrivateChannel(null)} />
            <div className="bg-white w-full max-w-[340px] rounded-lg shadow-2xl flex flex-col z-10 overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  const ch = activePrivateChannel;
                  setActivePrivateChannel(null);
                  if (ch.type === 'red' && !checkHasAccess(ch)) {
                    setRestrictedChannel(ch);
                  } else {
                    onSelectChannel(ch.number);
                    onClose();
                    setSearchQuery('');
                  }
                }}
                className="w-full text-left px-5 py-4.5 hover:bg-gray-50 active:bg-gray-100 text-[16px] text-gray-800 font-medium border-b border-gray-100 cursor-pointer select-none focus:outline-none"
              >
                Menuju Channel {activePrivateChannel.number}
              </button>
              <button
                type="button"
                onClick={() => {
                  const ch = activePrivateChannel;
                  setActivePrivateChannel(null);
                  setInfoChannel(ch);
                }}
                className="w-full text-left px-5 py-4.5 hover:bg-gray-50 active:bg-gray-100 text-[16px] text-gray-800 font-medium cursor-pointer select-none focus:outline-none"
              >
                Info Channel {activePrivateChannel.number}
              </button>
            </div>
          </div>
        )}

        {restrictedChannel && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-60 p-0 animate-in fade-in duration-100">
            <div className="bg-white w-full max-w-[340px] rounded-2xl shadow-2xl flex flex-col p-6 animate-in fade-in zoom-in-95 duration-100 text-left">
              <h3 className="text-[17px] font-bold text-gray-800">
                Channel {restrictedChannel.number} terbatas
              </h3>
              <p className="text-[14px] text-gray-600 mt-2.5 leading-relaxed">
                Channel ini terbatas hanya untuk anggota channel
              </p>
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => setRestrictedChannel(null)}
                  className="text-[15px] font-bold text-[#0c62a8] hover:text-[#0b5490] px-6 py-2 cursor-pointer focus:outline-none select-none"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {infoChannel && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-60 p-0 animate-in fade-in duration-100">
            <div className="absolute inset-0" onClick={() => setInfoChannel(null)} />
            <div className="bg-white w-full max-w-[340px] rounded-2xl shadow-2xl flex flex-col p-5 z-10 animate-in fade-in zoom-in-95 duration-100 text-left border border-gray-100">
              <div className="flex items-center gap-2 pb-2.5">
                <svg
                  className="w-5 h-5 text-[#0c62a8] shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <h3 className="text-[16px] font-bold text-gray-800">
                  Channel {infoChannel.number}
                </h3>
              </div>

              <div className="flex items-center justify-center py-4">
                <div className="transform scale-150 py-2">
                  <NextVWTPremiumLogo />
                </div>
              </div>

              <div className="flex border-t border-gray-100 py-1 text-[14px]">
                <span className="w-14 font-bold text-gray-400 shrink-0">Nama</span>
                <span className="font-bold text-gray-800 flex-1 min-w-0 break-words">
                  {infoChannel.name}
                </span>
              </div>
              <div className="flex border-t border-b border-gray-100 py-1 text-[14px]">
                <span className="w-14 font-bold text-gray-400 shrink-0">Info</span>
                <span className="font-semibold text-gray-700 flex-1 min-w-0 break-words">
                  {channelInfos[`ptt-room-${infoChannel.number}`] ? (
                    <span>{channelInfos[`ptt-room-${infoChannel.number}`]}</span>
                  ) : infoChannel.users.length > 0 ? (
                    <span>
                      {infoChannel.users.length} Pengguna • {infoChannel.users.join(', ')}
                    </span>
                  ) : (
                    <span>0 Pengguna</span>
                  )}
                </span>
              </div>

              <div className="mt-1.5 flex justify-center">
                <button
                  type="button"
                  onClick={() => setInfoChannel(null)}
                  className="text-[15px] font-bold text-[#0c62a8] hover:text-[#0b5490] px-6 py-0.5 cursor-pointer focus:outline-none select-none"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
