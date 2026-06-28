import { StateCreator } from 'zustand';
import { PTTState } from '../types';
import { BRAND } from '../../utils/config';
import type { ChannelRole } from '../../../features/moderation/permissions';
import {
  safeSetStorage,
  safeGetStorage,
  generateUUID,
  generateRandomCallSign,
  getChannelUUID,
  PERSISTED_KEYS,
  pickPersistedState,
} from '../storeUtils';
import { activeChannelSubscription } from '../subscription';

export const createSettingsSlice: StateCreator<
  PTTState,
  [],
  [],
  Pick<
    PTTState,
    | 'infoText'
    | 'locationText'
    | 'showMyPhoto'
    | 'showOtherPhotos'
    | 'showPhotosInList'
    | 'fastClick'
    | 'showModulator'
    | 'showPTT'
    | 'maxQueue'
    | 'audioMode'
    | 'pttSize'
    | 'pttBottom'
    | 'togglePtt'
    | 'pttVolume'
    | 'vibrateOnStart'
    | 'toneOnStartEnd'
    | 'bgActive'
    | 'fullDuplex'
    | 'themeText'
    | 'builtInEcho'
    | 'isKaraokePlayerOpen'
    | 'echoFeedback'
    | 'profilePhotoOption'
    | 'customPhotoUrl'
    | 'noiseMode'
    | 'codecFallbackActive'
    | 'updateSettings'
    | 'setKaraokePlayerOpen'
    | 'initializeSession'
    | 'userId'
    | 'callSign'
  >
> = (set, get) => ({
  infoText: '',
  locationText: 'BANDUNG, JABAR',
  showMyPhoto: true,
  showOtherPhotos: true,
  showPhotosInList: true,
  fastClick: true,
  showModulator: true,
  showPTT: true,
  maxQueue: '99999',
  audioMode: 'music',
  pttSize: 30,
  pttBottom: 50,
  togglePtt: true,
  pttVolume: 70,
  vibrateOnStart: true,
  toneOnStartEnd: true,
  bgActive: true,
  fullDuplex: false,
  themeText: BRAND.defaultTheme,
  builtInEcho: true,
  isKaraokePlayerOpen: false,
  echoFeedback: 35,
  profilePhotoOption: 'custom',
  customPhotoUrl: '',
  noiseMode: 'normal',
  codecFallbackActive: false,
  userId: '',
  callSign: '',

  updateSettings: (settings) => {
    set((state) => {
      const next = { ...state, ...settings };
      // Delta-sync: only write settings-relevant keys to localStorage
      safeSetStorage(pickPersistedState(settings));

      // Delta-sync: updates active presence tracking if settings change
      // Check if we need to update presence
      if (next.isConnected && activeChannelSubscription) {
        const userMeta = next.user;
        const displayName = next.infoText || userMeta?.user_metadata?.full_name;
        const location = next.locationText;
        const avatarUrl =
          next.profilePhotoOption === 'google'
            ? userMeta?.user_metadata?.avatar_url || ''
            : next.customPhotoUrl;

        const roomId = `ptt-room-${next.channelNumber}`;
        const localRole = (localStorage.getItem(`channel-role:${roomId}:${next.userId}`) ||
          'guest') as ChannelRole;
        const localStatus =
          localStorage.getItem(`channel-status:${roomId}:${next.userId}`) || 'active';
        let presenceStatus: 'normal' | 'muted' | 'controlled' | 'wait' | 'wait_controlled' =
          'normal';
        if (
          localStatus === 'muted' ||
          localStatus === 'controlled' ||
          localStatus === 'wait' ||
          localStatus === 'wait_controlled'
        ) {
          presenceStatus = localStatus as typeof presenceStatus;
        }

        activeChannelSubscription
          .track({
            userId: next.userId,
            displayName: displayName,
            callSign: next.callSign || '2DYUA',
            location: location,
            avatarUrl: avatarUrl,
            createdAt: userMeta?.created_at,
            role: localRole,
            status: presenceStatus,
          })
          .catch((err) => {
            console.warn('Failed to update presence metadata on settings update:', err);
          });
      }

      return settings;
    });
  },

  setKaraokePlayerOpen: (open) => set({ isKaraokePlayerOpen: open }),

  initializeSession: () => {
    const state = get();
    if (state.userId) return; // Already initialized

    const newUserId = generateUUID();

    // --- Offline Recovery: restore settings from localStorage cache ---
    const cached = safeGetStorage();
    const restored: Partial<PTTState> = {};

    if (cached) {
      for (const key of PERSISTED_KEYS) {
        if (key in cached && (cached as Record<string, unknown>)[key] !== undefined) {
          // @ts-expect-error dynamic key assignment
          restored[key] = (cached as Record<string, unknown>)[key];
        }
      }
    }

    // Restore or generate callSign
    const newCallSign = restored.callSign || generateRandomCallSign();
    if (!restored.callSign) {
      safeSetStorage({ callSign: newCallSign });
      restored.callSign = newCallSign;
    }

    // Establish initial connection using restored or default channel
    const channelToJoin = (restored.channelNumber as number) ?? state.channelNumber;
    setTimeout(() => {
      get().subscribeToChannel(channelToJoin);
      get().fetchChannels();
    }, 0);

    set({
      userId: newUserId,
      ...restored,
      // Derive channelId from restored channel number
      channelId: getChannelUUID(channelToJoin),
    });
  },
});
