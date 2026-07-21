import { useEffect, useRef } from 'react';
import { usePTTStore } from '../store/usePTTStore';
import { USE_SFU, BRAND } from '../utils/config';
import {
  createLiveKitTransport,
  type LiveKitAudioTransport,
} from '../services/livekitAudioTransport';
import { fetchLiveKitToken } from '../services/livekitToken';
import { toast } from 'sonner';

interface UseSfuTransportArgs {
  isPowerOn: boolean;
  isTransmitting: boolean;
  channel: number;
}

/**
 * Manages the LiveKit SFU transport lifecycle:
 * - Connect/disconnect on power on/off or channel change
 * - Mic enable/disable on PTT toggle
 * - Remote audio playback and presence sync
 *
 * Only active when `USE_SFU` is true. Mesh fallback is handled by the caller.
 */
export function useSfuTransport({ isPowerOn, isTransmitting, channel }: UseSfuTransportArgs) {
  const transportRef = useRef<LiveKitAudioTransport | null>(null);
  const localMicStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioElsRef = useRef<HTMLAudioElement[]>([]);

  // ── Connect / Disconnect ──────────────────────────────────────────────────
  useEffect(() => {
    if (!USE_SFU || !isPowerOn) return;

    let cancelled = false;
    const roomName = `ptt-room-${channel}`;

    async function setup() {
      try {
        const transport = createLiveKitTransport(BRAND.livekitUrl);
        if (!transport) return;

        const { token } = await fetchLiveKitToken(channel);
        if (cancelled) return;

        const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          localStream.getTracks().forEach((t) => t.stop());
          return;
        }
        localMicStreamRef.current = localStream;
        const track = localStream.getAudioTracks()[0];
        if (!track) throw new Error('Tidak ada audio track dari mikrofon');

        transport.onRemoteAudio((_userId, stream) => {
          const el = new Audio();
          el.srcObject = stream;
          el.autoplay = true;
          void el.play().catch(() => undefined);
          remoteAudioElsRef.current.push(el);
        });

        transport.onPresence((users) => {
          usePTTStore.setState({
            activeUsers: users.map((u) => ({
              userId: u.userId,
              displayName: u.displayName,
              callSign: u.callSign,
              location: u.location,
              isNewUser: false,
            })),
          });
        });

        await transport.connect(roomName, token);
        await transport.publishMic(track);
        transport.emitInitialPresence();
        transport.setMicEnabled(false);
        transportRef.current = transport;
      } catch (err) {
        console.error('[SFU] gagal connect ke LiveKit:', err);
        toast.error('Gagal menghubungkan ke server audio (SFU). Menggunakan mode fallback.');
      }
    }

    void setup();

    return () => {
      cancelled = true;
      transportRef.current?.disconnect();
      transportRef.current = null;
      localMicStreamRef.current?.getTracks().forEach((t) => t.stop());
      localMicStreamRef.current = null;
      remoteAudioElsRef.current.forEach((el) => {
        el.pause();
        el.srcObject = null;
      });
      remoteAudioElsRef.current = [];
    };
  }, [isPowerOn, channel]);

  // ── Mic enable/disable on PTT toggle ──────────────────────────────────────
  useEffect(() => {
    if (!USE_SFU) return;
    const enabled = isTransmitting && isPowerOn && channel !== 100;
    transportRef.current?.setMicEnabled(enabled);
  }, [isTransmitting, isPowerOn, channel]);

  return { transportRef };
}
