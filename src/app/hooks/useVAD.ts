import { useRef, useCallback } from 'react';
import { usePTTStore } from '../store/usePTTStore';

import { initGlobalAudioContext } from '../utils/audioContext';
export function useVAD(threshold = 0.01, silenceTimeout = 1500) {
  const vadAnalyserRef = useRef<AnalyserNode | null>(null);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isVADSpeakingRef = useRef<boolean>(true);

  const prevProgressRef = useRef(0);

  const startVAD = useCallback(
    (stream: MediaStream, micTrack: MediaStreamTrack) => {
      try {
        const ctx = initGlobalAudioContext();
        if (!ctx) {
          console.warn('VAD initialization failed: globalAudioContext is null');
          return;
        }

        // Ensure the context is running (it might be suspended if created early)
        if (ctx.state === 'suspended') {
          ctx.resume().catch(console.warn);
        }

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);

        vadAnalyserRef.current = analyser;
        isVADSpeakingRef.current = true;

        const bufferLength = analyser.fftSize;
        const dataArray = new Float32Array(bufferLength);

        let silenceStart = 0;

        const checkVAD = () => {
          if (!vadAnalyserRef.current) return;

          analyser.getFloatTimeDomainData(dataArray);

          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / bufferLength);

          // Update store progress bar with real RMS value scaled to 0-100 range with asymmetric smoothing
          const PROGRESS_SCALE = 400;
          const rawProgress = Math.min(100, rms * PROGRESS_SCALE);

          const ATTACK = 0.45; // fast rise
          const RELEASE = 0.15; // slow decay

          const prev = prevProgressRef.current;
          const smoothed =
            rawProgress > prev
              ? prev + (rawProgress - prev) * ATTACK
              : prev + (rawProgress - prev) * RELEASE;

          prevProgressRef.current = smoothed;
          usePTTStore.getState().setProgress(Math.round(smoothed));

          if (rms < threshold) {
            if (silenceStart === 0) {
              silenceStart = Date.now();
            } else if (Date.now() - silenceStart > silenceTimeout) {
              if (isVADSpeakingRef.current) {
                isVADSpeakingRef.current = false;
                micTrack.enabled = false; // Mute sending to save mobile data
              }
            }
          } else {
            silenceStart = 0;
            if (!isVADSpeakingRef.current) {
              isVADSpeakingRef.current = true;
              micTrack.enabled = true; // Unmute sending
            }
          }
        };

        vadIntervalRef.current = setInterval(checkVAD, 100);
      } catch (err) {
        console.warn('VAD initialization failed:', err);
      }
    },
    [threshold, silenceTimeout]
  );

  const stopVAD = useCallback(() => {
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    vadAnalyserRef.current = null;
    prevProgressRef.current = 0;
    usePTTStore.getState().setProgress(0);
  }, []);

  return {
    vadAnalyserRef,
    isVADSpeakingRef,
    startVAD,
    stopVAD,
  };
}
