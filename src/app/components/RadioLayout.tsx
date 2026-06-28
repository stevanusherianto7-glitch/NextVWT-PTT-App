import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { usePTTStore } from '../store/usePTTStore';
import { STATIC_CHANNELS } from '../utils/constants';
import { useAudioStreamer } from '../hooks/useAudioStreamer';
import { toast } from 'sonner';
import { KaraokePlayerSkeleton } from './SkeletonLoaders';
import { ChannelListModal } from './ChannelListModal';
import { initGlobalAudioContext } from '../utils/audioContext';
import { useChannelRole } from '../../features/moderation/useChannelRole';
import { useChannelSettings } from '../../features/moderation/useChannelSettings';
import { canUsePTT } from '../../features/moderation/permissions';
import { getSupabase } from '../utils/supabase';

// Sub-components
import { RadioHeader, RadioLCD } from './radio/RadioHeader';
import { RadioBody } from './radio/RadioBody';
import { RadioFooter, RadioQuickDock } from './radio/RadioFooter';
import { RadioPanels } from './radio/RadioPanels';

const playChirpSound = (isJoin: boolean) => {
  try {
    const ctx = initGlobalAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (isJoin) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(750, now);
      osc.frequency.exponentialRampToValueAtTime(1250, now + 0.12);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.start(now);
      osc.stop(now + 0.15);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(950, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.15);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.start(now);
      osc.stop(now + 0.2);
    }
  } catch (err) {
    console.warn('Failed to play chirp sound:', err);
  }
};

const lazyRetry = <Props extends object>(
  importFn: () => Promise<{ default: React.ComponentType<Props> }>
) => {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      console.error('Dynamic chunk loading failed, triggering page reload:', error);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
      throw error;
    }
  }) as React.LazyExoticComponent<React.ComponentType<Props>>;
};

const FloatingKaraokePlayer = lazyRetry<
  import('./FloatingKaraokePlayer').FloatingKaraokePlayerProps
>(async () => {
  const m = await import('./FloatingKaraokePlayer');
  return {
    default: m.FloatingKaraokePlayer as React.ComponentType<
      import('./FloatingKaraokePlayer').FloatingKaraokePlayerProps
    >,
  };
});

export function RadioLayout() {
  const {
    isPowerOn,
    isTransmitting,
    isScanning,
    setProgress,
    channelUp,
    setChannelNumber,
    activeUsers,
    activeTransmitter,
    themeText,
    audioMode,
    fullDuplex,
    isKaraokePlayerOpen,
    setKaraokePlayerOpen: setIsKaraokePlayerOpen,
    userId,
    channelNumber: channel,
    infoText,
    locationText,
    setTransmitting: setIsTransmitting,
    setPower: setIsPowerOn,
  } = usePTTStore();

  const activeChannelObj = STATIC_CHANNELS.find((ch) => ch.number === channel);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChannelListOpen, setIsChannelListOpen] = useState(false);
  const [isUserListOpen, setIsUserListOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isRoipOpen, setIsRoipOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isPrivateOpen, setIsPrivateOpen] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<
    Array<{ id: string; category?: string; reaction: string; x: number; senderName?: string }>
  >([]);
  const txStartTimeRef = useRef<number>(0);
  const [waitTimer, setWaitTimer] = useState<number | null>(null);
  const [simulatedUsers, setSimulatedUsers] = useState<any[]>([]);

  const { startRecording, stopRecording, playAudioChunk, flushAudioQueue } = useAudioStreamer();

  const roomId = `ptt-room-${channel}`;
  const { role, status } = useChannelRole(roomId, userId);
  const { settings: channelSettings } = useChannelSettings(roomId, activeChannelObj?.name);

  // Enforce PTT permission constraints
  const pttAllowed = canUsePTT({
    role,
    status,
    allowGuestPTT: channelSettings?.allow_guest_ptt ?? true,
  });
  const echoChunksRef = useRef<string[]>([]);

  const isReceiving =
    activeTransmitter &&
    (activeTransmitter.userId !== usePTTStore.getState().userId ||
      activeTransmitter.callSign !== usePTTStore.getState().callSign);
  const isFullDuplexActive = fullDuplex || audioMode === 'music';
  const isBusy = !isFullDuplexActive && !!isReceiving;

  const isPebeOrPebri = (u: any) => {
    if (typeof u === 'string') {
      return u.toLowerCase() === 'pebe herianto' || u.toLowerCase() === 'pebri haryanto';
    }
    const name = u?.displayName || u?.userId || '';
    return name.toLowerCase() === 'pebe herianto' || name.toLowerCase() === 'pebri haryanto';
  };

  const safeActiveUsers = activeUsers || [];
  const dynamicUserList = [
    ...safeActiveUsers,
    ...(activeChannelObj?.users || []),
    ...simulatedUsers,
  ].filter((u) => !isPebeOrPebri(u));
  const dynamicUserCount = dynamicUserList.length;

  const getThemeClass = (theme: string) => {
    const t = theme?.toLowerCase() || '';
    if (t === 'theme-classic' || t.includes('classic')) return 'theme-classic';
    if (t === 'theme-v1' || t.includes('v1')) return 'theme-v1';
    if (t === 'theme-v2' || t.includes('v2')) return 'theme-v2';
    if (t === 'theme-v3' || t.includes('v3')) return 'theme-v3';
    if (t === 'theme-v4' || t.includes('v4')) return 'theme-v4';
    if (t === 'theme-v5' || t.includes('v5')) return 'theme-v5';
    if (t === 'theme-v6' || t.includes('v6')) return 'theme-v6';
    if (t === 'theme-monokrom' || t.includes('monokrom') || t === 'mono') return 'theme-monokrom';
    return 'theme-classic';
  };

  // Reset progress when not transmitting and not receiving
  useEffect(() => {
    if (status === 'wait') {
      if (waitTimer === null) setWaitTimer(30);
    } else {
      setWaitTimer(null);
    }
  }, [status, waitTimer]); // Only trigger if status becomes wait

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (waitTimer !== null && waitTimer > 0) {
      interval = setInterval(() => {
        setWaitTimer((prev) => (prev ? prev - 1 : 0));
      }, 1000);
    } else if (waitTimer === 0) {
      localStorage.setItem(`channel-status:${roomId}:${userId}`, 'active');
      window.dispatchEvent(new Event('channel-role-changed'));
      setWaitTimer(null);
    }
    return () => clearInterval(interval);
  }, [waitTimer, roomId, userId]);

  const prevUserIdsRef = useRef<string[]>([]);
  const isFirstRender = useRef(true);

  // Reset first render flag on channel change to avoid notification flood
  useEffect(() => {
    isFirstRender.current = true;
  }, [channel]);

  // Monitor dynamicUserList changes for Join/Leave chirp sounds
  useEffect(() => {
    if (!isPowerOn) return;

    const currentIds = dynamicUserList.map((u) => (typeof u === 'string' ? u : u.userId));

    if (isFirstRender.current) {
      prevUserIdsRef.current = currentIds;
      isFirstRender.current = false;
      return;
    }

    const prevUserIds = prevUserIdsRef.current;
    const joinedIds = currentIds.filter((id) => !prevUserIds.includes(id));
    const leftIds = prevUserIds.filter((id) => !currentIds.includes(id));

    if (joinedIds.length > 0) {
      playChirpSound(true);
    } else if (leftIds.length > 0) {
      playChirpSound(false);
    }

    prevUserIdsRef.current = currentIds;
  }, [dynamicUserList, isPowerOn]);

  // Automatic background user activity simulation (Disabled)
  useEffect(() => {
    setSimulatedUsers([]);
  }, [isPowerOn]);

  // Pseudo-realtime modulation bar simulation when transmitting or receiving
  useEffect(() => {
    if (!isPowerOn) {
      setProgress(0);
      return;
    }

    const isReceiving =
      activeTransmitter && activeTransmitter.userId !== usePTTStore.getState().userId;

    if (isTransmitting || isReceiving) {
      const interval = setInterval(() => {
        const time = Date.now() / 1000;
        // Speech envelope: simulate human phrases (loud peaks & pauses)
        const speechEnvelope = Math.max(
          0.1,
          Math.sin(time * 1.6) * 0.45 + Math.sin(time * 0.55) * 0.55 + 0.25
        );
        // Rapid vocal cord vibrations
        const voiceRipple = Math.sin(time * 24) * 12 + Math.sin(time * 48) * 8;
        // Random white noise
        const randomNoise = Math.random() * 14 - 7;

        let simulatedProgress = speechEnvelope * 82 + voiceRipple + randomNoise;
        // Clamp to full 0 - 100 range
        simulatedProgress = Math.max(0, Math.min(100, simulatedProgress));
        setProgress(simulatedProgress);
      }, 80); // Faster refresh rate for dynamic analog feeling

      return () => {
        clearInterval(interval);
        setProgress(0);
      };
    } else {
      setProgress(0);
    }
  }, [isPowerOn, isTransmitting, activeTransmitter, setProgress]);

  // Manage audio recording when transmitting
  useEffect(() => {
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
          // Local loopback offline fallback
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
      stopRecording();

      // Playback recorded chunks on Channel 100 after PTT released (Parrot Echo Test)
      const currentChannel = usePTTStore.getState().channelNumber;
      if (currentChannel === 100) {
        setTimeout(async () => {
          if (echoChunksRef.current.length > 0) {
            try {
              const chunksToPlay = [...echoChunksRef.current];
              echoChunksRef.current = [];

              // Play each chunk sequentially via the Web Audio scheduling timeline
              for (const chunk of chunksToPlay) {
                await playAudioChunk(chunk);
              }
            } catch (err) {
              console.error('Failed to play back parrot echo chunks:', err);
            }
          }
        }, 500); // Wait long enough for MediaRecorder.stop() to flush the final async chunk
      }

      // Logic untuk memicu FeedbackModal jika pengguna baru selesai transmit
      if (txStartTimeRef.current > 0) {
        const txDuration = Date.now() - txStartTimeRef.current;
        const lastFeedback = usePTTStore.getState().lastFeedbackTime;
        const timeSinceLastFeedback = Date.now() - lastFeedback;
        const ONE_DAY = 24 * 60 * 60 * 1000;

        // Tampilkan modal jika durasi transmisi > 3 detik dan sudah lewat 1 hari sejak prompt terakhir
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

  const resetWatchdogRef = useRef<(() => void) | null>(null);

  // Watchdog timer to automatically clear stale/silent transmitter
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

  const setOnVoiceChunkReceived = usePTTStore((state) => state.setOnVoiceChunkReceived);

  // Manage incoming audio chunks from other users
  useEffect(() => {
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
  }, [isPowerOn, channel, status, setOnVoiceChunkReceived, playAudioChunk]);

  // Stop recording and flush queue on power off
  useEffect(() => {
    if (!isPowerOn) {
      stopRecording();
      flushAudioQueue();
    }
  }, [isPowerOn, stopRecording, flushAudioQueue]);

  // Scanning effect
  useEffect(() => {
    if (isScanning) {
      const interval = setInterval(() => {
        channelUp();
      }, 1500); // 1.5s delay to listen to channels and avoid connection flooding
      return () => clearInterval(interval);
    }
  }, [isScanning, channelUp]);

  // Auto-close settings, user list, and karaoke player if power is turned off
  useEffect(() => {
    if (!isPowerOn) {
      setIsSettingsOpen(false);
      setIsChannelListOpen(false);
      setIsUserListOpen(false);
      setIsKaraokePlayerOpen(false);
      setIsManageOpen(false);
      setIsWalletOpen(false);
      setIsRoipOpen(false);
      setIsChatOpen(false);
      setIsQueueOpen(false);
      setIsPrivateOpen(false);
    }
  }, [isPowerOn, setIsKaraokePlayerOpen]);

  // Enforce role status updates while transmitting (offline/realtime guard)
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

  // Listen for realtime kick / ban broadcasts
  useEffect(() => {
    if (!roomId || !userId || !isPowerOn) return;

    let mounted = true;
    let channelInstance: import('@supabase/supabase-js').RealtimeChannel | null = null;

    (async () => {
      try {
        const supabaseInstance = await getSupabase();
        if (!mounted) return;

        channelInstance = supabaseInstance.channel(`room:${roomId}:moderation`);
        channelInstance
          .on(
            'broadcast',
            { event: 'kick' },
            (payload: { payload?: { targetUserId?: string } }) => {
              const { targetUserId } = payload.payload || {};
              if (targetUserId === userId) {
                toast.error('Anda telah dikeluarkan (kick/ban) dari channel ini oleh moderator.');
                setIsPowerOn(false);
                setIsManageOpen(false);
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.error('Realtime kick listener setup failed:', err);
      }
    })();

    return () => {
      mounted = false;
      if (channelInstance) {
        getSupabase().then((sub) => {
          if (channelInstance) sub.removeChannel(channelInstance);
        });
      }
    };
  }, [roomId, userId, isPowerOn, setIsPowerOn]);

  // Enforce ban list check on channel change / boot
  useEffect(() => {
    if (!roomId || !userId || !isPowerOn) return;

    let mounted = true;

    async function checkBan() {
      try {
        const supabaseInstance = await getSupabase();
        if (!mounted) return;

        const { data, error } = await supabaseInstance
          .from('channel_bans')
          .select('id')
          .eq('room_id', roomId)
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.error('Error checking ban list:', error);
          return;
        }

        if (!mounted) return;

        if (data) {
          toast.error('Anda tidak dapat memasuki channel ini karena Anda telah diblokir (banned).');
          setIsPowerOn(false);
        }
      } catch (err) {
        console.error('Ban check failed:', err);
      }
    }

    checkBan();

    return () => {
      mounted = false;
    };
  }, [roomId, userId, isPowerOn, setIsPowerOn]);

  const setOnReactionReceived = usePTTStore((state) => state.setOnReactionReceived);

  // Reaction receiver hook
  useEffect(() => {
    setOnReactionReceived((payload) => {
      if (isPowerOn) {
        // Prevent playing/showing our own reactions twice (since Supabase loopback self: true echoes it back)
        const state = usePTTStore.getState();
        const isSelf =
          payload.senderId === state.userId &&
          (!payload.senderCallSign || payload.senderCallSign === state.callSign);
        if (isSelf) return;

        const id = payload.id || Math.random().toString();
        const x = 30 + Math.random() * 40;
        const senderName = payload.senderName || 'User';
        setFloatingReactions((prev) => [
          ...prev,
          { id, category: payload.category, reaction: payload.reaction, x, senderName },
        ]);
        const isVideo = payload.reaction === 'lion' || payload.reaction === 'aquarium';
        const isKetawa = payload.reaction === 'ketawa_nular' || payload.reaction === 'ketawa_anjay';
        setTimeout(
          () => {
            setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
          },
          isVideo ? 60000 : isKetawa ? 12000 : 5000
        );
      }
    });
    return () => {
      setOnReactionReceived(null);
    };
  }, [isPowerOn, setOnReactionReceived]);

  const broadcastReaction = usePTTStore((state) => state.broadcastReaction);

  const handleSendReaction = (category: 'animation' | 'sound' | 'gift', reactionType: string) => {
    if (!isPowerOn) return;

    // Resolve local user's display name
    const localDisplayName = infoText || 'Saya';

    // Trigger local animation instantly (optimistic)
    const localId = Math.random().toString();
    const x = 30 + Math.random() * 40;
    setFloatingReactions((prev) => [
      ...prev,
      { id: localId, category, reaction: reactionType, x, senderName: localDisplayName },
    ]);
    const isVideo = reactionType === 'lion' || reactionType === 'aquarium';
    const isKetawa = reactionType === 'ketawa_nular' || reactionType === 'ketawa_anjay';
    setTimeout(
      () => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== localId));
      },
      isVideo ? 60000 : isKetawa ? 12000 : 5000
    );

    // Broadcast to other peers on the channel
    broadcastReaction(category, reactionType);
  };

  // Online/Offline network event listener for auto-reconnection and state resync
  useEffect(() => {
    const handleOnline = () => {
      toast.success('Koneksi internet terhubung kembali. Menghubungkan radio...');
      const store = usePTTStore.getState();
      store.setConnected(true);
      if (store.isPowerOn) {
        store.subscribeToChannel(store.channelNumber);
      }
    };

    const handleOffline = () => {
      toast.error('Koneksi internet terputus. Radio offline.');
      const store = usePTTStore.getState();
      store.setConnected(false);
      usePTTStore.setState({
        activeUsers: [],
        activeTransmitter: null,
        progress: 0,
        isTransmitting: false,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // AI Operator automated responder (Channel 99)
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
          // Speak in phrases: simulate natural cadence
          const speechEnvelope = Math.max(
            0.15,
            Math.sin(elapsed * 2.0) * 0.5 + Math.sin(elapsed * 0.7) * 0.5 + 0.3
          );
          const voiceRipple = Math.sin(elapsed * 30) * 10 + Math.sin(elapsed * 60) * 6;
          const randomNoise = Math.random() * 12 - 6;

          let simulatedProgress = speechEnvelope * 80 + voiceRipple + randomNoise;
          simulatedProgress = Math.max(0, Math.min(100, simulatedProgress));
          setProgress(simulatedProgress);
        }, 80);

        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(randomText);
          utterance.lang = 'id-ID';
          utterance.rate = 0.95;
          utterance.pitch = 1.0;

          utterance.onend = () => {
            clearInterval(progInterval);
            setProgress(0);
            usePTTStore.setState({ activeTransmitter: null });
            playChirpSound(false);
          };

          utterance.onerror = () => {
            clearInterval(progInterval);
            setProgress(0);
            usePTTStore.setState({ activeTransmitter: null });
            playChirpSound(false);
          };

          window.speechSynthesis.speak(utterance);
        } else {
          setTimeout(() => {
            clearInterval(progInterval);
            setProgress(0);
            usePTTStore.setState({ activeTransmitter: null });
            playChirpSound(false);
          }, 4000);
        }
      }, 1200);

      return () => clearTimeout(aiResponseTimer);
    }
  }, [isTransmitting, channel, isPowerOn, setProgress]);

  const handleSet = () => {
    if (isPowerOn) {
      setIsSettingsOpen(true);
    }
  };

  const displayUser = infoText ? infoText.toUpperCase() : 'USER';
  const displayLoc = locationText ? locationText.toUpperCase() : 'BANDUNG, JABAR';
  const channelNameStr = activeChannelObj ? activeChannelObj.name.toUpperCase() : 'STANDBY CHANNEL';
  const programName = channelSettings?.channel_description;
  const marqueeText = programName
    ? `PROGRAM SAAT INI: ${programName.toUpperCase()} • CHANNEL ${channel} • ${channelNameStr} • ${displayUser} (${displayLoc}) • STANDBY • READY`
    : `CHANNEL ${channel} • ${channelNameStr} • ${displayUser} (${displayLoc}) • STANDBY • READY`;

  const isPanelOpen =
    isManageOpen ||
    isWalletOpen ||
    isRoipOpen ||
    isChatOpen ||
    isQueueOpen ||
    isPrivateOpen ||
    isSettingsOpen;

  return (
    <div
      onClick={() => {
        if (isPowerOn && isUserListOpen) {
          setIsUserListOpen(false);
        }
      }}
      className={`w-full h-dvh sm:w-[360px] sm:h-[800px] bg-white sm:rounded-[40px] overflow-hidden relative sm:shadow-[0_20px_50px_rgba(0,0,0,0.5)] sm:border-[8px] sm:border-[#2a2d36] flex-shrink-0 flex flex-col ${getThemeClass(themeText)}`}
      style={{
        boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.1)',
      }}
    >
      {isPanelOpen ? (
        <RadioPanels
          roomId={roomId}
          userId={userId}
          channelName={activeChannelObj?.name}
          isManageOpen={isManageOpen}
          setIsManageOpen={setIsManageOpen}
          isWalletOpen={isWalletOpen}
          setIsWalletOpen={setIsWalletOpen}
          isRoipOpen={isRoipOpen}
          setIsRoipOpen={setIsRoipOpen}
          isChatOpen={isChatOpen}
          setIsChatOpen={setIsChatOpen}
          isQueueOpen={isQueueOpen}
          setIsQueueOpen={setIsQueueOpen}
          isPrivateOpen={isPrivateOpen}
          setIsPrivateOpen={setIsPrivateOpen}
          isSettingsOpen={isSettingsOpen}
          setIsSettingsOpen={setIsSettingsOpen}
          isChannelListOpen={isChannelListOpen}
          setIsChannelListOpen={setIsChannelListOpen}
        />
      ) : (
        <div
          className="size-full flex flex-col items-center overflow-hidden relative transition-all duration-300"
          style={{
            background: 'var(--device-bg)',
            boxShadow: 'var(--device-shadow)',
            border: 'var(--device-border)',
          }}
        >
          {/* Header Section */}
          <RadioHeader
            isUserListOpen={isUserListOpen}
            setIsUserListOpen={setIsUserListOpen}
            marqueeText={marqueeText}
          />

          {/* Body Section */}
          <RadioBody
            isUserListOpen={isUserListOpen}
            setIsUserListOpen={setIsUserListOpen}
            floatingReactions={floatingReactions}
            waitTimer={waitTimer}
            isBusy={isBusy}
            status={status}
            dynamicUserList={dynamicUserList}
            channelNameStr={channelNameStr}
            onPressStart={() => {
              if (!pttAllowed) {
                toast.error(
                  status === 'muted'
                    ? 'Anda sedang dibungkam (muted) di channel ini.'
                    : status === 'ptt_blocked'
                      ? 'Hak PTT Anda diblokir di channel ini.'
                      : 'Tamu biasa dilarang menggunakan PTT di channel ini.'
                );
                return;
              }
              setIsTransmitting(true);
            }}
            onPressEnd={() => setIsTransmitting(false)}
            lcd={
              <RadioLCD
                userCount={dynamicUserCount}
                onUserCountClick={() => setIsUserListOpen(true)}
              />
            }
            footer={<RadioFooter onScan={() => setIsChannelListOpen(true)} onSet={handleSet} />}
            quickDock={
              <RadioQuickDock
                isUserListOpen={isUserListOpen}
                onOpenChat={() => setIsChatOpen(true)}
                onOpenQueue={() => setIsQueueOpen(true)}
                onSendReaction={handleSendReaction}
                getThemeClass={getThemeClass}
              />
            }
            karaokePlayer={
              isPowerOn && audioMode === 'music' && isKaraokePlayerOpen ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <Suspense fallback={<KaraokePlayerSkeleton />}>
                    <FloatingKaraokePlayer onClose={() => setIsKaraokePlayerOpen(false)} />
                  </Suspense>
                </div>
              ) : null
            }
          />
        </div>
      )}

      {/* Channel List Modal Dialog (Overlay when not main panel) */}
      {!isPanelOpen && isChannelListOpen && (
        <ChannelListModal
          onClose={() => setIsChannelListOpen(false)}
          onSelectChannel={(num: number) => setChannelNumber(num)}
        />
      )}

      {/* Preloaded Sound Reaction Players */}
      <audio id="audio-player-ketawa-nular" src="/sounds/ketawa_nular.mp3" preload="auto" />
      <audio id="audio-player-ketawa-anjay" src="/sounds/ketawa_anjay.mp3" preload="auto" />
    </div>
  );
}
