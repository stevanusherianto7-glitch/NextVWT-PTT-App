import { useEffect, useState, useRef } from 'react';
import { usePTTStore } from '../store/usePTTStore';
import { STATIC_CHANNELS } from '../utils/constants';
import { useAudioStreamer } from './useAudioStreamer';
import { base64ToArrayBuffer, arrayBufferToBase64 } from './useAudioPlayback';
import { toast } from 'sonner';
import { useReactionSounds } from './useReactionSounds';
import { initGlobalAudioContext } from '../utils/audioContext';
import { useChannelRole } from '../../features/moderation/useChannelRole';
import { useChannelSettings } from '../../features/moderation/useChannelSettings';
import { canUsePTT } from '../../features/moderation/permissions';
import { getSupabase } from '../utils/supabase';
import { UserListModalProps } from '../components/UserListModal';

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

export function useRadioOrchestrator() {
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
  const [simulatedUsers, setSimulatedUsers] = useState<UserListModalProps['users']>([]);

  const { startRecording, stopRecording, playAudioChunk, flushAudioQueue } = useAudioStreamer();
  const { playReactionSound } = useReactionSounds();

  const roomId = `ptt-room-${channel}`;
  const { role, status } = useChannelRole(roomId, userId);
  const { settings: channelSettings } = useChannelSettings(roomId, activeChannelObj?.name);

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

  const safeActiveUsers = activeUsers || [];
  const rawList = [...safeActiveUsers, ...(activeChannelObj?.users || []), ...simulatedUsers];

  // Deduplicate by normalizing key (lowercase) and preferring objects over strings
  const uniqueUsersMap = new Map<string, (typeof rawList)[number]>();
  rawList.forEach((u) => {
    const key = typeof u === 'string' ? u : u.userId;
    if (key) {
      const normalizedKey = key.toLowerCase();
      if (!uniqueUsersMap.has(normalizedKey) || typeof u !== 'string') {
        uniqueUsersMap.set(normalizedKey, u);
      }
    }
  });

  const dynamicUserList = Array.from(uniqueUsersMap.values());
  // Simulasikan jumlah user di panel LCD hingga angka 3 digit (+125 offset)
  const dynamicUserCount = dynamicUserList.length + 125;

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

  useEffect(() => {
    if (status === 'wait') {
      if (waitTimer === null) setWaitTimer(30);
    } else {
      setWaitTimer(null);
    }
  }, [status, waitTimer]);

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

  useEffect(() => {
    isFirstRender.current = true;
  }, [channel]);

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

  useEffect(() => {
    setSimulatedUsers([]);
  }, [isPowerOn]);

  useEffect(() => {
    if (!isPowerOn) {
      setProgress(0);
      return;
    }

    const isReceiving =
      !!activeTransmitter && activeTransmitter.userId !== usePTTStore.getState().userId;

    // Reset saat tidak ada aktivitas sama sekali
    if (!isTransmitting && !isReceiving) {
      setProgress(0);
    }
  }, [isPowerOn, isTransmitting, activeTransmitter, setProgress]);

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

              // Convert base64 chunks back to array buffers, combine into a single Blob, and convert to base64
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

  const setOnVoiceChunkReceived = usePTTStore((state) => state.setOnVoiceChunkReceived);

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

  useEffect(() => {
    if (!isPowerOn) {
      stopRecording();
      flushAudioQueue();
    }
  }, [isPowerOn, stopRecording, flushAudioQueue]);

  useEffect(() => {
    if (isScanning) {
      const interval = setInterval(() => {
        channelUp();
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [isScanning, channelUp]);

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

  useEffect(() => {
    setOnReactionReceived((payload) => {
      if (isPowerOn) {
        const state = usePTTStore.getState();
        const isSelf =
          payload.senderId === state.userId &&
          (!payload.senderCallSign || payload.senderCallSign === state.callSign);
        if (isSelf) return;

        // ── Putar suara secara lokal saat MENERIMA ──────────────────────────
        if (payload.category === 'sound') {
          playReactionSound(payload.reaction);
        }
        // ── End sound playback ─────────────────────────────────────────────

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
  }, [isPowerOn, setOnReactionReceived, playReactionSound]);

  const broadcastReaction = usePTTStore((state) => state.broadcastReaction);

  const handleSendReaction = (category: 'animation' | 'sound' | 'gift', reactionType: string) => {
    if (!isPowerOn) return;

    // Guard channel 100 dan 0 — tidak ada reaksi di channel khusus ini
    if (channel === 100 || channel === 0) return;

    // ── Putar suara secara lokal saat MENGIRIM ──────────────────────────────
    if (category === 'sound') {
      playReactionSound(reactionType);
    }
    // ── End sound playback ──────────────────────────────────────────────────

    const localDisplayName = infoText || 'Saya';

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

    broadcastReaction(category, reactionType);
  };

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

          // Envelope lebih mirip pola bicara manusia:
          // - ada "burst" saat konsonan
          // - ada "sustain" saat vokal
          // - ada "gap" singkat saat jeda antar kata (setiap ~0.4 detik)
          const wordRhythm = Math.max(0, Math.sin(elapsed * 7.5)); // ~1 kata/detik
          const syllable = Math.abs(Math.sin(elapsed * 14)); // ~2 suku kata/detik
          const breathingGap = elapsed % 3.5 < 0.2 ? 0.05 : 1; // jeda napas setiap 3.5 detik

          const speechEnvelope = (wordRhythm * 0.5 + syllable * 0.5) * breathingGap;
          const naturalProgress = Math.max(5, speechEnvelope * 85 + (Math.random() * 8 - 4));

          setProgress(Math.min(100, naturalProgress));
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

  return {
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
    setIsKaraokePlayerOpen,
    userId,
    channel,
    infoText,
    locationText,
    setIsTransmitting,
    setIsPowerOn,
    activeChannelObj,
    isSettingsOpen,
    setIsSettingsOpen,
    isChannelListOpen,
    setIsChannelListOpen,
    isUserListOpen,
    setIsUserListOpen,
    isManageOpen,
    setIsManageOpen,
    isWalletOpen,
    setIsWalletOpen,
    isRoipOpen,
    setIsRoipOpen,
    isChatOpen,
    setIsChatOpen,
    isQueueOpen,
    setIsQueueOpen,
    isPrivateOpen,
    setIsPrivateOpen,
    floatingReactions,
    waitTimer,
    dynamicUserList,
    dynamicUserCount,
    getThemeClass,
    status,
    pttAllowed,
    isBusy,
    handleSet,
    handleSendReaction,
    marqueeText,
    channelNameStr,
    isPanelOpen,
    roomId,
  };
}
