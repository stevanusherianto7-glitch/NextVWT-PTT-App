import { useState, useEffect, useRef } from 'react';

export interface AudioVisualizerLevels {
  volume: number; // Normalized volume 0 - 100
  frequencies: Uint8Array; // Raw FFT frequency bins for waveform rendering
  isSpeaking: boolean;
}

/**
 * Custom hook inspired by LiveKit agent-starter-react & ptt-radio architecture.
 * Processes real-time WebRTC audio streams using Web Audio API AnalyserNode
 * for decoupled, high-performance audio visualization without blocking the main UI thread.
 */
export function useAudioVisualizer(
  stream: MediaStream | null,
  options = { fftSize: 64, smoothingTimeConstant: 0.8, speakingThreshold: 12 }
): AudioVisualizerLevels {
  const [levels, setLevels] = useState<AudioVisualizerLevels>({
    volume: 0,
    frequencies: new Uint8Array(options.fftSize / 2),
    isSpeaking: false,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream || !stream.getAudioTracks().length || !stream.getAudioTracks()[0].enabled) {
      setLevels({
        volume: 0,
        frequencies: new Uint8Array(options.fftSize / 2),
        isSpeaking: false,
      });
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = options.fftSize;
      analyser.smoothingTimeConstant = options.smoothingTimeConstant;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevels = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        // Normalize 0-255 to 0-100
        const normalizedVolume = Math.min(100, Math.round((average / 255) * 100 * 1.5));

        setLevels({
          volume: normalizedVolume,
          frequencies: new Uint8Array(dataArray),
          isSpeaking: normalizedVolume > options.speakingThreshold,
        });

        animationFrameRef.current = requestAnimationFrame(updateLevels);
      };

      animationFrameRef.current = requestAnimationFrame(updateLevels);
    } catch (err) {
      console.warn('[useAudioVisualizer] Failed to initialize Web Audio API Analyser:', err);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [stream, options.fftSize, options.smoothingTimeConstant, options.speakingThreshold]);

  return levels;
}
