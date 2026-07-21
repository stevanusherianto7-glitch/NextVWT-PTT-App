import { useEffect, useRef } from 'react';
import { usePTTStore } from '../store/usePTTStore';
import { useAudioStreamer } from './useAudioStreamer';
import { base64ToArrayBuffer, arrayBufferToBase64 } from './useAudioPlayback';
import { toast } from 'sonner';
import { playChirpSound } from '../utils/radioSound';
import { USE_SFU } from '../utils/config';
import { useSfuTransport } from './useSfuTransport';
import { useNetworkConnection } from './useNetworkConnection';
import { useStaleTransmitterWatchdog } from './useStaleTransmitterWatchdog';

interface UseRadioAudioEngineArgs {
  isPowerOn: boolean;
  isTransmitting: boolean;
  isScanning: boolean;
  channel: number;
  activeTransmitter: ReturnType<typeof usePTTStore.getState>['activeTransmitter'];
  status: string;
  setProgress: (v: number) => void;
}

/**
 * Owns the audio transmit/receive lifecycle, the stale-transmitter watchdog,
 * the channel scan loop, the power/connection resets, and the simulated AI
 * operator reply on channel 99.
 *
 * Composed from focused sub-hooks: useSfuTransport, useNetworkConnection,
 * useStaleTransmitterWatchdog.
 */
export function useRadioAudioEngine({
  isPowerOn,
  isTransmitting,
  isScanning,
  channel,
  activeTransmitter,
  status,
  setProgress,
}: UseRadioAudioEngineArgs) {
  const { startRecording, stopRecording, playAudioChunk, flushAudioQueue } = useAudioStreamer();

  const setIsTransmitting = usePTTStore((state) => state.setTransmitting);
  const setOnVoiceChunkReceived = usePTTStore((state) => state.setOnVoiceChunkReceived);

  const txStartTimeRef = useRef<number>(0);
  const echoChunksRef = useRef<string[]>([]);

  // ── Sub-hooks ─────────────────────────────────────────────────────────────
  useSfuTransport({ isPowerOn, isTransmitting, channel });
  useNetworkConnection();
  const { resetWatchdogRef } = useStaleTransmitterWatchdog(activeTransmitter);

  // Auto-chirp when the local user list changes (join/leave).
  const prevUserIdsRef = useRef<string[]>([]);
  const isFirstRender = useRef(true);
  useEffect(() => {
    isFirstRender.current = true;
  }, [channel]);

  // Reset progress when there is no transmit/receive activity.
  useEffect(() => {
    if (!isPowerOn) {
      setProgress(0);
      return;
    }
    const isReceiving =
      !!activeTransmitter && activeTransmitter.userId !== usePTTStore.getState().userId;

    if (!isTransmitting && !isReceiving) {
      setProgress(0);
    }
  }, [isPowerOn, isTransmitting, activeTransmitter, setProgress]);

  // Transmit lifecycle — start/stop recording and route the audio chunks.
  useEffect(() => {
    if (USE_SFU && channel !== 100) return;

    if (isTransmitting && isPowerOn) {
      flushAudioQueue();
      startRecording((base64Chunk) => {
        const isConn = usePTTStore.getState().isConnected;
        const currentChannel = usePTTStore.getState().channelNumber;
        if (currentChannel === 100) {
          echoChunksRef.current.push(base64Chunk);
        } else if (isConn) {
          usePTTStore.getState().broadcastVoiceChunk(base64Chunk);
        } else {
          playAudioChunk(base64Chunk);
        }
      }).catch((err) => {
        console.error('Failed to start audio recording:', err);
        const errMsg = err instanceof Error ? err.name : String(err);
        if (errMsg === 'NotAllowedError' || errMsg === 'PermissionDeniedError') {
          toast.error('Akses mikrofon ditolak. Silakan aktifkan izin mikrofon Anda.');
        } else if (errMsg === 'NotFoundError' || errMsg === 'DevicesNotFoundError') {
          toast.error('Perangkat mikrofon tidak ditemukan. Hubungkan mikrofon terlebih dahulu.');
        } else {
          toast.error(
            'Gagal mengakses mikrofon: ' + (err instanceof Error ? err.message : String(err))
          );
        }
        setIsTransmitting(false);
      });
      txStartTimeRef.current = Date.now();
    } else {
      const currentChannel = usePTTStore.getState().channelNumber;
      if (currentChannel === 100) {
        stopRecording(async () => {
          if (echoChunksRef.current.length > 0) {
            try {
              const chunksToPlay = [...echoChunksRef.current];
              echoChunksRef.current = [];

              const buffers = chunksToPlay.map(base64ToArrayBuffer);
              const combinedBlob = new Blob(buffers, { type: 'audio/webm' });
              const arrayBuffer = await combinedBlob.arrayBuffer();
              const base64String = arrayBufferToBase64(arrayBuffer);

              await playAudioChunk(base64String);
            } catch (err) {
              console.error('Failed to play back parrot echo chunks:', err);
            }
          }
        });
      } else {
        stopRecording();
      }

      if (txStartTimeRef.current > 0) {
        const txDuration = Date.now() - txStartTimeRef.current;
        const lastFeedback = usePTTStore.getState().lastFeedbackTime;
        const timeSinceLastFeedback = Date.now() - lastFeedback;
        const ONE_DAY = 24 * 60 * 60 * 1000;

        if (txDuration > 3000 && timeSinceLastFeedback > ONE_DAY) {
          usePTTStore.getState().setShowFeedbackModal(true);
        }
        txStartTimeRef.current = 0;
      }
    }
    return () => {
      stopRecording();
    };
  }, [
    isTransmitting,
    isPowerOn,
    channel,
    startRecording,
    stopRecording,
    playAudioChunk,
    flushAudioQueue,
    setIsTransmitting,
  ]);

  // Play inbound voice chunks (mesh path).
  useEffect(() => {
    if (USE_SFU) return;

    setOnVoiceChunkReceived((base64) => {
      if (isPowerOn && channel !== 100 && status !== 'muted') {
        playAudioChunk(base64);
        if (resetWatchdogRef.current) {
          resetWatchdogRef.current();
        }
      }
    });
    return () => {
      setOnVoiceChunkReceived(null);
    };
  }, [isPowerOn, channel, status, setOnVoiceChunkReceived, playAudioChunk, resetWatchdogRef]);

  // Stop audio when power is cut.
  useEffect(() => {
    if (!isPowerOn) {
      stopRecording();
      flushAudioQueue();
    }
  }, [isPowerOn, stopRecording, flushAudioQueue]);

  // Channel scan loop.
  useEffect(() => {
    if (isScanning) {
      const interval = setInterval(() => {
        usePTTStore.getState().channelUp();
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [isScanning]);

  // Stop transmit when local status forbids it.
  useEffect(() => {
    if (
      isTransmitting &&
      (status === 'muted' ||
        status === 'ptt_blocked' ||
        status === 'suspended' ||
        status === 'banned')
    ) {
      setIsTransmitting(false);
      toast.error(
        status === 'muted'
          ? 'Transmisi dihentikan: Anda dibungkam (muted) di channel ini.'
          : status === 'ptt_blocked'
            ? 'Transmisi dihentikan: Hak PTT Anda diblokir.'
            : 'Transmisi dihentikan: Status Anda dibatasi.'
      );
    }
  }, [status, isTransmitting, setIsTransmitting]);

  // Simulated AI operator reply on channel 99 after a transmission ends.
  const wasTransmittingRef = useRef(false);
  useEffect(() => {
    const wasTransmitting = wasTransmittingRef.current;
    wasTransmittingRef.current = isTransmitting;

    if (wasTransmitting && !isTransmitting && channel === 99 && isPowerOn) {
      const aiResponseTimer = setTimeout(() => {
        playChirpSound(true);

        const responses = [
          'Ganti. Laporan cuaca Posko SAR Satu terpantau aman dan kondusif. Gunung Cereme berawan tebal, angin barat dua belas knot. Tetap waspada. Ganti.',
          'Ganti. Saldo koin Anda saat ini masih mencukupi untuk transmisi jangka panjang. Tetap monitor frekuensi untuk info selanjutnya. Ganti.',
          'Ganti. Kami mendeteksi sebanyak tiga stasiun aktif di sekitar koordinat Anda. Silakan lanjutkan komunikasi patroli Anda. Ganti.',
          'Ganti. Panggilan darurat NOC global standby. Harap laporkan jika ada kendala modulasi atau gangguan frekuensi di lapangan. Ganti.',
          'Ganti. Selamat siang rekan-rekan. AI Operator NextVWT siap membantu pemantauan dan koordinasi Off-Grid Anda. Monitor standby. Ganti.',
        ];
        const randomText = responses[Math.floor(Math.random() * responses.length)];

        usePTTStore.setState({
          activeTransmitter: {
            userId: 'sim_ai_operator',
            displayName: 'AI Operator',
            callSign: 'AI-OPS',
            role: 'operator',
          },
        });

        const speechStart = Date.now();
        const progInterval = setInterval(() => {
          const elapsed = (Date.now() - speechStart) / 1000;
          const wordRhythm = Math.max(0, Math.sin(elapsed * 7.5));
          const syllable = Math.abs(Math.sin(elapsed * 14));
          const breathingGap = elapsed % 3.5 < 0.2 ? 0.05 : 1;
          const speechEnvelope = (wordRhythm * 0.5 + syllable * 0.5) * breathingGap;
          const naturalProgress = Math.max(5, speechEnvelope * 85 + (Math.random() * 8 - 4));
          setProgress(Math.min(100, naturalProgress));
        }, 80);

        const finishSpeech = () => {
          clearInterval(progInterval);
          setProgress(0);
          usePTTStore.setState({ activeTransmitter: null });
          playChirpSound(false);
        };

        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(randomText);
          utterance.lang = 'id-ID';
          utterance.rate = 0.95;
          utterance.pitch = 1.0;
          utterance.onend = finishSpeech;
          utterance.onerror = finishSpeech;
          window.speechSynthesis.speak(utterance);
        } else {
          setTimeout(finishSpeech, 4000);
        }
      }, 1200);

      return () => clearTimeout(aiResponseTimer);
    }
  }, [isTransmitting, channel, isPowerOn, setProgress]);

  // Join/leave chirp detection.
  const handleUserListChange = (ids: string[]) => {
    if (isFirstRender.current) {
      prevUserIdsRef.current = ids;
      isFirstRender.current = false;
      return;
    }
    const prev = prevUserIdsRef.current;
    const joined = ids.filter((id) => !prev.includes(id));
    const left = prev.filter((id) => !ids.includes(id));
    if (joined.length > 0) playChirpSound(true);
    else if (left.length > 0) playChirpSound(false);
    prevUserIdsRef.current = ids;
  };

  return { handleUserListChange };
}
