import { useState, useEffect, useRef } from 'react';
import { usePTTStore } from '../store/usePTTStore';
import { ChannelRole } from '../../features/moderation/permissions';
import iconVoice from '../../assets/icon_voice.png';
import iconOperator from '../../assets/icon_operator.png';
import iconModerator from '../../assets/icon_moderator.png';
import iconControlled from '../../assets/icon_controlled.png';
import iconSilent from '../../assets/icon_silent.png';
import iconWait from '../../assets/icon_wait.png';
import iconWaitControlled from '../../assets/icon_wait_controlled.png';
import iconUserBaru from '../../assets/components/icon_tag_baru.svg';
import iconNoc from '../../assets/icon_noc.png';

interface UserListModalProps {
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

export interface UserProfile {
  displayName: string;
  callSign: string;
  location: string;
  avatarColor: string;
  avatarUrl: string;
  isNewUser?: boolean;
  joinedAt?: string;
  role?: ChannelRole;
  isMuted?: boolean;
  isControlled?: boolean;
  isWait?: boolean;
  isWaitControlled?: boolean;
  badges?: string[];
}

export const USER_PROFILES: Record<string, UserProfile> = {
  'Pebri Haryanto': {
    displayName: 'Pebri Haryanto',
    callSign: '2DYUA',
    location: 'BANDUNG, JABAR',
    avatarColor: '#3F51B5',
    avatarUrl: 'https://randomuser.me/api/portraits/women/2.jpg',
    role: 'operator',
    badges: ['❤️', '☕'],
  },
  'Pebe Herianto': {
    displayName: 'Pebe Herianto',
    callSign: 'N.O.C',
    location: 'BANDUNG, JABAR',
    avatarColor: '#3F51B5',
    avatarUrl: 'https://randomuser.me/api/portraits/men/3.jpg',
    role: 'noc',
  },
  agus_santika: {
    displayName: 'Agus Santika',
    callSign: 'MOD01',
    location: 'JAKARTA, DKI',
    avatarColor: '#4CAF50',
    avatarUrl: 'https://randomuser.me/api/portraits/women/4.jpg',
    role: 'operator',
    badges: ['💛', '😊'],
  },
  budi_santoso: {
    displayName: 'Budi',
    callSign: 'MUT02',
    location: 'SURABAYA, JATIM',
    avatarColor: '#F44336',
    avatarUrl: 'https://randomuser.me/api/portraits/men/5.jpg',
    isMuted: true,
    badges: ['☕'],
  },
  citra_kirana: {
    displayName: 'Citra',
    callSign: 'CTR03',
    location: 'YOGYAKARTA, DIY',
    avatarColor: '#9C27B0',
    avatarUrl: 'https://randomuser.me/api/portraits/women/6.jpg',
    isControlled: true,
    badges: ['💙', '🌟'],
  },
  dedi_pratama: {
    displayName: 'Dedi',
    callSign: 'WAT04',
    location: 'MEDAN, SUMUT',
    avatarColor: '#FF9800',
    avatarUrl: 'https://randomuser.me/api/portraits/men/7.jpg',
    isWait: true,
  },
  euis_cahyani: {
    displayName: 'Euis',
    callSign: 'WTC05',
    location: 'BANDUNG, JABAR',
    avatarColor: '#E91E63',
    avatarUrl: 'https://randomuser.me/api/portraits/women/8.jpg',
    isWaitControlled: true,
  },
  fajar_nugraha: {
    displayName: 'Fajar',
    callSign: 'OPR06',
    location: 'DENPASAR, BALI',
    avatarColor: '#00BCD4',
    avatarUrl: 'https://randomuser.me/api/portraits/men/9.jpg',
    role: 'operator',
  },
  gilang_ramadhan: {
    displayName: 'Gilang',
    callSign: 'GST07',
    location: 'LOMBOK, NTB',
    avatarColor: '#607D8B',
    avatarUrl: 'https://randomuser.me/api/portraits/men/26.jpg',
    role: 'guest',
  },
  noc_global: {
    displayName: 'NOC Global',
    callSign: 'NOC00',
    location: 'JAKARTA, DKI',
    avatarColor: '#3F51B5',
    avatarUrl: 'https://randomuser.me/api/portraits/women/10.jpg',
    role: 'noc',
    badges: ['🔥', '💻'],
  },
  sys_admin_vwt: {
    displayName: 'SysAdmin VWT',
    callSign: 'SYS99',
    location: 'BANDUNG, JABAR',
    avatarColor: '#009688',
    avatarUrl: 'https://randomuser.me/api/portraits/men/11.jpg',
    role: 'sys_admin',
    badges: ['👑', '🛡️'],
  },
  pjc_room_manager: {
    displayName: 'PJC Room Mgr',
    callSign: 'PJC01',
    location: 'SURABAYA, JATIM',
    avatarColor: '#E91E63',
    avatarUrl: 'https://randomuser.me/api/portraits/women/12.jpg',
    role: 'pjc',
    badges: ['💜', '🍵'],
  },
  operator_otomatis: {
    displayName: 'Operator Auto',
    callSign: 'OPR99',
    location: 'SEMARANG, JATENG',
    avatarColor: '#FF9800',
    avatarUrl: 'https://randomuser.me/api/portraits/men/13.jpg',
    role: 'operator',
  },
  mario_teguh: {
    displayName: 'Siswa Baru',
    callSign: 'NEW01',
    location: 'MALANG, JATIM',
    avatarColor: '#4CAF50',
    avatarUrl: 'https://randomuser.me/api/portraits/women/14.jpg',
    isNewUser: true,
  },
  nina_marlina: {
    displayName: 'Pendengar Setia',
    callSign: 'LSTNR',
    location: 'MEDAN, SUMUT',
    avatarColor: '#9E9E9E',
    avatarUrl: 'https://randomuser.me/api/portraits/men/15.jpg',
    isMuted: true,
  },
  oscar_lawalata: {
    displayName: 'Tamu (Ctrl)',
    callSign: 'GST02',
    location: 'DENPASAR, BALI',
    avatarColor: '#9C27B0',
    avatarUrl: 'https://randomuser.me/api/portraits/women/16.jpg',
    isControlled: true,
  },
  test_user_1: {
    displayName: 'Test User 1',
    callSign: 'TST01',
    location: 'JAKARTA SELATAN, DKI',
    avatarColor: '#2196F3',
    avatarUrl: 'https://randomuser.me/api/portraits/men/44.jpg',
    role: 'operator',
  },
  test_user_2: {
    displayName: 'Test User 2',
    callSign: 'TST02',
    location: 'BANDUNG UTARA, JABAR',
    avatarColor: '#8BC34A',
    avatarUrl: 'https://randomuser.me/api/portraits/women/45.jpg',
    role: 'guest',
  },
  test_user_3: {
    displayName: 'Test User 3',
    callSign: 'TST03',
    location: 'SURABAYA BARAT, JATIM',
    avatarColor: '#FFC107',
    avatarUrl: 'https://randomuser.me/api/portraits/men/46.jpg',
    role: 'noc',
  },
  test_user_4: {
    displayName: 'Test User 4',
    callSign: 'TST04',
    location: 'YOGYAKARTA, DIY',
    avatarColor: '#9C27B0',
    avatarUrl: 'https://randomuser.me/api/portraits/women/47.jpg',
    role: 'operator',
  },
  antoni_99: {
    displayName: 'Arthur',
    callSign: 'FLPSP',
    location: 'CILEGON, BANTEN',
    avatarColor: '#E91E63',
    avatarUrl: 'https://randomuser.me/api/portraits/men/17.jpg',
  },
  budi_salatiga: {
    displayName: 'Benhur',
    callSign: '6EKR4',
    location: 'DEMAK, JATENG',
    avatarColor: '#9C27B0',
    avatarUrl: 'https://randomuser.me/api/portraits/women/18.jpg',
  },
  rudi_bandung: {
    displayName: 'Ayda',
    callSign: 'L2P8G',
    location: 'SEMARANG, JATENG',
    avatarColor: '#FF9800',
    avatarUrl: 'https://randomuser.me/api/portraits/men/19.jpg',
  },
  medan_dx: {
    displayName: 'Zainiz',
    callSign: '6Y2RM',
    location: 'BANDA ACEH, ACEH',
    avatarColor: '#009688',
    avatarUrl: 'https://randomuser.me/api/portraits/women/20.jpg',
  },
  palembang_line: {
    displayName: 'Gun Pakabelo',
    callSign: 'JYQTJ',
    location: 'PALU, SULTENG',
    avatarColor: '#795548',
    avatarUrl: 'https://randomuser.me/api/portraits/men/21.jpg',
  },
  touring_rider: {
    displayName: 'Topo',
    callSign: '0S9W4',
    location: 'BANDAR LAMPUNG, LAMPUNG',
    avatarColor: '#4CAF50',
    avatarUrl: 'https://randomuser.me/api/portraits/women/22.jpg',
  },
  ninja_club: {
    displayName: 'Nengkleo',
    callSign: 'J3REY',
    location: 'PASURUAN, JATIM',
    avatarColor: '#00BCD4',
    avatarUrl: 'https://randomuser.me/api/portraits/men/23.jpg',
  },
  pak_rudi_rt: {
    displayName: 'Endang Wahyuni',
    callSign: 'JK4Z1',
    location: 'SOLO, JATENG',
    avatarColor: '#FF5722',
    avatarUrl: 'https://randomuser.me/api/portraits/women/24.jpg',
  },
  siskamling_1: {
    displayName: 'Gwenie',
    callSign: 'KWZ10',
    location: 'SAMARINDA, KALTIM',
    avatarColor: '#607D8B',
    avatarUrl: 'https://randomuser.me/api/portraits/men/25.jpg',
  },
  lalin_update: {
    displayName: 'Rudi Interizti',
    callSign: 'QR95J',
    location: 'CILACAP, JATENG',
    avatarColor: '#3F51B5',
    avatarUrl: 'https://randomuser.me/api/portraits/women/26.jpg',
    isNewUser: true,
    joinedAt: '2026-05-20', // Joined 21 days ago (older than 2 weeks, badge automatically hidden)
  },
  anto_bekasi: {
    displayName: 'Vida',
    callSign: 'XGYQK',
    location: 'LIMA PULUH KOTA, SUMBAR',
    avatarColor: '#E91E63',
    avatarUrl: 'https://randomuser.me/api/portraits/men/27.jpg',
  },
  doni_depok: {
    displayName: 'Zaki',
    callSign: '1C0TT',
    location: 'SUMENEP, JATIM',
    avatarColor: '#9C27B0',
    avatarUrl: 'https://randomuser.me/api/portraits/women/28.jpg',
  },
  makassar_boy: {
    displayName: 'Pin Ponelipu',
    callSign: '84NCR',
    location: 'MOROWALI, SULTENG',
    avatarColor: '#FF9800',
    avatarUrl: 'https://randomuser.me/api/portraits/men/29.jpg',
  },
  sar_team_1: {
    displayName: 'Dino',
    callSign: 'FKXFV',
    location: 'JAMBI KOTA, JAMBI',
    avatarColor: '#009688',
    avatarUrl: 'https://randomuser.me/api/portraits/women/30.jpg',
  },
  mount_hiker: {
    displayName: 'Saif Sereyang',
    callSign: '5UFQ4',
    location: 'METRO, LAMPUNG',
    avatarColor: '#795548',
    avatarUrl: 'https://randomuser.me/api/portraits/men/31.jpg',
  },
  support_admin: {
    displayName: '☆•°•LÌÀ••°•☆',
    callSign: 'SATU HATI',
    location: 'SEMARANG, JATENG',
    avatarColor: '#4CAF50',
    avatarUrl: 'https://randomuser.me/api/portraits/women/32.jpg',
  },
  eko_pratama: {
    displayName: 'Gam Cantoy',
    callSign: 'H4T1P',
    location: 'BANDA ACEH, ACEH',
    avatarColor: '#00BCD4',
    avatarUrl: 'https://randomuser.me/api/portraits/men/33.jpg',
  },
  dewi_sari: {
    displayName: 'Neng Tien',
    callSign: 'NPT3U',
    location: 'PADANG LAWAS, SUMUT',
    avatarColor: '#FF5722',
    avatarUrl: 'https://randomuser.me/api/portraits/women/34.jpg',
  },
  siti_aminah: {
    displayName: 'Zha Zha',
    callSign: 'XJV6T',
    location: 'MADIUN, JATIM',
    avatarColor: '#607D8B',
    avatarUrl: 'https://randomuser.me/api/portraits/men/35.jpg',
  },
  joko_susilo: {
    displayName: 'Putra Paser',
    callSign: '65TQH',
    location: 'BANTAENG, SULSEL',
    avatarColor: '#3F51B5',
    avatarUrl: 'https://randomuser.me/api/portraits/women/36.jpg',
  },
  hendra_w: {
    displayName: 'Hendra Wijaya',
    callSign: '8YFD3',
    location: 'DENPASAR, BALI',
    avatarColor: '#E91E63',
    avatarUrl: 'https://randomuser.me/api/portraits/men/37.jpg',
  },
  yudi_antara: {
    displayName: 'Yudi Antara',
    callSign: '5TGB7',
    location: 'MATARAM, NTB',
    avatarColor: '#9C27B0',
    avatarUrl: 'https://randomuser.me/api/portraits/women/38.jpg',
  },
  agus_setiawan: {
    displayName: 'Agus Setiawan',
    callSign: '4RFV2',
    location: 'SURABAYA, JATIM',
    avatarColor: '#FF9800',
    avatarUrl: 'https://randomuser.me/api/portraits/men/39.jpg',
  },
  roni_h: {
    displayName: 'Roni Hidayat',
    callSign: '9OLK4',
    location: 'BALIKPAPAN, KALTIM',
    avatarColor: '#009688',
    avatarUrl: 'https://randomuser.me/api/portraits/women/40.jpg',
  },
  irma_p: {
    displayName: 'Irma Permata',
    callSign: '1QAZ2',
    location: 'PALEMBANG, SUMSEL',
    avatarColor: '#795548',
    avatarUrl: 'https://randomuser.me/api/portraits/men/41.jpg',
  },
  pebri_fans: {
    displayName: 'Pebri Fans Club',
    callSign: '7UJM8',
    location: 'CIREBON, JABAR',
    avatarColor: '#4CAF50',
    avatarUrl: 'https://randomuser.me/api/portraits/women/42.jpg',
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

  return { displayName, callSign, location, avatarColor, avatarUrl };
}

function AvatarImage({
  src,
  displayName,
  avatarColor,
  fallbackIconUrl,
  badge,
}: {
  src?: string;
  displayName: string;
  avatarColor: string;
  fallbackIconUrl: string;
  badge?: React.ReactNode;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    const isVoiceIcon = fallbackIconUrl === iconVoice;
    const bgColor = isVoiceIcon ? '#ffffff' : avatarColor || '#3F51B5';
    return (
      <div
        className="w-full h-full rounded-none flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] border border-white/20"
        style={{ backgroundColor: bgColor }}
      >
        <img src={fallbackIconUrl} alt={displayName} className="w-[35px] h-[35px] object-contain" />
      </div>
    );
  }

  return (
    <>
      <img
        src={src}
        alt={displayName}
        onError={() => setHasError(true)}
        className="w-full h-full rounded-none object-cover shadow-[0_2px_4px_rgba(0,0,0,0.15)] border border-white/20"
      />
      {badge}
    </>
  );
}

/**
 * Helper function to determine if a user profile is "new" (registered/joined less than 2 weeks ago)
 */
function isNewUserJoined(profile: UserProfile): boolean {
  // Seorang NOC atau System Admin tidak boleh dilabeli sebagai user baru
  if (profile.role === 'noc' || profile.role === 'sys_admin' || profile.callSign === 'N.O.C') {
    return false;
  }
  if (!profile.isNewUser) return false;
  if (!profile.joinedAt) return true; // Default to true if flag is set but no joined date is provided

  const joinedDate = new Date(profile.joinedAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - joinedDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 14;
}

type UserMode =
  | 'voice'
  | 'operator'
  | 'moderator'
  | 'silent'
  | 'controlled'
  | 'wait'
  | 'wait_controlled';

const MODE_ICONS: Record<UserMode, string> = {
  voice: iconVoice,
  operator: iconOperator,
  moderator: iconModerator,
  silent: iconSilent,
  controlled: iconControlled,
  wait: iconWait,
  wait_controlled: iconWaitControlled,
};

const MODE_LABELS: Record<UserMode, string> = {
  voice: 'Voice',
  operator: 'Operator',
  moderator: 'Moderator',
  silent: 'Silent (Mute)',
  controlled: 'Controlled',
  wait: 'Wait (Antri)',
  wait_controlled: 'Wait Controlled',
};

function getUserMode(profile: UserProfile): UserMode {
  if (profile.isMuted) return 'silent';
  if (profile.isControlled) return 'controlled';
  if (profile.isWait) return 'wait';
  if (profile.isWaitControlled) return 'wait_controlled';

  if (profile.role === 'operator') return 'operator';
  if (profile.role === 'pjc' || profile.role === 'sys_admin' || profile.role === 'noc')
    return 'moderator';
  return 'voice';
}

export function UserListModal({
  channel,
  channelName: _channelName,
  users,
  hasVideoBackground,
}: UserListModalProps) {
  const isTransmitting = usePTTStore((state) => state.isTransmitting);
  const activeTransmitter = usePTTStore((state) => state.activeTransmitter);
  const localUserId = usePTTStore((state) => state.userId);
  const localUser = usePTTStore((state) => state.user);
  const localInfoText = usePTTStore((state) => state.infoText);
  const localName = localUser?.user_metadata?.full_name || localInfoText || 'Pebe Herianto';

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
  const mapUsers = (list: typeof users) => {
    return list.map((user) => {
      const uId = typeof user === 'string' ? user : user.userId;
      const roomId = `ptt-room-${channel}`;
      const localRole = sessionStorage.getItem(
        `channel-role:${roomId}:${uId}`
      ) as ChannelRole | null;
      const localStatus = sessionStorage.getItem(`channel-status:${roomId}:${uId}`);

      let profileData: UserProfile;
      if (typeof user === 'string') {
        profileData = { ...(USER_PROFILES[user] || getDeterministicProfile(user)) };
      } else {
        const matchedProfile =
          USER_PROFILES[user.userId] ||
          USER_PROFILES[user.displayName] ||
          Object.values(USER_PROFILES).find((p) => p.callSign === user.callSign);

        profileData = {
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

      return {
        ...profileData,
        avatarUrl: isLocalUser && localAvatar ? localAvatar : profileData.avatarUrl,
        userId: uId,
        role: localRole || profileData.role || 'guest',
        isMuted: localStatus === 'muted' || (localStatus ? false : profileData.isMuted) || false,
        isControlled:
          localStatus === 'controlled' || (localStatus ? false : profileData.isControlled) || false,
        isWait: localStatus === 'wait' || (localStatus ? false : profileData.isWait) || false,
        isWaitControlled:
          localStatus === 'wait_controlled' ||
          (localStatus ? false : profileData.isWaitControlled) ||
          false,
      };
    });
  };

  const [modalUsers, setModalUsers] = useState(() => mapUsers(users));

  // Sync state if users or channel changes
  useEffect(() => {
    setModalUsers(mapUsers(users));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, channel]);
  const [notifications, setNotifications] = useState<
    Array<{ id: string; displayName: string; type: 'join' | 'leave' }>
  >([]);
  const prevModalUsersRef = useRef<any[]>([]);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const currentMapped = mapUsers(users);
    const prevMapped = prevModalUsersRef.current;

    const currentIds = currentMapped.map((u) => u.userId);
    const prevIds = prevMapped.map((u) => u.userId);

    if (isFirstRender.current) {
      prevModalUsersRef.current = currentMapped;
      isFirstRender.current = false;
      return;
    }

    const joined = currentMapped.filter((u) => !prevIds.includes(u.userId));
    const left = prevMapped.filter((u) => !currentIds.includes(u.userId));

    if (joined.length > 0 || left.length > 0) {
      const newNotifs: Array<{ id: string; displayName: string; type: 'join' | 'leave' }> = [];

      joined.forEach((u) => {
        const notifId = Math.random().toString();
        newNotifs.push({
          id: notifId,
          displayName: u.displayName || u.userId,
          type: 'join',
        });
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== notifId));
        }, 3600);
      });

      left.forEach((u) => {
        const notifId = Math.random().toString();
        newNotifs.push({
          id: notifId,
          displayName: u.displayName || u.userId,
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
  }, [users]);
  const [activeZoomedAvatar, setActiveZoomedAvatar] = useState<(typeof modalUsers)[0] | null>(null);

  // Check if current logged-in user holds Moderator/Operator/NOC/SysAdmin position
  const roomId = `ptt-room-${channel}`;
  const localProfile = modalUsers.find(
    (u) => u.userId === localUserId || u.displayName === localName || u.callSign === '2DYUA'
  );
  const localRole =
    (localUserId
      ? (sessionStorage.getItem(`channel-role:${roomId}:${localUserId}`) as ChannelRole | null)
      : null) ||
    localProfile?.role ||
    'guest';
  const canModerate =
    localRole === 'operator' ||
    localRole === 'pjc' ||
    localRole === 'sys_admin' ||
    localRole === 'noc';

  const handleUpdateRole = (uId: string, nextRole: ChannelRole) => {
    const roomId = `ptt-room-${channel}`;
    sessionStorage.setItem(`channel-role:${roomId}:${uId}`, nextRole);
    if (uId === localUserId || uId === '2DYUA' || uId === localName) {
      window.dispatchEvent(new Event('channel-role-changed'));
    }
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
    if (statusType === 'normal') {
      sessionStorage.setItem(`channel-status:${roomId}:${uId}`, 'active');
    } else {
      sessionStorage.setItem(`channel-status:${roomId}:${uId}`, statusType);
    }

    if (uId === localUserId || uId === '2DYUA' || uId === localName) {
      window.dispatchEvent(new Event('channel-role-changed'));
    }

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
              profile.userId === localUserId ||
              profile.displayName === localName ||
              profile.callSign === '2DYUA';
            const isSpeaking =
              (isTransmitting && isLocalUser) ||
              (activeTransmitter && activeTransmitter.userId === profile.userId);

            let avatarUrlToUse = profile.avatarUrl;
            if (!showPhotosInList) {
              avatarUrlToUse = '';
            } else if (isLocalUser && !showMyPhoto) {
              avatarUrlToUse = '';
            } else if (!isLocalUser && !showOtherPhotos) {
              avatarUrlToUse = '';
            }

            return (
              <div
                key={`${profile.callSign}-${idx}`}
                className={`w-full flex items-center pr-4 pl-0 transition-all duration-300 border-b cursor-pointer ${
                  isSpeaking
                    ? 'active-user-glow z-10'
                    : hasVideoBackground
                      ? 'bg-transparent border-white/10 hover:bg-white/10 active:bg-white/20'
                      : 'bg-[#fafbfc] border-gray-300 hover:bg-white active:bg-gray-100'
                }`}
                onClick={() => {
                  setActiveZoomedAvatar({
                    ...profile,
                    avatarUrl: avatarUrlToUse,
                  });
                }}
              >
                {/* Avatar with mode icon overlay */}
                <div className="relative w-[52px] h-[52px] shrink-0 select-none hover:scale-105 active:scale-95 transition-transform duration-200">
                  {(() => {
                    const mode = getUserMode(profile);
                    const fallbackIconUrl = profile.role === 'noc' ? iconNoc : MODE_ICONS[mode];

                    const badgeNode = (
                      <img
                        src={fallbackIconUrl}
                        alt={profile.role === 'noc' ? 'NOC' : MODE_LABELS[mode]}
                        title={profile.role === 'noc' ? 'NOC' : MODE_LABELS[mode]}
                        className="absolute bottom-0 right-0 w-[20px] h-[20px] mb-0.5 mr-0.5 object-contain drop-shadow-[0_1.5px_2.5px_rgba(0,0,0,0.35)]"
                        style={
                          mode === 'operator'
                            ? {
                                filter:
                                  'brightness(1.55) contrast(1.3) drop-shadow(0px 1px 1.5px rgba(0,0,0,0.75))',
                              }
                            : undefined
                        }
                        draggable={false}
                      />
                    );

                    return (
                      <AvatarImage
                        src={avatarUrlToUse}
                        displayName={profile.displayName}
                        avatarColor={profile.avatarColor}
                        fallbackIconUrl={fallbackIconUrl}
                        badge={badgeNode}
                      />
                    );
                  })()}
                </div>

                {/* Name & Details */}
                <div className="ml-3 flex-1 min-w-0 text-left">
                  <div
                    className={`text-[14px] font-medium truncate leading-snug ${hasVideoBackground ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]' : 'text-gray-800'}`}
                  >
                    <span className="truncate">{profile.displayName}</span>
                  </div>
                  <div className="flex items-center text-[11px] mt-0.5 truncate gap-px font-medium leading-none">
                    {isNewUserJoined(profile) && (
                      <img
                        src={iconUserBaru}
                        alt="Baru"
                        className="h-[12px] w-auto object-contain select-none"
                        style={{ filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.15))' }}
                        draggable={false}
                      />
                    )}
                    {profile.badges &&
                      profile.badges.map((badge, idx) => (
                        <span key={idx} className="text-[11px] select-none" title="Lencana">
                          {badge}
                        </span>
                      ))}
                    <span
                      className={`text-[#00C853] font-semibold tracking-wide ${hasVideoBackground ? 'drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.6)]' : ''}`}
                    >
                      {profile.callSign}
                    </span>
                    <span
                      className={`${hasVideoBackground ? 'text-white/40' : 'text-gray-400'} font-normal mx-px`}
                    >
                      ·
                    </span>
                    <span
                      className={`${hasVideoBackground ? 'text-white/70 drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.6)]' : 'text-gray-500'} font-normal uppercase`}
                    >
                      {profile.location}
                    </span>
                  </div>
                </div>

                {/* Active Speaker Megaphone Toa Icon */}
                {isSpeaking && (
                  <div className="mr-1 flex items-center justify-center animate-pulse text-[#0088cc]">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="currentColor">
                      <path d="M16 5v14c0 .55-.45 1-1 1h-1l-4-4H6c-1.1 0-2-.9-2-2v-4c0-1.1.9-2 2-2h4l4-4h1c.55 0 1 .45 1 1zm3 7c0-2.03-1.02-3.82-2.58-4.88L15 8.56C16.2 9.29 17 10.55 17 12s-.8 2.71-2 3.44l1.42 1.44C17.98 15.82 19 14.03 19 12zm-3-2.28c.59.54.96 1.3.96 2.28s-.37 1.74-.96 2.28l1.42 1.42c1.07-1 1.71-2.39 1.71-3.7s-.64-2.7-1.71-3.7l-1.42 1.42z" />
                    </svg>
                  </div>
                )}
              </div>
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setActiveZoomedAvatar(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-[340px] w-full mx-4 shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-200 border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Expanded Avatar */}
            <div className="w-40 h-40 rounded-none overflow-hidden shadow-lg border-2 border-[#00C853] relative flex items-center justify-center bg-gray-100">
              {activeZoomedAvatar.avatarUrl ? (
                <img
                  src={activeZoomedAvatar.avatarUrl}
                  alt={activeZoomedAvatar.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white font-bold text-5xl"
                  style={{ backgroundColor: activeZoomedAvatar.avatarColor }}
                >
                  {activeZoomedAvatar.displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Profile Info Details */}
            <h3 className="mt-4 text-lg font-bold text-gray-900 text-center truncate w-full">
              {activeZoomedAvatar.displayName}
            </h3>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              {isNewUserJoined(activeZoomedAvatar) && (
                <img
                  src={iconUserBaru}
                  alt="Baru"
                  className="h-[12px] w-auto object-contain select-none"
                  style={{ filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.15))' }}
                  draggable={false}
                />
              )}
              {activeZoomedAvatar.badges &&
                activeZoomedAvatar.badges.map((badge, idx) => (
                  <span key={idx} className="text-sm select-none" title="Lencana">
                    {badge}
                  </span>
                ))}
              <span className="text-sm font-semibold text-[#00C853] tracking-wider">
                {activeZoomedAvatar.callSign}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5 uppercase tracking-wide">
              {activeZoomedAvatar.location}
            </div>

            {/* Moderation Conditioning Panel */}
            {canModerate && (
              <div className="w-full mt-4 pt-4 border-t border-gray-100">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center mb-2">
                  Mode Moderasi Jalur
                </div>
                <div className="grid grid-cols-2 gap-1.5 w-full">
                  {/* Voice / Normal */}
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(activeZoomedAvatar.userId, 'normal')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all duration-200 ${
                      !activeZoomedAvatar.isMuted &&
                      !activeZoomedAvatar.isControlled &&
                      !activeZoomedAvatar.isWait &&
                      !activeZoomedAvatar.isWaitControlled
                        ? 'bg-emerald-50 border-emerald-500/30 text-emerald-700 shadow-sm'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <img src={iconVoice} className="w-3.5 h-3.5 object-contain" alt="Voice" />
                    Voice
                  </button>

                  {/* Silent / Muted */}
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(activeZoomedAvatar.userId, 'muted')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all duration-200 ${
                      activeZoomedAvatar.isMuted
                        ? 'bg-red-50 border-red-500/30 text-red-700 shadow-sm'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <img src={iconSilent} className="w-3.5 h-3.5 object-contain" alt="Silent" />
                    Silent
                  </button>

                  {/* Controlled */}
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(activeZoomedAvatar.userId, 'controlled')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all duration-200 ${
                      activeZoomedAvatar.isControlled
                        ? 'bg-amber-50 border-amber-500/30 text-amber-700 shadow-sm'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <img
                      src={iconControlled}
                      className="w-3.5 h-3.5 object-contain"
                      alt="Controlled"
                    />
                    Controlled
                  </button>

                  {/* Wait */}
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(activeZoomedAvatar.userId, 'wait')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all duration-200 ${
                      activeZoomedAvatar.isWait
                        ? 'bg-blue-50 border-blue-500/30 text-blue-700 shadow-sm'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <img src={iconWait} className="w-3.5 h-3.5 object-contain" alt="Wait" />
                    Wait (Antri)
                  </button>

                  {/* Wait Controlled */}
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(activeZoomedAvatar.userId, 'wait_controlled')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all duration-200 ${
                      activeZoomedAvatar.isWaitControlled
                        ? 'bg-indigo-50 border-indigo-500/30 text-indigo-700 shadow-sm'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <img
                      src={iconWaitControlled}
                      className="w-3.5 h-3.5 object-contain"
                      alt="Wait Controlled"
                    />
                    Wait Ctrl
                  </button>

                  {/* Hang Up */}
                  <button
                    type="button"
                    id="btn-hang-up-user"
                    onClick={() => {
                      usePTTStore.getState().hangUpUser(activeZoomedAvatar.userId);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all duration-200 bg-red-50 border-red-500/30 text-red-700 hover:bg-red-100"
                  >
                    {/* Lightning / Flash Icon (Petir) */}
                    <svg
                      viewBox="0 0 24 24"
                      className="w-3.5 h-3.5 fill-current"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                    </svg>
                    Hang Up
                  </button>
                </div>

                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center mt-3.5 mb-2">
                  Peran / Jabatan Jalur
                </div>
                <div className="grid grid-cols-2 gap-1.5 w-full">
                  {/* Operator */}
                  <button
                    type="button"
                    onClick={() => handleUpdateRole(activeZoomedAvatar.userId, 'operator')}
                    className={`flex items-center justify-center gap-0.5 py-1 rounded-lg border text-[10px] font-semibold transition-all duration-200 ${
                      activeZoomedAvatar.role === 'operator'
                        ? 'bg-teal-50 border-teal-500/30 text-teal-700 shadow-sm'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <img
                      src={iconOperator}
                      className="w-3.5 h-3.5 object-contain"
                      style={{
                        filter:
                          'brightness(1.55) contrast(1.3) drop-shadow(0px 1px 1.5px rgba(0,0,0,0.75))',
                      }}
                      alt="Operator"
                    />
                    Operator
                  </button>

                  {/* Moderator */}
                  <button
                    type="button"
                    onClick={() => handleUpdateRole(activeZoomedAvatar.userId, 'pjc')}
                    className={`flex items-center justify-center gap-0.5 py-1 rounded-lg border text-[10px] font-semibold transition-all duration-200 ${
                      activeZoomedAvatar.role === 'pjc'
                        ? 'bg-rose-50 border-rose-500/30 text-rose-700 shadow-sm'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <img
                      src={iconModerator}
                      className="w-3.5 h-3.5 object-contain"
                      alt="Moderator"
                    />
                    Moderator
                  </button>
                </div>

                {/* NOC Only: Banned Button */}
                {localRole === 'noc' && (
                  <button
                    type="button"
                    id="btn-banned-user"
                    onClick={() => {
                      // 1. Mark target user as silent/muted globally (optional, but good practice)
                      handleUpdateStatus(activeZoomedAvatar.userId, 'muted');
                      // 2. Broadcast kick/banned to force target user to jump to CH 302
                      usePTTStore.getState().kickUser(activeZoomedAvatar.userId, 'Banned by NOC');
                      // 3. Move NOC themselves to CH 302 to handle the user
                      usePTTStore.getState().setChannelNumber(302);
                      // 4. Close modal
                      setActiveZoomedAvatar(null);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 mt-2.5 rounded-lg border text-[11px] font-semibold transition-all duration-200 bg-red-800 border-red-900 text-white shadow-md hover:bg-red-700 active:scale-[0.98]"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="w-3.5 h-3.5 fill-current"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z" />
                    </svg>
                    Banned (Pindah ke CH 302)
                  </button>
                )}
              </div>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setActiveZoomedAvatar(null)}
              className="mt-5 px-6 py-2 bg-gray-800 hover:bg-gray-700 active:bg-gray-900 text-white text-xs font-semibold rounded-full shadow transition-colors duration-200 w-full text-center"
            >
              Tutup
            </button>
          </div>
        </div>
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
