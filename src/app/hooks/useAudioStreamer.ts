import { useRef, useCallback, useEffect } from 'react';
import { usePTTStore, type WebRTCSignalingPayload } from '../store/usePTTStore';
import { useWebRTC } from './useWebRTC';
import { useVAD } from './useVAD';
import { useAudioPlayback, arrayBufferToBase64 } from './useAudioPlayback';
import { BRAND } from '../utils/config';

export function useAudioStreamer() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null); // Real mic stream
  const silentTrackRef = useRef<MediaStreamTrack | null>(null);
  const silentStreamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const currentCleanupRef = useRef<(() => void) | null>(null);

  // Audio Node tracking for Garbage Collection
  const audioNodesRef = useRef<{
    source: MediaStreamAudioSourceNode | null;
    delay: DelayNode | null;
    feedback: GainNode | null;
    hpf: BiquadFilterNode | null;
    bandpass: BiquadFilterNode | null;
    agc: DynamicsCompressorNode | null;
    dest: MediaStreamAudioDestinationNode | null;
  }>({
    source: null,
    delay: null,
    feedback: null,
    hpf: null,
    bandpass: null,
    agc: null,
    dest: null,
  });

  const { startVAD, stopVAD } = useVAD();

  const {
    getAudioContext,
    playAudioChunk: playAudioChunkBase64,
    flushAudioQueue,
  } = useAudioPlayback();

  // Lazy init silent track, reuse singleton AudioContext to prevent memory leaks
  const getSilentTrack = useCallback(() => {
    if (!silentTrackRef.current) {
      try {
        const ctx = getAudioContext();
        if (ctx) {
          const dest = ctx.createMediaStreamDestination();
          silentTrackRef.current = dest.stream.getAudioTracks()[0];
          silentStreamRef.current = dest.stream;
        }
      } catch (err) {
        console.warn('Failed to create silent dummy track:', err);
      }
    }
    return { track: silentTrackRef.current, stream: silentStreamRef.current };
  }, [getAudioContext]);

  // Use sub-hooks
  const {
    peerConnectionsRef,
    audioElementsRef,
    createPeerConnection,
    cleanupPeer,
    cleanupAllPeers,
    handleSignaling,
  } = useWebRTC(getSilentTrack, streamRef);

  // Helper check if a peer ID is actively connected in WebRTC map
  const hasActivePeer = useCallback(
    (peerUserId: string): boolean => {
      return peerConnectionsRef.current.has(peerUserId);
    },
    [peerConnectionsRef]
  );

  // Sync peer connections when activeUsers changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const activeUsers = usePTTStore((state) => state.activeUsers) || [];
  const isConnected = usePTTStore((state) => state.isConnected);
  const isPowerOn = usePTTStore((state) => state.isPowerOn);
  const userId = usePTTStore((state) => state.userId);
  const channelNumber = usePTTStore((state) => state.channelNumber);

  const noiseMode = usePTTStore((state) => state.noiseMode);

  const updateAudioNodesParams = useCallback(
    (mode: 'normal' | 'ojol' | 'wind' | 'crowd' | 'emergency') => {
      const nodes = audioNodesRef.current;
      if (!nodes.hpf && !nodes.agc && !nodes.bandpass) return;

      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (mode === 'normal') {
        if (nodes.hpf) {
          nodes.hpf.type = 'highpass';
          nodes.hpf.frequency.setValueAtTime(80, now);
        }
        if (nodes.bandpass) {
          nodes.bandpass.type = 'allpass';
        }
        if (nodes.agc) {
          nodes.agc.threshold.setValueAtTime(-20, now);
          nodes.agc.ratio.setValueAtTime(4, now);
          nodes.agc.attack.setValueAtTime(0.01, now);
          nodes.agc.release.setValueAtTime(0.25, now);
        }
      } else if (mode === 'ojol') {
        if (nodes.hpf) {
          nodes.hpf.type = 'highpass';
          nodes.hpf.frequency.setValueAtTime(200, now);
        }
        if (nodes.bandpass) {
          nodes.bandpass.type = 'allpass';
        }
        if (nodes.agc) {
          nodes.agc.threshold.setValueAtTime(-35, now);
          nodes.agc.ratio.setValueAtTime(12, now);
          nodes.agc.attack.setValueAtTime(0.005, now);
          nodes.agc.release.setValueAtTime(0.15, now);
        }
      } else if (mode === 'wind') {
        if (nodes.hpf) {
          nodes.hpf.type = 'highpass';
          nodes.hpf.frequency.setValueAtTime(150, now);
        }
        if (nodes.bandpass) {
          nodes.bandpass.type = 'allpass';
        }
        if (nodes.agc) {
          nodes.agc.threshold.setValueAtTime(-30, now);
          nodes.agc.ratio.setValueAtTime(8, now);
          nodes.agc.attack.setValueAtTime(0.002, now);
          nodes.agc.release.setValueAtTime(0.05, now);
        }
      } else if (mode === 'crowd') {
        if (nodes.hpf) {
          nodes.hpf.type = 'highpass';
          nodes.hpf.frequency.setValueAtTime(150, now);
        }
        if (nodes.bandpass) {
          nodes.bandpass.type = 'bandpass';
          nodes.bandpass.frequency.setValueAtTime(1200, now);
          nodes.bandpass.Q.setValueAtTime(1.0, now);
        }
        if (nodes.agc) {
          nodes.agc.threshold.setValueAtTime(-25, now);
          nodes.agc.ratio.setValueAtTime(6, now);
          nodes.agc.attack.setValueAtTime(0.01, now);
          nodes.agc.release.setValueAtTime(0.2, now);
        }
      } else if (mode === 'emergency') {
        if (nodes.hpf) {
          nodes.hpf.type = 'highpass';
          nodes.hpf.frequency.setValueAtTime(400, now);
        }
        if (nodes.bandpass) {
          nodes.bandpass.type = 'bandpass';
          nodes.bandpass.frequency.setValueAtTime(1500, now);
          nodes.bandpass.Q.setValueAtTime(2.0, now);
        }
        if (nodes.agc) {
          nodes.agc.threshold.setValueAtTime(-45, now);
          nodes.agc.ratio.setValueAtTime(20, now);
          nodes.agc.attack.setValueAtTime(0.001, now);
          nodes.agc.release.setValueAtTime(0.1, now);
        }
      }
    },
    [getAudioContext]
  );

  useEffect(() => {
    updateAudioNodesParams(noiseMode);
  }, [noiseMode, updateAudioNodesParams]);

  // WebRTC Stats Monitoring for Codec2 Fallback
  useEffect(() => {
    if (!isConnected) {
      usePTTStore.getState().updateSettings({ codecFallbackActive: false });
      return;
    }

    const interval = setInterval(async () => {
      const pcs = peerConnectionsRef.current;
      if (pcs.size === 0) {
        usePTTStore.getState().updateSettings({ codecFallbackActive: false });
        return;
      }

      let maxPacketLoss = 0;
      let maxLatency = 0;

      for (const pc of pcs.values()) {
        try {
          const stats = await pc.getStats();
          stats.forEach((report) => {
            if (report.type === 'inbound-rtp' && report.kind === 'audio') {
              const packetsLost = report.packetsLost || 0;
              const packetsReceived = report.packetsReceived || 0;
              if (packetsReceived > 0) {
                const loss = (packetsLost / (packetsReceived + packetsLost)) * 100;
                if (loss > maxPacketLoss) {
                  maxPacketLoss = loss;
                }
              }
            }
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              const rtt = (report.currentRoundTripTime || 0) * 1000;
              if (rtt > maxLatency) {
                maxLatency = rtt;
              }
            }
          });
        } catch (err) {
          console.warn('Failed to fetch WebRTC stats:', err);
        }
      }

      const shouldFallback = maxPacketLoss > 40 || maxLatency > 600;
      const currentFallback = usePTTStore.getState().codecFallbackActive;
      if (shouldFallback !== currentFallback) {
        usePTTStore.getState().updateSettings({ codecFallbackActive: shouldFallback });
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isConnected, peerConnectionsRef]);

  useEffect(() => {
    if (!isPowerOn || !isConnected || BRAND.isolatedChannels.includes(channelNumber)) {
      cleanupAllPeers();
      return;
    }

    const activeUserIds = new Set(activeUsers.map((u) => u.userId));

    // Clean up disconnected users
    for (const peerId of peerConnectionsRef.current.keys()) {
      if (!activeUserIds.has(peerId)) {
        cleanupPeer(peerId);
      }
    }

    // Connect to new users
    activeUsers.forEach((user) => {
      if (user.userId === userId) return;

      if (!peerConnectionsRef.current.has(user.userId)) {
        // Strict role definition based on UUID sorting to prevent duplicate offers
        if (userId < user.userId) {
          const pc = createPeerConnection(user.userId);
          pc.createOffer()
            .then(async (offer) => {
              let sdp = offer.sdp;
              const store = usePTTStore.getState();
              if (store.audioMode === 'music' && sdp) {
                // Priority high quality stereo sdp manipulation
                sdp = sdp.replace(
                  /a=fmtp:(\d+) (.*)useinbandfec=1/g,
                  'a=fmtp:$1 $2useinbandfec=1;stereo=1;sprop-stereo=1;maxaveragebitrate=128000'
                );
              }
              const modifiedOffer = { type: offer.type, sdp } as RTCSessionDescriptionInit;
              await pc.setLocalDescription(modifiedOffer);
              store.broadcastWebRTCSignaling({
                senderUserId: userId,
                targetUserId: user.userId,
                type: 'offer',
                data: modifiedOffer,
              });
            })
            .catch((err) => {
              console.warn(`Failed to initiate offer to ${user.userId}:`, err);
            });
        }
      }
    });
  }, [
    activeUsers,
    isConnected,
    isPowerOn,
    userId,
    channelNumber,
    createPeerConnection,
    cleanupPeer,
    cleanupAllPeers,
    peerConnectionsRef,
  ]);

  // Listen to WebRTC signaling events from Supabase Realtime channel
  const setOnWebRTCSignalingReceived = usePTTStore((state) => state.setOnWebRTCSignalingReceived);
  useEffect(() => {
    setOnWebRTCSignalingReceived(handleSignaling as (payload: WebRTCSignalingPayload) => void);
    return () => {
      setOnWebRTCSignalingReceived(null);
    };
  }, [setOnWebRTCSignalingReceived, handleSignaling]);

  // Update programmatic Audio volume when pttVolume changes
  const pttVolume = usePTTStore((state) => state.pttVolume);
  useEffect(() => {
    const vol = pttVolume / 100;
    audioElementsRef.current.forEach((audio) => {
      audio.volume = vol;
    });
  }, [pttVolume, audioElementsRef]);

  // Stop recording and release microphone
  const stopRecording = useCallback(
    (onFlushed?: () => void) => {
      isRecordingRef.current = false;
      stopVAD();

      const finishCleanup = () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        mediaRecorderRef.current = null;

        // Disconnect and release Audio Nodes for Garbage Collection
        const nodes = audioNodesRef.current;
        if (nodes.source) {
          nodes.source.disconnect();
          nodes.source = null;
        }
        if (nodes.delay) {
          nodes.delay.disconnect();
          nodes.delay = null;
        }
        if (nodes.feedback) {
          nodes.feedback.disconnect();
          nodes.feedback = null;
        }
        if (nodes.dest) {
          nodes.dest.disconnect();
          nodes.dest = null;
        }

        // Fast PTT: Swap back to silent track
        const store = usePTTStore.getState();
        if (store.isConnected) {
          const silent = getSilentTrack();
          if (silent.track) {
            for (const pc of peerConnectionsRef.current.values()) {
              const senders = pc.getSenders();
              const sender = senders.find((s) => s.track?.kind === 'audio');
              if (sender) {
                sender.replaceTrack(silent.track).catch((err) => {
                  console.warn('Failed to swap back to silent track:', err);
                });
              }
            }
          }
        }

        if (onFlushed) {
          onFlushed();
        }
      };

      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = () => {
          finishCleanup();
        };
        try {
          recorder.stop();
        } catch {
          finishCleanup();
        }
      } else {
        finishCleanup();
      }

      if (currentCleanupRef.current) {
        currentCleanupRef.current = null;
      }
    },
    [getSilentTrack, stopVAD, peerConnectionsRef, streamRef]
  );

  // Start recording microphone
  const startRecording = useCallback(
    async (onChunkAvailable: (base64Chunk: string) => void) => {
      if (isRecordingRef.current) return;
      isRecordingRef.current = true;

      try {
        const store = usePTTStore.getState();
        const isMusicMode = store.audioMode === 'music';

        // Dynamic mic constraints: disable voice filtering for high-fidelity singing/instruments in Music Mode
        const audioConstraints = isMusicMode
          ? {
              echoCancellation: false, // best with headphones for karaoke to avoid music ducking
              noiseSuppression: false, // critical: do not suppress music notes
              autoGainControl: false, // do not compress vocal dynamics
              channelCount: 2, // support stereo input
            }
          : {
              echoCancellation: store.builtInEcho,
              noiseSuppression: true,
              autoGainControl: true,
            };

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
        });

        if (!isRecordingRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        // Fast PTT: Swap to real mic track (with software Echo if active)
        const micTrack = stream.getAudioTracks()[0];
        let finalTrack = micTrack;

        const ctx = getAudioContext();
        if (ctx) {
          const sourceNode = ctx.createMediaStreamSource(stream);
          const destNode = ctx.createMediaStreamDestination();

          if (isMusicMode) {
            if (store.builtInEcho) {
              // 1. Direct path (clean vocal)
              sourceNode.connect(destNode);

              // 2. Echo/Delay path (Feedback loop)
              const delayNode = ctx.createDelay(1.0);
              delayNode.delayTime.value = 0.25; // 250ms delay time
              const feedbackNode = ctx.createGain();
              feedbackNode.gain.value = store.echoFeedback / 100; // dynamic feedback volume from store

              sourceNode.connect(delayNode);
              delayNode.connect(feedbackNode);
              feedbackNode.connect(delayNode); // loop feedback
              feedbackNode.connect(destNode); // mix echo output into destination

              // Track for cleanup
              audioNodesRef.current = {
                source: sourceNode,
                delay: delayNode,
                feedback: feedbackNode,
                hpf: null,
                bandpass: null,
                agc: null,
                dest: destNode,
              };
            } else {
              sourceNode.connect(destNode);
              audioNodesRef.current = {
                source: sourceNode,
                delay: null,
                feedback: null,
                hpf: null,
                bandpass: null,
                agc: null,
                dest: destNode,
              };
            }
          } else {
            // Non-music mode: HPF -> Bandpass -> AGC -> dest
            const hpfNode = ctx.createBiquadFilter();
            const bandpassNode = ctx.createBiquadFilter();
            const agcNode = ctx.createDynamicsCompressor();

            sourceNode.connect(hpfNode);
            hpfNode.connect(bandpassNode);
            bandpassNode.connect(agcNode);
            agcNode.connect(destNode);

            audioNodesRef.current = {
              source: sourceNode,
              delay: null,
              feedback: null,
              hpf: hpfNode,
              bandpass: bandpassNode,
              agc: agcNode,
              dest: destNode,
            };

            updateAudioNodesParams(store.noiseMode);
          }

          finalTrack = destNode.stream.getAudioTracks()[0];
        }

        if (store.isConnected) {
          for (const pc of peerConnectionsRef.current.values()) {
            const senders = pc.getSenders();
            const sender = senders.find((s) => s.track?.kind === 'audio');
            if (sender) {
              await sender.replaceTrack(finalTrack);
            }
          }
        }
        startVAD(stream, micTrack);

        // Robust MediaRecorder initialization with proper Codec Selection & Timeslicing
        const getSupportedMimeType = () => {
          const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4;codecs=mp4a.40.2', // Fallback for Safari
            'audio/mp4',
            '', // Native browser fallback
          ];
          for (const t of types) {
            if (t === '' || MediaRecorder.isTypeSupported(t)) return t;
          }
          return '';
        };

        const initRobustRecorder = () => {
          if (!isRecordingRef.current || !streamRef.current) return;

          try {
            const mimeType = getSupportedMimeType();
            const isMusicMode = usePTTStore.getState().audioMode === 'music';
            const audioBitsPerSecond = isMusicMode ? 128000 : 24000;
            const options = mimeType ? { mimeType, audioBitsPerSecond } : undefined;
            const recorder = new MediaRecorder(streamRef.current, options);
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = async (event) => {
              if (event.data && event.data.size > 0) {
                try {
                  const arrayBuffer = await event.data.arrayBuffer();
                  const base64 = arrayBufferToBase64(arrayBuffer);
                  onChunkAvailable(base64);
                } catch (err) {
                  console.error('Error processing audio chunk:', err);
                }
              }
            };

            // Start with a 500ms timeslice.
            // The recorder will automatically fire ondataavailable every 500ms natively
            // WITHOUT needing to be destroyed and recreated, saving massive mobile CPU.
            recorder.start(500);
          } catch (err) {
            console.error('Failed to create robust MediaRecorder:', err);
          }
        };

        const cleanup = () => {
          const recorder = mediaRecorderRef.current;
          if (recorder && recorder.state !== 'inactive') {
            try {
              recorder.stop();
            } catch {
              // Ignore concurrent stop errors
            }
          }
        };

        currentCleanupRef.current = cleanup;
        initRobustRecorder();
      } catch (err) {
        console.error('Failed to access microphone:', err);
        isRecordingRef.current = false;
        stopRecording();
        throw err;
      }
    },
    [
      stopRecording,
      startVAD,
      getAudioContext,
      peerConnectionsRef,
      streamRef,
      updateAudioNodesParams,
    ]
  );

  const playAudioChunk = useCallback(
    (base64Chunk: string) => {
      return playAudioChunkBase64(base64Chunk, hasActivePeer);
    },
    [playAudioChunkBase64, hasActivePeer]
  );

  return {
    startRecording,
    stopRecording,
    playAudioChunk,
    flushAudioQueue,
  };
}
