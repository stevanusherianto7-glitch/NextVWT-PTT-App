import { StateCreator } from 'zustand';
import { PTTState } from '../types';
import { pttRateLimiter } from '../../utils/rateLimiter';
import { activeChannelSubscription, setActiveChannelSubscription } from '../subscription';
import { safeSetStorage } from '../storeUtils';
import { startBackgroundService, stopBackgroundService } from '../../utils/backgroundSurvival';
import { toast } from 'sonner';

let localTransmissionTimeout: NodeJS.Timeout | null = null;

export const createUISlice: StateCreator<
  PTTState,
  [],
  [],
  Pick<
    PTTState,
    | 'isPowerOn'
    | 'isConnected'
    | 'isTransmitting'
    | 'isScanning'
    | 'progress'
    | 'error'
    | 'setPower'
    | 'setConnected'
    | 'setTransmitting'
    | 'hangUpUser'
    | 'kickUser'
    | 'setScanning'
    | 'setProgress'
    | 'setError'
    | 'hasCompletedOnboarding'
    | 'showFeedbackModal'
    | 'lastFeedbackTime'
    | 'setHasCompletedOnboarding'
    | 'setShowFeedbackModal'
    | 'setLastFeedbackTime'
    | 'onReactionReceived'
    | 'setOnReactionReceived'
    | 'broadcastReaction'
  >
> = (set, get) => ({
  isPowerOn: true,
  isConnected: false,
  isTransmitting: false,
  isScanning: false,
  progress: 0,
  error: null,
  hasCompletedOnboarding: false,
  showFeedbackModal: false,
  lastFeedbackTime: 0,

  setPower: (power) => {
    const state = get();
    if (!power) {
      if (activeChannelSubscription) {
        activeChannelSubscription.unsubscribe();
        setActiveChannelSubscription(null);
      }
      stopBackgroundService().catch((err) =>
        console.warn('Failed to stop background service:', err)
      );
      if (localTransmissionTimeout) {
        clearTimeout(localTransmissionTimeout);
        localTransmissionTimeout = null;
      }
      set({
        isPowerOn: false,
        isConnected: false,
        isTransmitting: false,
        isScanning: false,
        progress: 0,
      });
      return;
    }
    // Re-establish subscription on power on
    setTimeout(() => get().subscribeToChannel(state.channelNumber), 0);
    const info = `Siaga di Saluran ${String(state.channelNumber).padStart(3, '0')}`;
    startBackgroundService(info).catch((err) =>
      console.warn('Failed to start background service:', err)
    );
    set({ isPowerOn: true, isConnected: true });
  },

  setConnected: (connected) => set({ isConnected: connected }),

  setTransmitting: (transmitting) => {
    const state = get();
    if (!state.isPowerOn) return;

    if (transmitting) {
      if (!pttRateLimiter.canProceed()) {
        console.warn('[Rate Limit] PTT transmission toggle ignored due to flood control');
        return;
      }

      // Check simulated COR busy signal
      const isCorActive = localStorage.getItem('nextvwt:cor_active') === 'true';
      if (isCorActive) {
        toast.warning('Frekuensi sedang sibuk (COR aktif)! Transmisi ditolak.');
        return;
      }

      // Start local watchdog timer to auto-stop transmission after 60 seconds
      if (localTransmissionTimeout) {
        clearTimeout(localTransmissionTimeout);
      }
      localTransmissionTimeout = setTimeout(() => {
        console.warn('[Watchdog] Local transmission exceeded 60s limit. Force stopping.');
        get().setTransmitting(false);
        toast.info('Transmisi otomatis berhenti setelah 60 detik.');
      }, 60000);

      // Stateful Floor Control & Priority check
      // [F-06] Role is derived from the Zustand store (server-authoritative via useChannelRole),
      // NOT from localStorage which can be tampered by the user to escalate privileges.
      const activeTx = state.activeTransmitter;
      const roomId = `ptt-room-${state.channelNumber}`;
      // Read from store state as fallback — the definitive role is set by useChannelRole hook
      // from the Supabase channel_roles table.
      const myRole =
        (state as { _channelRole?: string })._channelRole ??
        localStorage.getItem(`channel-role:${roomId}:${state.userId}`) ??
        'guest';

      const ROLE_PRIORITY: Record<string, number> = {
        noc: 5,
        sys_admin: 4,
        pjc: 3,
        operator: 2,
        member: 1.5,
        guest: 1,
      };

      if (activeTx && activeTx.userId !== state.userId) {
        const myPriority = ROLE_PRIORITY[myRole] || 1;
        const activePriority = ROLE_PRIORITY[activeTx.role || 'guest'] || 1;

        // Emergency Override: NOC/SysAdmin/PJC can hijack the floor
        const isEmergencyRank = myRole === 'noc' || myRole === 'sys_admin' || myRole === 'pjc';
        if (isEmergencyRank && myPriority > activePriority) {
          if (activeChannelSubscription && state.isConnected) {
            activeChannelSubscription.send({
              type: 'broadcast',
              event: 'hang_up',
              payload: {
                targetUserId: activeTx.userId,
                moderatorName: `${state.infoText || 'System'} (Emergency Override)`,
              },
            });
          }
          toast.success(`Emergency Override! Mengambil alih saluran dari ${activeTx.displayName}.`);
        } else {
          toast.error(`Saluran sedang digunakan oleh ${activeTx.displayName}. Menunggu giliran.`);
          return;
        }
      }
    }

    if (activeChannelSubscription && state.isConnected) {
      const userMeta = state.user;
      const displayName = state.infoText || userMeta?.user_metadata?.full_name || 'User';
      const roomId = `ptt-room-${state.channelNumber}`;
      // [F-06] Prefer the store-cached role over localStorage for broadcast metadata
      const myRole =
        (state as { _channelRole?: string })._channelRole ??
        localStorage.getItem(`channel-role:${roomId}:${state.userId}`) ??
        'guest';

      activeChannelSubscription.send({
        type: 'broadcast',
        event: 'ptt_state',
        payload: {
          userId: state.userId,
          displayName: displayName,
          callSign: state.callSign || '2DYUA',
          isTransmitting: transmitting,
          role: myRole,
        },
      });
    }

    if (!transmitting) {
      if (localTransmissionTimeout) {
        clearTimeout(localTransmissionTimeout);
        localTransmissionTimeout = null;
      }
    }

    set({ isTransmitting: transmitting, progress: transmitting ? 50 : 0 });
  },

  hangUpUser: (targetUserId: string) => {
    const state = get();
    if (!state.isPowerOn) return;

    // Broadcast hang_up event to all clients on this channel
    if (activeChannelSubscription && state.isConnected) {
      const userMeta = state.user;
      const moderatorName = state.infoText || userMeta?.user_metadata?.full_name || 'Moderator';

      activeChannelSubscription.send({
        type: 'broadcast',
        event: 'hang_up',
        payload: {
          targetUserId,
          moderatorName,
        },
      });
    }

    // Optimistically clear the active transmitter locally if it matches the target
    const currentTx = state.activeTransmitter;
    if (currentTx && currentTx.userId === targetUserId) {
      set({ activeTransmitter: null, progress: 0 });
    }

    // If we are hanging up ourselves, stop our own transmission
    if (targetUserId === state.userId && state.isTransmitting) {
      set({ isTransmitting: false, progress: 0 });
    }
  },

  kickUser: (targetUserId: string, reason?: string) => {
    const state = get();
    if (!state.isPowerOn) return;

    if (activeChannelSubscription && state.isConnected) {
      activeChannelSubscription.send({
        type: 'broadcast',
        event: 'kick',
        payload: {
          targetUserId,
          reason,
        },
      });
    }

    // Optimistically clear the active transmitter locally if it matches the target
    const currentTx = state.activeTransmitter;
    if (currentTx && currentTx.userId === targetUserId) {
      set({ activeTransmitter: null, progress: 0 });
    }
  },

  setScanning: (scanning) => {
    const state = get();
    if (!state.isPowerOn) return;
    set({ isScanning: scanning });
  },

  setProgress: (progress) => {
    const state = get();
    if (!state.isPowerOn) return;

    // Guard: ignore non-zero progress values if we are neither transmitting nor receiving
    const isTransmitting = state.isTransmitting;
    const isReceiving = !!state.activeTransmitter;
    if (!isTransmitting && !isReceiving && progress > 0) {
      if (state.progress !== 0) {
        set({ progress: 0 });
      }
      return;
    }

    set({ progress });
  },

  setError: (error) => set({ error }),

  setHasCompletedOnboarding: (completed) => {
    safeSetStorage({ hasCompletedOnboarding: completed });
    set({ hasCompletedOnboarding: completed });
  },
  setShowFeedbackModal: (show) => set({ showFeedbackModal: show }),
  setLastFeedbackTime: (time) => {
    safeSetStorage({ lastFeedbackTime: time });
    set({ lastFeedbackTime: time });
  },
  onReactionReceived: null,
  setOnReactionReceived: (callback) => set({ onReactionReceived: callback }),
  broadcastReaction: (category, reaction) => {
    const state = get();
    if (!state.isConnected) return;
    if (activeChannelSubscription) {
      activeChannelSubscription.send({
        type: 'broadcast',
        event: 'reaction',
        payload: {
          id: Math.random().toString(),
          roomId: state.channelId,
          senderId: state.userId,
          senderName: state.infoText || 'User',
          category,
          reaction,
          createdAt: Date.now(),
        },
      });
    }
  },
});
