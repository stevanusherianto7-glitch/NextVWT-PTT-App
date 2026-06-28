import { create } from 'zustand';
import { PTTState } from './types';
import { subscribeToChannel } from '../services/channelSubscription';

export type { AppUser, ChannelItem, WebRTCSignalingPayload, GuestUser, PTTState } from './types';

export {
  safeGetStorage,
  safeSetStorage,
  generateUUID,
  getChannelUUID,
  generateRandomCallSign,
  PERSISTED_KEYS,
  pickPersistedState,
} from './storeUtils';

import { createAuthSlice } from './slices/createAuthSlice';
import { createUISlice } from './slices/createUISlice';
import { createChannelSlice } from './slices/createChannelSlice';
import { createSettingsSlice } from './slices/createSettingsSlice';
import { createWebRTCSlice } from './slices/createWebRTCSlice';

// ─── Store ────────────────────────────────────────────────────────────────────
export const usePTTStore = create<PTTState>()((set, get, store) => ({
  ...createAuthSlice(set, get, store),
  ...createUISlice(set, get, store),
  ...createChannelSlice(set, get, store),
  ...createSettingsSlice(set, get, store),
  ...createWebRTCSlice(set, get, store),

  subscribeToChannel: (channelNum: number) => {
    subscribeToChannel(channelNum, 0);
  },
}));
