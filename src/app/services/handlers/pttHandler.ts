import { usePTTStore } from '../../store/usePTTStore';
import { safeParseRealtimePayload } from '../../store/schemas/realtimePayloads';
import { PttStatePayloadSchema } from '../../store/schemas/realtimePayloads';
import { ChannelRole, roleRank } from '../../../features/moderation/permissions';
import { toast } from 'sonner';

let activeTransmitterTimeout: NodeJS.Timeout | null = null;

export function startActiveTransmitterWatchdog(userId: string, displayName: string) {
  if (activeTransmitterTimeout) {
    clearTimeout(activeTransmitterTimeout);
  }
  activeTransmitterTimeout = setTimeout(() => {
    const state = usePTTStore.getState();
    if (state.activeTransmitter && state.activeTransmitter.userId === userId) {
      console.warn(
        `[Watchdog] Transmission from ${displayName} exceeded 60s limit. Force clearing.`
      );
      usePTTStore.setState({ activeTransmitter: null });
      if (userId === state.userId && state.isTransmitting) {
        state.setTransmitting(false);
      }
    }
    activeTransmitterTimeout = null;
  }, 60000);
}

export function clearActiveTransmitterWatchdog() {
  if (activeTransmitterTimeout) {
    clearTimeout(activeTransmitterTimeout);
    activeTransmitterTimeout = null;
  }
}

export function handlePttState(rawPayload: unknown) {
  const payload = safeParseRealtimePayload(PttStatePayloadSchema, rawPayload, 'ptt_state');
  if (!payload) return;
  if (payload.isTransmitting) {
    const state = usePTTStore.getState();
    const isOtherDevice = payload.userId !== state.userId || payload.callSign !== state.callSign;

    if (isOtherDevice) {
      const myRole = state.myChannelRole ?? 'guest';
      const myPriority = roleRank[myRole as ChannelRole] ?? 1;
      const incomingPriority = roleRank[(payload.role as ChannelRole) ?? 'guest'] ?? 1;

      if (state.isTransmitting) {
        // 1. Moderator Override (Pre-emption)
        if (incomingPriority > myPriority) {
          usePTTStore.setState({ isTransmitting: false, progress: 0 });
          toast.error(
            `Transmisi Anda dihentikan: Jalur diambil alih oleh Moderator/Operator (${payload.displayName}).`
          );
        }
        // 2. PTT Collision Detection (Deterministic Tie-Breaker)
        else {
          const localTime = state.lastTransmitTime;
          const remoteTime = payload.timestamp || 0;

          const lostCollision =
            localTime > remoteTime || (localTime === remoteTime && state.userId > payload.userId);

          if (lostCollision) {
            usePTTStore.setState({ isTransmitting: false, progress: 0 });
            toast.warning(`Jalur sibuk! Transmisi bertabrakan dengan ${payload.displayName}.`);
          }
        }
      }
    }

    usePTTStore.setState({
      activeTransmitter: {
        userId: payload.userId,
        displayName: payload.displayName,
        callSign: payload.callSign,
        role: payload.role,
        isNewUser: payload.isNewUser,
      },
    });
    startActiveTransmitterWatchdog(payload.userId, payload.displayName);
  } else {
    const currentTx = usePTTStore.getState().activeTransmitter;
    if (currentTx && currentTx.userId === payload.userId) {
      usePTTStore.setState({ activeTransmitter: null });
      clearActiveTransmitterWatchdog();
    }
  }
}
