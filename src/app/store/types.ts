import type { User } from '@supabase/supabase-js';
import type { ChannelRole } from '../../features/moderation/permissions';

export interface GuestUser {
  id: string;
  isGuest: true;
  email?: string;
  user_metadata: { full_name: string; avatar_url?: string };
  app_metadata: { provider: string };
  aud: string;
  created_at: string;
}

export type AppUser = User | GuestUser;

export interface ChannelItem {
  number: number;
  name: string;
  type: 'green' | 'red' | 'gray' | 'violet';
  users: string[];
}

export interface WebRTCSignalingPayload {
  senderUserId: string;
  senderCallSign?: string;
  targetUserId?: string;
  targetCallSign?: string;
  type: 'offer' | 'answer' | 'candidate';
  data: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

export interface PTTState {
  isPowerOn: boolean;
  isConnected: boolean;
  isTransmitting: boolean;
  lastTransmitTime: number;
  isScanning: boolean;
  progress: number;
  channelNumber: number;
  channelId: string; // UUID v4 format
  userId: string; // UUID v4 format
  callSign: string; // Random 5-character string (combination of 5 letters + numbers)
  error: string | null;

  // Auth State
  user: AppUser | null;
  activeTransmitter: {
    userId: string;
    displayName: string;
    callSign: string;
    role?: string;
    isNewUser?: boolean;
  } | null;
  activeUsers: Array<{
    userId: string;
    displayName: string;
    callSign: string;
    location: string;
    avatarUrl?: string;
    isNewUser?: boolean;
    role?: ChannelRole;
    isMuted?: boolean;
    isControlled?: boolean;
    isWait?: boolean;
    isWaitControlled?: boolean;
  }>;

  // Settings State
  infoText: string;
  locationText: string;
  showMyPhoto: boolean;
  showOtherPhotos: boolean;
  showPhotosInList: boolean;
  fastClick: boolean;
  showModulator: boolean;
  showPTT: boolean;
  maxQueue: string;
  audioMode: 'discussion' | 'music';
  pttSize: number;
  pttBottom: number;
  togglePtt: boolean;
  pttVolume: number;
  vibrateOnStart: boolean;
  toneOnStartEnd: boolean;
  bgActive: boolean;
  fullDuplex: boolean;
  themeText: string;
  builtInEcho: boolean;
  isKaraokePlayerOpen: boolean;
  echoFeedback: number;
  profilePhotoOption: 'google' | 'custom';
  customPhotoUrl: string;
  noiseMode: 'normal' | 'ojol' | 'wind' | 'crowd' | 'emergency';
  codecFallbackActive: boolean;
  coins: number;
  fetchCoins: () => Promise<void>;

  // Fase 1: Onboarding & Feedback
  hasCompletedOnboarding: boolean;
  showFeedbackModal: boolean;
  lastFeedbackTime: number;

  // Actions
  setPower: (power: boolean) => void;
  setConnected: (connected: boolean) => void;
  setTransmitting: (transmitting: boolean) => void;
  hangUpUser: (targetUserId: string) => void;
  kickUser: (targetUserId: string, reason?: string) => void;
  setScanning: (scanning: boolean) => void;
  setProgress: (progress: number) => void;
  setChannelNumber: (numOrFn: number | ((prev: number) => number)) => void;
  setError: (err: string | null) => void;
  initializeSession: () => void;
  updateSettings: (settings: Partial<PTTState>) => void;
  setUser: (user: AppUser | null) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  setKaraokePlayerOpen: (open: boolean) => void;
  subscribeToChannel: (channelNum: number) => void;

  setHasCompletedOnboarding: (completed: boolean) => void;
  setShowFeedbackModal: (show: boolean) => void;
  setLastFeedbackTime: (time: number) => void;

  // Control actions
  channelUp: () => void;
  channelDown: () => void;
  toggleScan: () => void;

  // Audio actions
  onVoiceChunkReceived: ((base64Chunk: string) => void) | null;
  setOnVoiceChunkReceived: (callback: ((base64Chunk: string) => void) | null) => void;
  broadcastVoiceChunk: (base64Chunk: string) => void;

  // WebRTC signaling actions
  onWebRTCSignalingReceived: ((payload: WebRTCSignalingPayload) => void) | null;
  setOnWebRTCSignalingReceived: (
    callback: ((payload: WebRTCSignalingPayload) => void) | null
  ) => void;
  broadcastWebRTCSignaling: (payload: WebRTCSignalingPayload) => void;

  // Reaction actions
  broadcastReaction: (category: 'animation' | 'sound' | 'gift', reaction: string) => void;
  onReactionReceived:
    | ((payload: {
        id: string;
        category: 'animation' | 'sound' | 'gift';
        reaction: string;
        senderName: string;
        senderId?: string;
        senderCallSign?: string | null;
      }) => void)
    | null;
  setOnReactionReceived: (
    callback:
      | ((payload: {
          id: string;
          category: 'animation' | 'sound' | 'gift';
          reaction: string;
          senderName: string;
          senderId?: string;
          senderCallSign?: string | null;
        }) => void)
      | null
  ) => void;

  // Channels online DB actions
  channels: ChannelItem[];
  fetchChannels: () => Promise<void>;
}
