import type { RealtimeChannel } from '@supabase/supabase-js';

// Keep subscription reference in a shared module to avoid React rendering cycles
// and avoid storing non-serializable objects in Zustand state.
export let activeChannelSubscription: RealtimeChannel | null = null;

export const heartbeatState = {
  heartbeatInterval: null as any,
  heartbeatTimeout: null as any,
  activeTransmitterTimeout: null as any,
  expectedPingId: null as string | null,
  missedPings: 0,
};

export function cleanupHeartbeat() {
  if (heartbeatState.heartbeatInterval) {
    clearInterval(heartbeatState.heartbeatInterval);
    heartbeatState.heartbeatInterval = null;
  }
  if (heartbeatState.heartbeatTimeout) {
    clearTimeout(heartbeatState.heartbeatTimeout);
    heartbeatState.heartbeatTimeout = null;
  }
  heartbeatState.expectedPingId = null;
  heartbeatState.missedPings = 0;
}

export function cleanupAllTimers() {
  cleanupHeartbeat();
  if (heartbeatState.activeTransmitterTimeout) {
    clearTimeout(heartbeatState.activeTransmitterTimeout);
    heartbeatState.activeTransmitterTimeout = null;
  }
}

export function setActiveChannelSubscription(sub: RealtimeChannel | null) {
  activeChannelSubscription = sub;
  if (!sub) {
    cleanupAllTimers();
  }
}
