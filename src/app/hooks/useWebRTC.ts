import { useRef, useCallback, useEffect } from 'react';
import { usePTTStore, type WebRTCSignalingPayload } from '../store/usePTTStore';
import { getSupabase } from '../utils/supabase';
import { BRAND } from '../utils/config';
import { startStreamAnalyzer } from '../utils/audioAnalyzer';
import { getIceServersConfig } from '../services/webrtcConfig';

let ephemeralTurnCreds: { iceServers: RTCIceServer[]; expiresAt: number } | null = null;

// P3-5: Fetch ephemeral TURN credentials dari backend Edge Function
export const fetchTurnCredentials = async (): Promise<RTCIceServer[]> => {
  if (ephemeralTurnCreds && Date.now() < ephemeralTurnCreds.expiresAt) {
    return ephemeralTurnCreds.iceServers;
  }

  // Fallback: Biznet Gio TURN / STUN Google from service
  const fallbackServers = getIceServersConfig();

  try {
    // Timeout 5 detik
    const supabase = await getSupabase();
    const invokePromise = supabase.functions.invoke('turn-credentials');
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TURN fetch timeout')), 5000)
    );

    const response = (await Promise.race([invokePromise, timeoutPromise])) as {
      data?: { iceServers?: RTCIceServer[] };
    };

    if (response?.data?.iceServers && Array.isArray(response.data.iceServers)) {
      ephemeralTurnCreds = {
        iceServers: response.data.iceServers,
        // Refresh jika sisa < 5 menit dari TTL (misalnya kita cache 55 menit jika server ngasih 1 jam)
        expiresAt: Date.now() + 55 * 60 * 1000,
      };
      return ephemeralTurnCreds.iceServers;
    }
  } catch (err) {
    console.warn('[WebRTC] Failed to fetch TURN credentials, using fallback STUN', err);
  }

  // Return fallback and cache it for a short time so we don't spam errors
  ephemeralTurnCreds = {
    iceServers: fallbackServers,
    expiresAt: Date.now() + 60 * 1000, // Coba lagi dalam 1 menit
  };
  return fallbackServers;
};

const getIceServers = (): RTCIceServer[] => {
  if (ephemeralTurnCreds && Date.now() < ephemeralTurnCreds.expiresAt) {
    return ephemeralTurnCreds.iceServers;
  }
  return getIceServersConfig();
};

// Helper to modify SDP to prioritize high-quality Opus stereo music stream for Karaoke mode
const preferHighQualityOpus = (sdp: string): string => {
  return sdp.replace(
    /a=fmtp:(\d+) (.*)useinbandfec=1/g,
    'a=fmtp:$1 $2useinbandfec=1;stereo=1;sprop-stereo=1;maxaveragebitrate=128000'
  );
};

export function useWebRTC(
  getSilentTrack: () => { track: MediaStreamTrack | null; stream: MediaStream | null },
  streamRef: React.MutableRefObject<MediaStream | null>
) {
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const candidatesQueueRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const analyzerCleanupsRef = useRef<Map<string, () => void>>(new Map());

  // Play remote stream using programmatic Audio element
  const playRemoteStream = useCallback((peerUserId: string, stream: MediaStream) => {
    let audio = audioElementsRef.current.get(peerUserId);
    if (!audio) {
      audio = new Audio();
      audio.autoplay = true;
      audioElementsRef.current.set(peerUserId, audio);
    }
    audio.srcObject = stream;
    const store = usePTTStore.getState();
    audio.volume = store.pttVolume / 100;

    // Bersihkan analyzer lama jika ada
    const oldCleanup = analyzerCleanupsRef.current.get(peerUserId);
    if (oldCleanup) oldCleanup();

    // Jalankan analyzer RMS riil untuk stream WebRTC yang masuk
    const cleanup = startStreamAnalyzer(stream, (progress) => {
      usePTTStore.getState().setProgress(progress);
    });
    analyzerCleanupsRef.current.set(peerUserId, cleanup);

    audio.play().catch((err) => {
      console.warn(`Failed to play remote WebRTC stream for ${peerUserId}:`, err);
    });
  }, []);

  // Cleanup peer resource
  const cleanupPeer = useCallback((peerUserId: string) => {
    const cleanupAnalyzer = analyzerCleanupsRef.current.get(peerUserId);
    if (cleanupAnalyzer) {
      cleanupAnalyzer();
      analyzerCleanupsRef.current.delete(peerUserId);
    }
    const pc = peerConnectionsRef.current.get(peerUserId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(peerUserId);
    }

    const audio = audioElementsRef.current.get(peerUserId);
    if (audio) {
      audio.pause();
      audio.srcObject = null;
      audioElementsRef.current.delete(peerUserId);
    }

    candidatesQueueRef.current.delete(peerUserId);
  }, []);

  // Create Peer Connection and handle events
  // Ambil ephemeral TURN credentials secara asinkron saat hook di-mount
  useEffect(() => {
    fetchTurnCredentials().catch(console.error);
  }, []);

  const createPeerConnection = useCallback(
    (peerUserId: string) => {
      const existingPc = peerConnectionsRef.current.get(peerUserId);
      if (existingPc) {
        return existingPc;
      }

      const rtcConfig: RTCConfiguration = {
        iceServers: getIceServers(),
        iceTransportPolicy: 'all',
      };
      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionsRef.current.set(peerUserId, pc);

      const store = usePTTStore.getState();
      const isTransmitting = store.isTransmitting;

      const silent = getSilentTrack();
      const localTrack =
        isTransmitting && streamRef.current
          ? streamRef.current.getAudioTracks()[0]
          : silent.track || null;
      const localStream =
        isTransmitting && streamRef.current ? streamRef.current : silent.stream || null;

      if (localTrack && localStream) {
        pc.addTrack(localTrack, localStream);
      }

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          store.broadcastWebRTCSignaling({
            senderUserId: store.userId,
            targetUserId: peerUserId,
            type: 'candidate',
            data: event.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        if (remoteStream) {
          playRemoteStream(peerUserId, remoteStream);
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          cleanupPeer(peerUserId);
        }
      };

      return pc;
    },
    [getSilentTrack, playRemoteStream, cleanupPeer, streamRef]
  );

  // Handle Signaling Messages
  const handleSignaling = useCallback(
    async (payload: WebRTCSignalingPayload) => {
      const { senderUserId, targetUserId, type, data } = payload;
      const store = usePTTStore.getState();

      if (targetUserId !== store.userId || BRAND.isolatedChannels.includes(store.channelNumber))
        return;

      try {
        if (type === 'offer') {
          const pc = createPeerConnection(senderUserId);
          await pc.setRemoteDescription(
            new RTCSessionDescription(data as RTCSessionDescriptionInit)
          );

          const queue = candidatesQueueRef.current.get(senderUserId) || [];
          for (const candidate of queue) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
          candidatesQueueRef.current.delete(senderUserId);

          const answer = await pc.createAnswer();
          let sdp = answer.sdp;
          if (store.audioMode === 'music' && sdp) {
            sdp = preferHighQualityOpus(sdp);
          }
          const modifiedAnswer = { type: answer.type, sdp } as RTCSessionDescriptionInit;
          await pc.setLocalDescription(modifiedAnswer);

          store.broadcastWebRTCSignaling({
            senderUserId: store.userId,
            targetUserId: senderUserId,
            type: 'answer',
            data: modifiedAnswer,
          });
        } else if (type === 'answer') {
          const pc = peerConnectionsRef.current.get(senderUserId);
          if (pc) {
            await pc.setRemoteDescription(
              new RTCSessionDescription(data as RTCSessionDescriptionInit)
            );

            const queue = candidatesQueueRef.current.get(senderUserId) || [];
            for (const candidate of queue) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            candidatesQueueRef.current.delete(senderUserId);
          }
        } else if (type === 'candidate') {
          const pc = peerConnectionsRef.current.get(senderUserId);
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(data as RTCIceCandidateInit));
          } else {
            let queue = candidatesQueueRef.current.get(senderUserId);
            if (!queue) {
              queue = [];
              candidatesQueueRef.current.set(senderUserId, queue);
            }
            queue.push(data as RTCIceCandidateInit);
          }
        }
      } catch (err) {
        console.warn('Error handling WebRTC signaling:', err);
      }
    },
    [createPeerConnection]
  );

  const cleanupAllPeers = useCallback(() => {
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    audioElementsRef.current.forEach((audio) => {
      audio.pause();
      audio.srcObject = null;
    });
    audioElementsRef.current.clear();
    candidatesQueueRef.current.clear();
  }, []);

  return {
    peerConnectionsRef,
    audioElementsRef,
    candidatesQueueRef,
    createPeerConnection,
    cleanupPeer,
    cleanupAllPeers,
    handleSignaling,
  };
}
