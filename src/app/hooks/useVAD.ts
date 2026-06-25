import { useRef, useCallback } from 'react';
import { usePTTStore } from '../store/usePTTStore';

let sharedAudioContext: AudioContext | null = null;

export function useVAD(threshold = 0.01, silenceTimeout = 1500) {
  const vadAnalyserRef = useRef<AnalyserNode | null>(null);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isVADSpeakingRef = useRef<boolean>(true);

  const startVAD = useCallback(
    (stream: MediaStream, micTrack: MediaStreamTrack) => {
      try {
        if (!sharedAudioContext) {
          const AudioContextClass =
            window.AudioContext ||
            (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (!AudioContextClass) return;
          sharedAudioContext = new AudioContextClass();
        }

        const ctx = sharedAudioContext;
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

          // Update store progress bar with real RMS value scaled to 0-100 range
          const scaledProgress = Math.min(100, Math.round(rms * 400));
          usePTTStore.getState().setProgress(scaledProgress);

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
    usePTTStore.getState().setProgress(0);
  }, []);

  return {
    vadAnalyserRef,
    isVADSpeakingRef,
    startVAD,
    stopVAD,
  };
}
