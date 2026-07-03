import { useState, useEffect, useRef, useCallback } from 'react';
import { usePTTStore } from '../store/usePTTStore';
import { activeChannelSubscription } from '../store/subscription';
import { ChannelRole, canModerateRole } from '../../features/moderation/permissions';
import { getSupabase } from '../utils/supabase';

import { UserProfile } from './UserListModal/utils';
import { UserListItem } from './UserListModal/UserListItem';
import { ModerationActionSheet } from './UserListModal/ModerationActionSheet';

export interface UserListModalProps {
  channel: number;
  channelName: string;
  users: Array<
    | string
    | {
        userId: string;
        displayName: string;
        callSign: string;
        location: string;
        avatarUrl?: string;
        isNewUser?: boolean;
        joinedAt?: string;
        role?: ChannelRole;
        isMuted?: boolean;
        isControlled?: boolean;
        isWait?: boolean;
        isWaitControlled?: boolean;
      }
  >;
  onClose: () => void;
  hasVideoBackground?: boolean;
}

export const USER_PROFILES: Record<string, UserProfile> = {
  'Pebri Haryanto': {
    userId: 'Pebri Haryanto',
    displayName: 'Pebri Haryanto',
    callSign: '2DYUA',
    location: 'BANDUNG, JABAR',
    avatarColor: '#3F51B5',
    avatarUrl: 'https://randomuser.me/api/portraits/women/2.jpg',
    role: 'operator',
    badges: ['❤️', '☕'],
  },
  'Pebe Herianto': {
    userId: 'Pebe Herianto',
    displayName: 'Pebe Herianto',
    callSign: 'N.O.C',
    location: 'BANDUNG, JABAR',
    avatarColor: '#3F51B5',
    avatarUrl: 'https://randomuser.me/api/portraits/men/3.jpg',
    role: 'noc',
  },
  agus_santika: {
    userId: 'agus_santika',
    displayName: 'Agus Santika',
    callSign: 'MOD01',
    location: 'JAKARTA, DKI',
    avatarColor: '#4CAF50',
    avatarUrl: 'https://randomuser.me/api/portraits/women/4.jpg',
    role: 'operator',
    badges: ['💛', '😊'],
  },
  budi_santoso: {
    userId: 'budi_santoso',
    displayName: 'Budi',
    callSign: 'MUT02',
    location: 'SURABAYA, JATIM',
    avatarColor: '#F44336',
    avatarUrl: 'https://randomuser.me/api/portraits/men/5.jpg',
    isMuted: true,
    badges: ['☕'],
  },
  citra_kirana: {
    userId: 'citra_kirana',
    displayName: 'Citra',
    callSign: 'CTR03',
    location: 'YOGYAKARTA, DIY',
    avatarColor: '#9C27B0',
    avatarUrl: 'https://randomuser.me/api/portraits/women/6.jpg',
    isControlled: true,
    badges: ['💙', '🌟'],
  },
  dedi_pratama: {
    userId: 'dedi_pratama',
    displayName: 'Dedi',
    callSign: 'WAT04',
    location: 'MEDAN, SUMUT',
    avatarColor: '#FF9800',
    avatarUrl: 'https://randomuser.me/api/portraits/men/7.jpg',
    isWait: true,
  },
  euis_cahyani: {
    userId: 'euis_cahyani',
    displayName: 'Euis',
    callSign: 'WTC05',
    location: 'BANDUNG, JABAR',
    avatarColor: '#E91E63',
    avatarUrl: 'https://randomuser.me/api/portraits/women/8.jpg',
    isWaitControlled: true,
  },
  fajar_nugraha: {
    userId: 'fajar_nugraha',
    displayName: 'Fajar',
    callSign: 'OPR06',
    location: 'DENPASAR, BALI',
    avatarColor: '#00BCD4',
    avatarUrl: 'https://randomuser.me/api/portraits/men/9.jpg',
    role: 'operator',
  },
  gilang_ramadhan: {
    userId: 'gilang_ramadhan',
    displayName: 'Gilang',
    callSign: 'GST07',
    location: 'LOMBOK, NTB',
    avatarColor: '#607D8B',
    avatarUrl: 'https://randomuser.me/api/portraits/men/26.jpg',
    role: 'guest',
  },
  noc_global: {
    userId: 'noc_global',
    displayName: 'NOC Global',
    callSign: 'NOC00',
    location: 'JAKARTA, DKI',
    avatarColor: '#3F51B5',
    avatarUrl: 'https://randomuser.me/api/portraits/women/10.jpg',
    role: 'noc',
    badges: ['🔥', '💻'],
  },
  sys_admin_vwt: {
    userId: 'sys_admin_vwt',
    displayName: 'SysAdmin VWT',
    callSign: 'SYS99',
    location: 'BANDUNG, JABAR',
    avatarColor: '#009688',
    avatarUrl: 'https://randomuser.me/api/portraits/men/11.jpg',
    role: 'sys_admin',
    badges: ['👑', '🛡️'],
  },
  pjc_room_manager: {
    userId: 'pjc_room_manager',
    displayName: 'PJC Room Mgr',
    callSign: 'PJC01',
    location: 'SURABAYA, JATIM',
    avatarColor: '#E91E63',
    avatarUrl: 'https://randomuser.me/api/portraits/women/12.jpg',
    role: 'pjc',
    badges: ['💜', '🍵'],
  },
  operator_otomatis: {
    userId: 'operator_otomatis',
    displayName: 'Operator Auto',
    callSign: 'OPR99',
    location: 'SEMARANG, JATENG',
    avatarColor: '#FF9800',
    avatarUrl: 'https://randomuser.me/api/portraits/men/13.jpg',
    role: 'operator',
  },
  mario_teguh: {
    userId: 'mario_teguh',
    displayName: 'Siswa Baru',
    callSign: 'NEW01',
    location: 'MALANG, JATIM',
    avatarColor: '#4CAF50',
    avatarUrl: 'https://randomuser.me/api/portraits/women/14.jpg',
    isNewUser: true,
  },
  nina_marlina: {
    userId: 'nina_marlina',
    displayName: 'Pendengar Setia',
    callSign: 'LSTNR',
    location: 'MEDAN, SUMUT',
    avatarColor: '#9E9E9E',
    avatarUrl: 'https://randomuser.me/api/portraits/men/15.jpg',
    isMuted: true,
  },
  oscar_lawalata: {
    userId: 'oscar_lawalata',
    displayName: 'Tamu (Ctrl)',
    callSign: 'GST02',
    location: 'DENPASAR, BALI',
    avatarColor: '#9C27B0',
    avatarUrl: 'https://randomuser.me/api/portraits/women/16.jpg',
    isControlled: true,
  },
  test_user_1: {
    userId: 'test_user_1',
    displayName: 'Test User 1',
    callSign: 'TST01',
    location: 'JAKARTA SELATAN, DKI',
    avatarColor: '#2196F3',
    avatarUrl: 'https://randomuser.me/api/portraits/men/44.jpg',
    role: 'operator',
  },
};

export function getDeterministicProfile(username: string): UserProfile {
  let hash = 5381;
  for (let i = 0; i < username.length; i++) {
    hash = (hash * 33) ^ username.charCodeAt(i);
  }
  hash = Math.abs(hash);

  const cities = [
    'JAKARTA, DKI',
    'SURABAYA, JATIM',
    'MEDAN, SUMUT',
    'BANDUNG, JABAR',
    'MAKASSAR, SULSEL',
    'SEMARANG, JATENG',
    'PALEMBANG, SUMSEL',
    'BALIKPAPAN, KALTIM',
    'DENPASAR, BALI',
    'YOGYAKARTA, DIY',
  ];

  const colors = [
    '#3F51B5',
    '#E91E63',
    '#9C27B0',
    '#FF9800',
    '#009688',
    '#795548',
    '#4CAF50',
    '#00BCD4',
    '#FF5722',
    '#607D8B',
  ];

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';

  let callSign = '';
  callSign += alphabet[hash % 26];
  callSign += alphabet[(hash >> 1) % 26];
  callSign += digits[(hash >> 2) % 10];
  callSign += alphabet[(hash >> 3) % 26];
  callSign += digits[(hash >> 4) % 10];

  const location = cities[hash % cities.length];
  const avatarColor = colors[hash % colors.length];

  const nameParts = username.split(/[_\s]+/);
  const displayName = nameParts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

  const picNum = (hash % 70) + 1;
  const avatarUrl = `https://randomuser.me/api/portraits/${hash % 2 === 0 ? 'men' : 'women'}/${picNum}.jpg`;

  return { userId: username, displayName, callSign, location, avatarColor, avatarUrl };
}

export function UserListModal({ channel, users, hasVideoBackground }: UserListModalProps) {
  const isTransmitting = usePTTStore((state) => state.isTransmitting);
  const activeTransmitter = usePTTStore((state) => state.activeTransmitter);
  const localUserId = usePTTStore((state) => state.userId);
  const localUser = usePTTStore((state) => state.user);
  const localInfoText = usePTTStore((state) => state.infoText);
  const localName = localUser?.user_metadata?.full_name || localInfoText || 'Pebe Herianto';
  const localCallSign = usePTTStore((state) => state.callSign);

  const profilePhotoOption = usePTTStore((state) => state.profilePhotoOption);
  const customPhotoUrl = usePTTStore((state) => state.customPhotoUrl);

  const localAvatar =
    profilePhotoOption === 'google'
      ? localUser?.user_metadata?.avatar_url
      : profilePhotoOption === 'custom' && customPhotoUrl
        ? customPhotoUrl
        : null;

  const showMyPhoto = usePTTStore((s) => s.showMyPhoto ?? true);
  const showOtherPhotos = usePTTStore((s) => s.showOtherPhotos ?? true);
  const showPhotosInList = usePTTStore((s) => s.showPhotosInList ?? true);

  // Map user list or generate dynamic fallback, including local overrides
  const mapUsers = useCallback(
    (list: typeof users) => {
      return list.map((user) => {
        const uId = typeof user === 'string' ? user : user.userId;
        const roomId = `ptt-room-${channel}`;
        const localRole = localStorage.getItem(
          `channel-role:${roomId}:${uId}`
        ) as ChannelRole | null;
        const localStatus = localStorage.getItem(`channel-status:${roomId}:${uId}`);

        let profileData: UserProfile;
        if (typeof user === 'string') {
          profileData = { ...(USER_PROFILES[user] || getDeterministicProfile(user)) };
        } else {
          const matchedProfile =
            USER_PROFILES[user.userId] ||
            USER_PROFILES[user.displayName] ||
            Object.values(USER_PROFILES).find((p) => p.callSign === user.callSign);

          profileData = {
            userId: user.userId,
            displayName: user.displayName,
            callSign: matchedProfile?.callSign || user.callSign,
            location: user.location,
            avatarColor: '#3F51B5',
            avatarUrl: user.avatarUrl || matchedProfile?.avatarUrl || '',
            isNewUser: user.isNewUser || matchedProfile?.isNewUser,
            joinedAt: user.joinedAt || matchedProfile?.joinedAt,
            role: user.role || matchedProfile?.role || 'guest',
            isMuted: user.isMuted || matchedProfile?.isMuted || false,
            isControlled: user.isControlled || matchedProfile?.isControlled || false,
            isWait: user.isWait || matchedProfile?.isWait || false,
            isWaitControlled: user.isWaitControlled || matchedProfile?.isWaitControlled || false,
            badges: matchedProfile?.badges,
          };
        }

        const isLocalUser = uId === localUserId || profileData.displayName === localName;
        const isPebeUser =
          uId === 'Pebe Herianto' ||
          profileData.displayName.toLowerCase() === 'pebe herianto' ||
          profileData.displayName.toLowerCase() === 'pebri haryanto';

        return {
          ...profileData,
          avatarUrl: isLocalUser && localAvatar ? localAvatar : profileData.avatarUrl,
          userId: uId,
          role: isPebeUser ? 'noc' : localRole || profileData.role || 'guest',
          isMuted: localStatus === 'muted' || (localStatus ? false : profileData.isMuted) || false,
          isControlled:
            localStatus === 'controlled' ||
            (localStatus ? false : profileData.isControlled) ||
            false,
          isWait: localStatus === 'wait' || (localStatus ? false : profileData.isWait) || false,
          isWaitControlled:
            localStatus === 'wait_controlled' ||
            (localStatus ? false : profileData.isWaitControlled) ||
            false,
        };
      });
    },
    [channel, localUserId, localName, localAvatar]
  );

  const [modalUsers, setModalUsers] = useState(() => mapUsers(users));

  // Sync state if users or channel changes
  useEffect(() => {
    setModalUsers(mapUsers(users));
  }, [users, mapUsers]);

  useEffect(() => {
    const handleRoleChanged = () => {
      setModalUsers(mapUsers(users));
    };
    window.addEventListener('channel-role-changed', handleRoleChanged);
    return () => {
      window.removeEventListener('channel-role-changed', handleRoleChanged);
    };
  }, [users, mapUsers]);

  const [notifications, setNotifications] = useState<
    Array<{ id: string; displayName: string; type: 'join' | 'leave' }>
  >([]);
  const prevModalUsersRef = useRef<ReturnType<typeof mapUsers>>([]);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const currentMapped = mapUsers(users);
    const prevMapped = prevModalUsersRef.current;
    const currentIds = currentMapped.map((u) => `${u.userId}_${u.callSign || ''}`);
    const prevIds = prevMapped.map((u) => `${u.userId}_${u.callSign || ''}`);

    if (isFirstRender.current) {
      prevModalUsersRef.current = currentMapped;
      isFirstRender.current = false;
      return;
    }

    const joined = currentMapped.filter(
      (u) => !prevIds.includes(`${u.userId}_${u.callSign || ''}`)
    );
    const left = prevMapped.filter((u) => !currentIds.includes(`${u.userId}_${u.callSign || ''}`));

    if (joined.length > 0 || left.length > 0) {
      const newNotifs: Array<{ id: string; displayName: string; type: 'join' | 'leave' }> = [];

      joined.forEach((u) => {
        const name = u.displayName || u.userId;
        if (name.toLowerCase() === 'pebe herianto' || name.toLowerCase() === 'pebri haryanto') {
          return;
        }
        const notifId = Math.random().toString();
        newNotifs.push({
          id: notifId,
          displayName: name,
          type: 'join',
        });
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== notifId));
        }, 3600);
      });

      left.forEach((u) => {
        const name = u.displayName || u.userId;
        if (name.toLowerCase() === 'pebe herianto' || name.toLowerCase() === 'pebri haryanto') {
          return;
        }
        const notifId = Math.random().toString();
        newNotifs.push({
          id: notifId,
          displayName: name,
          type: 'leave',
        });
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== notifId));
        }, 3600);
      });

      if (newNotifs.length > 0) {
        setNotifications((prev) => [...prev, ...newNotifs]);
      }
      prevModalUsersRef.current = currentMapped;
    }
  }, [users, mapUsers]);

  const [activeZoomedAvatar, setActiveZoomedAvatar] = useState<UserProfile | null>(null);

  // Check if current logged-in user holds Moderator/Operator/NOC/SysAdmin position
  const roomId = `ptt-room-${channel}`;
  const localProfile = modalUsers.find((u) => u.userId === localUserId);
  const localRole =
    (localUserId
      ? (localStorage.getItem(`channel-role:${roomId}:${localUserId}`) as ChannelRole | null)
      : null) ||
    localProfile?.role ||
    'guest';
  const canModerate =
    localRole === 'operator' ||
    localRole === 'pjc' ||
    localRole === 'sys_admin' ||
    localRole === 'noc';

  const isSelf = activeZoomedAvatar?.userId === localUserId;
  const canModerateTarget =
    activeZoomedAvatar &&
    canModerate &&
    !isSelf &&
    activeZoomedAvatar.role !== 'noc' &&
    activeZoomedAvatar.userId !== 'Pebe Herianto' &&
    canModerateRole(localRole, activeZoomedAvatar.role || 'guest');

  const logModerationAction = async (
    targetUserId: string,
    action: string,
    detail: Record<string, unknown>
  ) => {
    try {
      const targetUser = modalUsers.find((u) => u.userId === targetUserId);
      const supabaseInstance = await getSupabase();
      await supabaseInstance.from('channel_moderation_logs').insert({
        room_id: `ptt-room-${channel}`,
        actor_id: localUserId,
        actor_role: localRole,
        target_user_id: targetUserId,
        action,
        detail: {
          ...detail,
          actor_name: localName,
          target_name: targetUser?.displayName || targetUserId,
        },
      });
    } catch (err) {
      console.error('Failed to insert moderation log:', err);
    }
  };

  const handleUpdateRole = (uId: string, nextRole: ChannelRole) => {
    const roomId = `ptt-room-${channel}`;
    const targetUser = modalUsers.find((u) => u.userId === uId);
    if (targetUser?.role === 'noc' || uId === 'Pebe Herianto') {
      console.warn('NOC role is protected and cannot be changed');
      return;
    }
    const previousRole = targetUser?.role || 'guest';
    localStorage.setItem(`channel-role:${roomId}:${uId}`, nextRole);
    if (uId === localUserId || uId === '2DYUA' || uId === localName) {
      window.dispatchEvent(new Event('channel-role-changed'));
    }

    if (activeChannelSubscription) {
      activeChannelSubscription.send({
        type: 'broadcast',
        event: 'update_role',
        payload: {
          targetUserId: uId,
          nextRole,
        },
      });
    }

    logModerationAction(uId, 'SET_USER_ROLE', {
      nextRole,
      previousRole,
    });

    setModalUsers((prev) => prev.map((u) => (u.userId === uId ? { ...u, role: nextRole } : u)));
    setActiveZoomedAvatar((prev) =>
      prev && prev.userId === uId ? { ...prev, role: nextRole } : prev
    );
  };

  const handleUpdateStatus = (
    uId: string,
    statusType: 'normal' | 'muted' | 'controlled' | 'wait' | 'wait_controlled'
  ) => {
    const roomId = `ptt-room-${channel}`;
    const targetUser = modalUsers.find((u) => u.userId === uId);
    if (targetUser?.role === 'noc' || uId === 'Pebe Herianto') {
      console.warn('NOC status is protected and cannot be moderated');
      return;
    }
    const statusVal = statusType === 'normal' ? 'active' : statusType;
    localStorage.setItem(`channel-status:${roomId}:${uId}`, statusVal);

    if (uId === localUserId || uId === '2DYUA' || uId === localName) {
      window.dispatchEvent(new Event('channel-role-changed'));
    }

    if (activeChannelSubscription) {
      activeChannelSubscription.send({
        type: 'broadcast',
        event: 'update_status',
        payload: {
          targetUserId: uId,
          statusType,
        },
      });
    }

    logModerationAction(uId, 'SET_STATUS_' + statusType.toUpperCase(), {
      statusType,
    });

    setModalUsers((prev) =>
      prev.map((u) => {
        if (u.userId === uId) {
          return {
            ...u,
            isMuted: statusType === 'muted',
            isControlled: statusType === 'controlled',
            isWait: statusType === 'wait',
            isWaitControlled: statusType === 'wait_controlled',
          };
        }
        return u;
      })
    );

    setActiveZoomedAvatar((prev) => {
      if (!prev || prev.userId !== uId) return prev;
      return {
        ...prev,
        isMuted: statusType === 'muted',
        isControlled: statusType === 'controlled',
        isWait: statusType === 'wait',
        isWaitControlled: statusType === 'wait_controlled',
      };
    });
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`w-full max-w-[340px] user-list-modal flex flex-col overflow-hidden relative animate-in fade-in duration-200 ${
        hasVideoBackground ? 'border-none' : 'bg-white border-x-2 border-b-2 border-gray-400'
      }`}
      style={
        hasVideoBackground
          ? {
              background: 'transparent',
              backdropFilter: 'none',
              WebkitBackdropFilter: 'none',
              boxShadow: 'none',
            }
          : {}
      }
    >
      <style>{`
        .user-list-modal {
          height: 426px;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 1px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
        }
        /* Firefox */
        .custom-scrollbar {
          scrollbar-width: thin;
        }
        @keyframes activeUserPulse {
          0%, 100% {
            background-color: rgba(239, 246, 255, 0.75);
            box-shadow: inset 0 0 12px rgba(0, 136, 204, 0.15);
          }
          50% {
            background-color: rgba(219, 234, 254, 0.95);
            box-shadow: inset 0 0 22px rgba(0, 136, 204, 0.4), 0 0 10px rgba(0, 136, 204, 0.25);
          }
        }
        .active-user-glow {
          animation: activeUserPulse 1.5s infinite ease-in-out;
        }
        @keyframes joinSlideIn {
          0% {
            transform: translateX(-110%);
            opacity: 0;
          }
          15% {
            transform: translateX(0);
            opacity: 1;
          }
          75% {
            transform: translateX(0);
            opacity: 1;
          }
          100% {
            transform: translateX(-110%);
            opacity: 0;
          }
        }
        @keyframes leaveSlideOut {
          0% {
            transform: translateX(-110%);
            opacity: 0;
          }
          15% {
            transform: translateX(0);
            opacity: 1;
          }
          75% {
            transform: translateX(0);
            opacity: 1;
          }
          100% {
            transform: translateX(110%);
            opacity: 0;
          }
        }
        .animate-join-slide {
          animation: joinSlideIn 3.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        .animate-leave-slide {
          animation: leaveSlideOut 3.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
      `}</style>

      {/* User List Container (Scrollable) */}
      <div
        className={`flex-1 overflow-y-auto custom-scrollbar ${hasVideoBackground ? 'bg-transparent' : 'bg-[#fafbfc]'}`}
      >
        {/* Users List */}
        {modalUsers.length > 0 ? (
          modalUsers.map((profile, idx) => {
            const isLocalUser =
              profile.userId === localUserId && profile.callSign === localCallSign;
            const isSpeaking = !!(
              (isTransmitting && isLocalUser) ||
              (activeTransmitter && activeTransmitter.userId === profile.userId)
            );

            let avatarUrlToUse = profile.avatarUrl;
            if (!showPhotosInList) {
              avatarUrlToUse = '';
            } else if (isLocalUser && !showMyPhoto) {
              avatarUrlToUse = '';
            } else if (!isLocalUser && !showOtherPhotos) {
              avatarUrlToUse = '';
            }

            return (
              <UserListItem
                key={`${profile.callSign}-${idx}`}
                profile={profile}
                isLocalUser={isLocalUser}
                isSpeaking={isSpeaking}
                avatarUrlToUse={avatarUrlToUse}
                hasVideoBackground={hasVideoBackground}
                onClick={() => {
                  setActiveZoomedAvatar({
                    ...profile,
                    avatarUrl: avatarUrlToUse,
                  });
                }}
              />
            );
          })
        ) : (
          <div className="p-8 text-center text-xs text-gray-400 font-medium">
            Tidak ada pengguna ditemukan
          </div>
        )}
      </div>

      {/* Zoomed Avatar Overlay Modal */}
      {activeZoomedAvatar && (
        <ModerationActionSheet
          activeZoomedAvatar={activeZoomedAvatar}
          localRole={localRole}
          canModerateTarget={!!canModerateTarget}
          onClose={() => setActiveZoomedAvatar(null)}
          handleUpdateStatus={handleUpdateStatus}
          handleUpdateRole={handleUpdateRole}
        />
      )}

      {/* Toast Notification for User Joins/Leaves */}
      <div className="absolute bottom-16 left-4 right-4 flex flex-col gap-2 pointer-events-none z-[60]">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`px-3.5 py-2.5 rounded-xl flex items-center gap-2.5 border pointer-events-auto transition-all backdrop-blur-[12px] ${
              notif.type === 'join'
                ? 'bg-emerald-500/15 border-emerald-400/30 shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.25)] animate-join-slide'
                : 'bg-rose-500/15 border-rose-400/30 shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.25)] animate-leave-slide'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                notif.type === 'join'
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]'
                  : 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.85)]'
              } animate-pulse`}
            />
            <span
              className={`text-[14px] font-medium leading-none ${
                hasVideoBackground
                  ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]'
                  : 'text-gray-800'
              }`}
            >
              {notif.type === 'join'
                ? `${notif.displayName} bergabung`
                : `${notif.displayName} keluar`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
