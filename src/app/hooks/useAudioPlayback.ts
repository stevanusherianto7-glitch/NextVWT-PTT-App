import { useRef, useCallback } from 'react';
import { usePTTStore } from '../store/usePTTStore';

// Helper: Convert Base64 string to ArrayBuffer
export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// Helper: Convert ArrayBuffer to Base64 string
export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

import { initGlobalAudioContext } from '../utils/audioContext';

// Global Singleton Audio Context variables

let globalPlaybackAnalyser: AnalyserNode | null = null;

import { __resetAudioContextForTest as __resetGlobalCtx } from '../utils/audioContext';

export const __resetAudioContextForTest = () => {
  __resetGlobalCtx();
  globalPlaybackAnalyser = null;
};

export function useAudioPlayback() {
  const nextPlaybackTimeRef = useRef<number>(0);

  // Initialize Audio Context lazily
  const getAudioContext = useCallback(() => {
    const ctx = initGlobalAudioContext();
    if (ctx && !globalPlaybackAnalyser) {
      globalPlaybackAnalyser = ctx.createAnalyser();
      globalPlaybackAnalyser.fftSize = 512;
      globalPlaybackAnalyser.connect(ctx.destination);
    }
    return ctx;
  }, []);

  // Play an incoming Base64 voice chunk smoothly (used when WebRTC is not active)
  const playAudioChunk = useCallback(
    async (base64Chunk: string, hasActivePeer?: (userId: string) => boolean) => {
      const store = usePTTStore.getState();

      // Half-duplex constraint: Mute playback when we are actively transmitting
      if (store.isTransmitting && !store.fullDuplex) {
        return;
      }

      // Receiver-side deduplication: Mute/Ignore Base64 stream when we have an active WebRTC stream from the active transmitter
      const activeTx = store.activeTransmitter;
      if (store.isConnected && activeTx && hasActivePeer && hasActivePeer(activeTx.userId)) {
        return;
      }

      const ctx = getAudioContext();
      if (!ctx) return;

      try {
        const arrayBuffer = base64ToArrayBuffer(base64Chunk);
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        const now = ctx.currentTime;

        // Limit queue size to prevent latency accumulation
        const maxQueueVal = parseInt(store.maxQueue, 10) || 99999;
        const queueSize = Math.max(
          0,
          Math.round((nextPlaybackTimeRef.current - now) / audioBuffer.duration)
        );
        if (queueSize >= maxQueueVal) {
          console.warn(
            `[AudioStreamer] Audio queue size (${queueSize}) exceeded limit (${maxQueueVal}). Resetting to live.`
          );
          nextPlaybackTimeRef.current = now + 0.05;
        } else if (nextPlaybackTimeRef.current < now) {
          nextPlaybackTimeRef.current = now + 0.05;
        }

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;

        const gainNode = ctx.createGain();
        gainNode.gain.value = store.pttVolume / 100;

        source.connect(gainNode);
        // ── RX Level Meter ────────────────────────────────────────────────────────
        const rxAnalyser = ctx.createAnalyser();
        rxAnalyser.fftSize = 512;
        const rxDataArray = new Float32Array(rxAnalyser.fftSize);

        gainNode.connect(rxAnalyser);
        rxAnalyser.connect(ctx.destination);

        const rxMeter = setInterval(() => {
          rxAnalyser.getFloatTimeDomainData(rxDataArray);
          let sum = 0;
          for (let i = 0; i < rxDataArray.length; i++) {
            sum += rxDataArray[i] * rxDataArray[i];
          }
          const rms = Math.sqrt(sum / rxDataArray.length);
          const scaledProgress = Math.min(100, Math.round(rms * 400));
          usePTTStore.getState().setProgress(scaledProgress);
        }, 80);

        source.onended = () => {
          clearInterval(rxMeter);
          try {
            source.disconnect();
            gainNode.disconnect();
            rxAnalyser.disconnect();
          } catch {
            // ignore
          }
          const state = usePTTStore.getState();
          if (!state.activeTransmitter && !state.isTransmitting) {
            state.setProgress(0);
          }
        };
        // ── End RX Level Meter ────────────────────────────────────────────────────

        source.start(nextPlaybackTimeRef.current);
        nextPlaybackTimeRef.current += audioBuffer.duration;
      } catch (err) {
        console.warn('Failed to decode or play audio chunk:', err);
      }
    },
    [getAudioContext]
  );

  const flushAudioQueue = useCallback(() => {
    nextPlaybackTimeRef.current = 0;
  }, []);

  return {
    getAudioContext,
    playAudioChunk,
    flushAudioQueue,
  };
}
