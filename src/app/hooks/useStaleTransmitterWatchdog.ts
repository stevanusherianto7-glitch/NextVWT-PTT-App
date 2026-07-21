import { useEffect, useRef } from 'react';
import { usePTTStore } from '../store/usePTTStore';
import type { PTTState } from '../store/types';

type ActiveTransmitter = PTTState['activeTransmitter'];

/**
 * Auto-clears the active transmitter if no voice activity is received
 * within the timeout window (1.5s). Prevents "stuck transmitter" state
 * when a peer disconnects without sending a proper release.
 *
 * Returns a `resetWatchdog` ref that callers invoke on each inbound voice chunk.
 */
export function useStaleTransmitterWatchdog(activeTransmitter: ActiveTransmitter) {
  const resetWatchdogRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let watchdogTimer: ReturnType<typeof setTimeout> | null = null;

    const resetWatchdog = () => {
      if (watchdogTimer) clearTimeout(watchdogTimer);
      watchdogTimer = setTimeout(() => {
        const state = usePTTStore.getState();
        if (state.activeTransmitter && state.activeTransmitter.userId !== state.userId) {
          usePTTStore.setState({ activeTransmitter: null, progress: 0 });
        }
      }, 1500);
    };

    resetWatchdogRef.current = resetWatchdog;

    if (activeTransmitter && activeTransmitter.userId !== usePTTStore.getState().userId) {
      resetWatchdog();
    }

    return () => {
      if (watchdogTimer) {
        clearTimeout(watchdogTimer);
      }
      resetWatchdogRef.current = null;
    };
  }, [activeTransmitter]);

  return { resetWatchdogRef };
}
