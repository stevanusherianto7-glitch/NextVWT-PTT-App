import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import vintageMic from '../../assets/vintage_mic.png';
import { ToggleSwitch } from './ToggleSwitch';
import { LCDPanel } from './LCDPanel';
import { ControlButtons } from './ControlButtons';
import { PTTButton } from './PTTButton';
import { ProgressBar } from './ProgressBar';
import { usePTTStore } from '../store/usePTTStore';
import { UserListModal } from './UserListModal';
import { ChannelListModal } from './ChannelListModal';
import { STATIC_CHANNELS } from '../utils/constants';
import { useAudioStreamer } from '../hooks/useAudioStreamer';
import { toast } from 'sonner';
import { SettingsPanelSkeleton, KaraokePlayerSkeleton } from './SkeletonLoaders';
import { FeedbackModal } from './FeedbackModal';
import { useChannelRole } from '../../features/moderation/useChannelRole';
import { useChannelSettings } from '../../features/moderation/useChannelSettings';
import { ChannelManagePanel } from '../../features/moderation/ChannelManagePanel';
import { canUsePTT } from '../../features/moderation/permissions';
import { getSupabase } from '../utils/supabase';
import { WalletPanel } from '../../features/payment/WalletPanel';
import { ROIPBridgePanel } from '../../features/roip/ROIPBridgePanel';
import { QuickActionDock } from './QuickActionDock';
import { ChatRoomPanel } from '../../features/chat/ChatRoomPanel';
import { KaraokeQueuePanel } from '../../features/karaoke-queue/KaraokeQueuePanel';
import { PrivateChannelPanel } from '../../features/moderation/PrivateChannelPanel';
import { Player } from '@lottiefiles/react-lottie-player';
import applauseAnimation from '../../assets/reactions/applause.json';
import loveAnimation from '../../assets/reactions/love.json';
import wowAnimation from '../../assets/reactions/wow.json';
import fireAnimation from '../../assets/reactions/fire.json';
import crownAnimation from '../../assets/reactions/crown.json';
import confettiAnimation from '../../assets/reactions/confetti.json';
import kissAnimation from '../../assets/reactions/kiss.json';
import bartSvg from '../../assets/reactions/bart.svg';
import foxSvg from '../../assets/reactions/fox.svg';

const playReactionSound = (kind: string) => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (kind === 'laugh') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
      osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } else if (kind === 'buzzer') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } else if (kind === 'horn') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(500, audioCtx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.6);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    }
  } catch (e) {
    console.warn('Audio play failed:', e);
  }
};

// Helper to catch dynamic import chunk loading failures (typically after a new deploy)
// and automatically reload the page to fetch the latest assets
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

// [P2-2] Lazy-load komponen besar — hanya diunduh saat pertama kali dibuka
// SettingsPanel: ~76KB → split ke chunk terpisah, tidak menambah initial bundle
const SettingsPanel = lazyRetry<import('./SettingsPanel').SettingsPanelProps>(async () => {
  const m = await import('./SettingsPanel');
  return {
    default: m.SettingsPanel as React.ComponentType<import('./SettingsPanel').SettingsPanelProps>,
  };
});
// FloatingKaraokePlayer: ~21KB → split ke chunk terpisah
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
    isConnected,
    isTransmitting,
    isScanning,
    progress,
    channelNumber: channel,
    infoText,
    locationText,
    showPTT,
    showModulator,
    setPower: setIsPowerOn,
    setTransmitting: setIsTransmitting,
    setProgress,
    channelUp,
    channelDown,
    setChannelNumber,
    activeUsers,
    activeTransmitter,
    themeText,
    audioMode,
    fullDuplex,
    isKaraokePlayerOpen,
    setKaraokePlayerOpen: setIsKaraokePlayerOpen,
    userId,
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
  const [txStartTime, setTxStartTime] = useState<number>(0);
  const [waitTimer, setWaitTimer] = useState<number | null>(null);

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
    activeTransmitter && activeTransmitter.userId !== usePTTStore.getState().userId;
  const isFullDuplexActive = fullDuplex || audioMode === 'music';
  const isBusy = !isFullDuplexActive && !!isReceiving;

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

  // Reset progress when not transmitting and not receiving
  useEffect(() => {
    if (isTransmitting) return;

    const isReceiving =
      activeTransmitter && activeTransmitter.userId !== usePTTStore.getState().userId;
    if (!isReceiving) {
      setProgress(0);
    }
  }, [isTransmitting, activeTransmitter, setProgress]);

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
      setTxStartTime(Date.now());
    } else {
      stopRecording();

      // Playback recorded chunks on Channel 100 after PTT released (Parrot Echo Test)
      const currentChannel = usePTTStore.getState().channelNumber;
      if (currentChannel === 100) {
        setTimeout(() => {
          if (echoChunksRef.current.length > 0) {
            try {
              const chunksToPlay = [...echoChunksRef.current];
              echoChunksRef.current = [];
              
              // Combine all base64 chunks into a single ArrayBuffer (full WebM file)
              let totalLength = 0;
              const byteArrays = chunksToPlay.map(b64 => {
                const binary = window.atob(b64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                totalLength += bytes.length;
                return bytes;
              });
              
              const combinedBuffer = new Uint8Array(totalLength);
              let offset = 0;
              for (const bytes of byteArrays) {
                combinedBuffer.set(bytes, offset);
                offset += bytes.length;
              }
              
              let combinedBinary = '';
              for (let i = 0; i < combinedBuffer.length; i++) {
                combinedBinary += String.fromCharCode(combinedBuffer[i]);
              }
              const combinedBase64 = window.btoa(combinedBinary);
              
              // Local loopback offline fallback triggers the playAudioChunk
              playAudioChunk(combinedBase64);
            } catch (err) {
              console.error('Failed to combine parrot chunks:', err);
            }
          }
        }, 500); // Wait long enough for MediaRecorder.stop() to flush the final async chunk
      }

      // Logic untuk memicu FeedbackModal jika pengguna baru selesai transmit
      if (txStartTime > 0) {
        const txDuration = Date.now() - txStartTime;
        const lastFeedback = usePTTStore.getState().lastFeedbackTime;
        const timeSinceLastFeedback = Date.now() - lastFeedback;
        const ONE_DAY = 24 * 60 * 60 * 1000;

        // Tampilkan modal jika durasi transmisi > 3 detik dan sudah lewat 1 hari sejak prompt terakhir
        if (txDuration > 3000 && timeSinceLastFeedback > ONE_DAY) {
          usePTTStore.getState().setShowFeedbackModal(true);
        }
        setTxStartTime(0);
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
    txStartTime,
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
        const id = payload.id || Math.random().toString();
        const x = 30 + Math.random() * 40;
        const senderName = (payload as { senderName?: string }).senderName || 'User';
        setFloatingReactions((prev) => [
          ...prev,
          { id, category: payload.category, reaction: payload.reaction, x, senderName },
        ]);
        if (payload.category === 'sound') playReactionSound(payload.reaction);
        setTimeout(() => {
          setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
        }, 5000);
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
    if (category === 'sound') playReactionSound(reactionType);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== localId));
    }, 5000);

    // Broadcast to other peers on the channel
    broadcastReaction(category, reactionType);
  };

  const handleSet = () => {
    if (isPowerOn) {
      setIsSettingsOpen(true);
    }
  };

  // activeChannelObj already declared at the top of the component
  const safeActiveUsers = activeUsers || [];

  const dynamicUserList = [...safeActiveUsers, ...(activeChannelObj?.users || [])];

  const dynamicUserCount = dynamicUserList.length;

  const displayUser = infoText ? infoText.toUpperCase() : 'USER';
  const displayLoc = locationText ? locationText.toUpperCase() : 'BANDUNG, JAWA BARAT';
  const channelNameStr = activeChannelObj ? activeChannelObj.name.toUpperCase() : 'STANDBY CHANNEL';
  const programName = channelSettings?.channel_description;
  const marqueeText = programName
    ? `PROGRAM SAAT INI: ${programName.toUpperCase()} • CHANNEL ${channel} • ${channelNameStr} • ${displayUser} (${displayLoc}) • STANDBY • READY`
    : `CHANNEL ${channel} • ${channelNameStr} • ${displayUser} (${displayLoc}) • STANDBY • READY`;

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
      {isManageOpen ? (
        <ChannelManagePanel
          roomId={roomId}
          userId={userId}
          initialChannelName={activeChannelObj?.name}
          onClose={() => setIsManageOpen(false)}
          onOpenPrivate={() => {
            setIsManageOpen(false);
            setIsPrivateOpen(true);
          }}
        />
      ) : isWalletOpen ? (
        <WalletPanel onClose={() => setIsWalletOpen(false)} />
      ) : isRoipOpen ? (
        <ROIPBridgePanel onClose={() => setIsRoipOpen(false)} />
      ) : isChatOpen ? (
        <ChatRoomPanel onClose={() => setIsChatOpen(false)} />
      ) : isQueueOpen ? (
        <KaraokeQueuePanel onClose={() => setIsQueueOpen(false)} />
      ) : isPrivateOpen ? (
        <PrivateChannelPanel
          onClose={() => setIsPrivateOpen(false)}
          onOpenWallet={() => setIsWalletOpen(true)}
        />
      ) : isSettingsOpen ? (
        // Suspense boundary: tampilkan skeleton saat SettingsPanel sedang dimuat
        // (hanya terjadi pada kali pertama Settings dibuka dalam sesi ini)
        <Suspense fallback={<SettingsPanelSkeleton />}>
          <SettingsPanel
            onClose={() => setIsSettingsOpen(false)}
            onOpenModeration={() => setIsManageOpen(true)}
            onOpenWallet={() => setIsWalletOpen(true)}
            onOpenRoip={() => setIsRoipOpen(true)}
          />
        </Suspense>
      ) : (
        <div
          className="size-full flex flex-col items-center overflow-hidden relative transition-all duration-300"
          style={{
            background: 'var(--device-bg)',
            boxShadow: 'var(--device-shadow)',
            border: 'var(--device-border)',
          }}
        >
          {/* Top Bar */}
          <div
            className="w-full h-[70px] flex items-center justify-between pr-5 z-20 relative overflow-hidden"
            style={{
              paddingLeft: 'max(4px, calc(50% - 176.16px))',
              background: 'var(--header-bg)',
              boxShadow:
                'var(--header-shadow), inset 0 -12px 20px -6px rgba(0, 0, 0, 0.45), inset 0 3px 6px rgba(255, 255, 255, 0.4)',
              borderBottom: 'var(--header-border)',
            }}
          >
            {/* Top Glossy Reflection */}
            <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-white/35 to-transparent pointer-events-none z-10" />
            <div
              onClick={() => {
                if (isPowerOn) {
                  setIsUserListOpen(!isUserListOpen);
                }
              }}
              className={`flex items-center gap-3 relative z-20 ${isPowerOn ? 'cursor-pointer hover:opacity-85 active:scale-98 transition-all' : ''}`}
            >
              {/* Logo Section */}
              <div className="relative flex items-center justify-center h-full">
                <div className="relative flex items-center justify-center">
                  {isTransmitting && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div
                        className="logo-transmitting-bg"
                        style={{ width: '100px', height: '100px' }}
                      >
                        <div className="extra-ripple"></div>
                      </div>
                    </div>
                  )}
                  <svg
                    viewBox="0 0 100 100"
                    className={`w-[68px] h-[68px] relative z-20 transition-all duration-300 ${isTransmitting ? 'logo-transmitting' : ''}`}
                    style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.25))' }}
                  >
                    <defs>
                      <radialGradient id="nextvwtSphere3D" cx="32%" cy="30%" r="68%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                        <stop offset="18%" stopColor="#ff6b6b" />
                        <stop offset="50%" stopColor="#cc0000" />
                        <stop offset="80%" stopColor="#800000" />
                        <stop offset="100%" stopColor="#3d0000" />
                      </radialGradient>
                      <clipPath id="micClip">
                        <circle cx="50" cy="50" r="36" />
                      </clipPath>
                    </defs>

                    <path
                      d="M 22 77 A 38 38 0 1 1 78 77"
                      stroke="#0a2e1a"
                      strokeWidth="6"
                      strokeLinecap="round"
                      fill="none"
                      transform="translate(1, 1.2)"
                      opacity="0.5"
                    />
                    <path
                      d="M 22 77 A 38 38 0 1 1 78 77"
                      stroke="#34D399"
                      strokeWidth="6"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <path
                      d="M 22 77 A 38 38 0 1 1 78 77"
                      stroke="#a7f3d0"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      fill="none"
                      opacity="0.65"
                      transform="translate(-0.6, -0.7)"
                    />

                    <path
                      d="M 29 71 A 28 28 0 1 1 71 71"
                      stroke="#713f12"
                      strokeWidth="6"
                      strokeLinecap="round"
                      fill="none"
                      transform="translate(1, 1.2)"
                      opacity="0.5"
                    />
                    <path
                      d="M 29 71 A 28 28 0 1 1 71 71"
                      stroke="#eab308"
                      strokeWidth="6"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <path
                      d="M 29 71 A 28 28 0 1 1 71 71"
                      stroke="#fef08a"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      fill="none"
                      opacity="0.65"
                      transform="translate(-0.6, -0.7)"
                    />

                    <path
                      d="M 36 65 A 18 18 0 1 1 64 65"
                      stroke="#003a17"
                      strokeWidth="6"
                      strokeLinecap="round"
                      fill="none"
                      transform="translate(1, 1.2)"
                      opacity="0.5"
                    />
                    <path
                      d="M 36 65 A 18 18 0 1 1 64 65"
                      stroke="#00C853"
                      strokeWidth="6"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <path
                      d="M 36 65 A 18 18 0 1 1 64 65"
                      stroke="#69f0ae"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      fill="none"
                      opacity="0.65"
                      transform="translate(-0.6, -0.7)"
                    />

                    <circle
                      cx="50"
                      cy="50"
                      r="11"
                      fill="#1a0000"
                      transform="translate(1.2, 1.5)"
                      opacity="0.45"
                    />
                    <image
                      href={vintageMic}
                      x="14"
                      y="14"
                      width="72"
                      height="72"
                      clipPath="url(#micClip)"
                      preserveAspectRatio="xMidYMid slice"
                    />
                  </svg>
                </div>
                <div
                  className={`flex flex-col justify-center relative z-20 transition-all duration-300 ${isTransmitting ? 'logo-transmitting' : ''} ml-2`}
                >
                  <span
                    className="text-[16px] leading-none tracking-wide select-none"
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    <span className="font-medium" style={{ color: 'var(--header-text-color)' }}>
                      Next
                    </span>
                    <span className="font-black text-[#00C853]">VWT</span>
                  </span>
                  <div className="w-[120px] overflow-hidden whitespace-nowrap relative h-[20px] mt-0.5">
                    <div
                      className="absolute top-0 left-0 inline-block animate-marquee text-[10px] font-semibold tracking-wide leading-none py-0.5"
                      style={{ color: 'var(--header-text-color)', opacity: 0.65 }}
                    >
                      {marqueeText}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ToggleSwitch isOn={isPowerOn} onToggle={() => setIsPowerOn(!isPowerOn)} />
            </div>
          </div>

          {/* Main Content */}
          <div
            onClick={() => {
              if (isPowerOn && isUserListOpen) {
                setIsUserListOpen(false);
              }
            }}
            className="flex-1 min-h-0 w-full max-w-[400px] flex flex-col items-center pt-[14px] px-[10px] pb-20 relative cursor-default"
          >
            {isUserListOpen ? (
              <UserListModal
                channel={channel}
                channelName={channelNameStr}
                users={dynamicUserList}
                onClose={() => setIsUserListOpen(false)}
              />
            ) : (
              <div className="w-full h-[424px] flex flex-col justify-start items-center relative">
                {/* Themed Faceplate Container */}
                <div
                  className="w-full flex flex-col items-center pt-6 pb-3 relative z-10 transition-all duration-300"
                  style={{
                    borderRadius: '40px 40px 200px 200px / 40px 40px 90px 90px',
                    background: 'var(--panel-bg)',
                    boxShadow: 'var(--panel-shadow)',
                    border: 'var(--panel-border)',
                    backdropFilter: 'var(--panel-blur)',
                  }}
                >
                  {/* 3D Faceplate Outer Highlight and Shadow Overlay */}
                  <div
                    className="absolute inset-0 pointer-events-none z-20"
                    style={{
                      borderRadius: '40px 40px 200px 200px / 40px 40px 90px 90px',
                      boxShadow:
                        'inset 0 2.5px 4px rgba(0, 0, 0, 0.32), inset 0 -2px 3px rgba(0, 0, 0, 0.25), inset 2px 0 3px rgba(0, 0, 0, 0.22), inset -2px 0 3px rgba(0, 0, 0, 0.22)',
                    }}
                  />
                  {/* LCD Panel */}
                  <div className="transition-opacity duration-300 flex justify-center w-full relative">
                    <LCDPanel
                      channel={channel}
                      userCount={dynamicUserCount}
                      isOffline={!isConnected}
                      isPowerOn={isPowerOn}
                      onUserCountClick={() => setIsUserListOpen(true)}
                    />
                  </div>

                  {/* Progress Bar */}
                  {showModulator && (
                    <div
                      className={`mt-2 flex justify-center transition-opacity duration-300 w-full ${isPowerOn ? 'opacity-100' : 'opacity-30'}`}
                    >
                      <ProgressBar progress={progress} />
                    </div>
                  )}

                  {/* Control Buttons */}
                  <div
                    className={`mt-1 mb-0.5 flex justify-center transition-opacity duration-300 w-full ${isPowerOn ? '' : 'pointer-events-none'}`}
                  >
                    <ControlButtons
                      onScan={() => setIsChannelListOpen(true)}
                      onSet={handleSet}
                      onUp={channelUp}
                      onDown={channelDown}
                      isScanning={isScanning}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Floating Reactions Overlay — rendered on top of both UserListModal and faceplate */}
            {isPowerOn && floatingReactions.length > 0 && (
              <div className={`absolute inset-x-0 top-[14px] w-full max-w-[340px] mx-auto h-[426px] pointer-events-none z-30 overflow-hidden ${isUserListOpen ? 'flex items-center justify-center' : ''}`}>
                {floatingReactions.map((r) => {
                  const floatAnim = isUserListOpen ? 'animate-float-center-up' : 'animate-float-up';
                  const posStyle = isUserListOpen
                    ? { position: 'absolute' as const, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
                    : { position: 'absolute' as const, bottom: 0, left: `${r.x}%`, transform: 'translateX(-50%)' };

                  if (r.category === 'sound') {
                    const soundEmojis: Record<string, string> = {
                      laugh: '🤣',
                      buzzer: '❌',
                      drum: '🥁',
                      horn: '🎺',
                    };
                    return (
                      <div
                        key={r.id}
                        className="flex flex-col items-center gap-0.5 pointer-events-none"
                        style={posStyle}
                      >
                        <div className={`${floatAnim} flex flex-col items-center gap-0.5 opacity-80`}>
                          <span className="text-[32px]">{soundEmojis[r.reaction] || '🎵'}</span>
                          {r.senderName && (
                            <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm leading-none whitespace-nowrap max-w-[80px] truncate">
                              {r.senderName}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (r.category === 'gift') {
                    const giftEmojis: Record<string, string> = {
                      giftbox: '🎁',
                      rose: '🌹',
                      diamond: '💎',
                      coffee: '☕',
                    };
                    return (
                      <div
                        key={r.id}
                        className="fixed inset-0 m-auto w-[150px] h-[150px] flex items-center justify-center animate-bounce z-[100] pointer-events-none drop-shadow-2xl"
                      >
                        <span className="text-[120px] filter drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]">
                          {giftEmojis[r.reaction] || '🎁'}
                        </span>
                      </div>
                    );
                  }

                  if (r.reaction === 'bart') {
                    return (
                      <div
                        key={r.id}
                        className="flex flex-col items-center gap-0.5 pointer-events-none"
                        style={posStyle}
                      >
                        <div className={`${floatAnim} flex flex-col items-center gap-0.5`}>
                          <img src={bartSvg} className="w-[110px] h-[110px] object-contain" alt="Bart Simpson" />
                          {r.senderName && (
                            <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm leading-none whitespace-nowrap max-w-[110px] truncate">
                              {r.senderName}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (r.reaction === 'fox') {
                    return (
                      <div
                        key={r.id}
                        className="flex flex-col items-center gap-0.5 pointer-events-none"
                        style={posStyle}
                      >
                        <div className={`${floatAnim} flex flex-col items-center gap-0.5`}>
                          <img src={foxSvg} className="w-[180px] h-[180px] object-contain" alt="Cute Fox" />
                          {r.senderName && (
                            <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm leading-none whitespace-nowrap max-w-[120px] truncate">
                              {r.senderName}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (r.reaction === 'rocket') {
                    return (
                      <div
                        key={r.id}
                        className="flex flex-col items-center gap-0.5 pointer-events-none"
                        style={posStyle}
                      >
                        <div className={`${isUserListOpen ? 'animate-float-center-up' : 'animate-rocket-launch'} flex flex-col items-center gap-0.5`}>
                          <span
                            className="text-[52px] select-none"
                            style={{
                              display: 'inline-block',
                              animation: isUserListOpen ? undefined : 'rocket3d 4s ease-out forwards',
                              filter: 'drop-shadow(0 0 10px rgba(255,140,0,0.9)) drop-shadow(0 6px 12px rgba(0,0,0,0.5))',
                            }}
                          >
                            🚀
                          </span>
                          {r.senderName && (
                            <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm leading-none whitespace-nowrap max-w-[90px] truncate">
                              {r.senderName}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }
                  if (r.reaction === 'lightning') {
                    return (
                      <div
                        key={r.id}
                        className="flex flex-col items-center gap-0.5 pointer-events-none"
                        style={posStyle}
                      >
                        <div className={`${isUserListOpen ? 'animate-float-center-up' : ''} flex flex-col items-center gap-0.5`}>
                          <span
                            className="text-[58px] select-none"
                            style={{
                              display: 'inline-block',
                              animation: isUserListOpen ? undefined : 'lightning3d 4s ease-out forwards',
                              filter: 'drop-shadow(0 0 16px rgba(255,255,60,1)) drop-shadow(0 0 32px rgba(255,200,0,0.7))',
                            }}
                          >
                            ⚡
                          </span>
                          {r.senderName && (
                            <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm leading-none whitespace-nowrap max-w-[90px] truncate">
                              {r.senderName}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (r.reaction === 'star3d') {
                    return (
                      <div
                        key={r.id}
                        className="flex flex-col items-center gap-0.5 pointer-events-none"
                        style={posStyle}
                      >
                        <div className={`${isUserListOpen ? 'animate-float-center-up' : ''} flex flex-col items-center gap-0.5`}>
                          <span
                            className="text-[56px] select-none"
                            style={{
                              display: 'inline-block',
                              animation: isUserListOpen ? undefined : 'star3dSpin 4.5s ease-out forwards',
                              filter: 'drop-shadow(0 0 14px rgba(255,220,0,0.95)) drop-shadow(0 0 28px rgba(255,180,0,0.6))',
                            }}
                          >
                            🌟
                          </span>
                          {r.senderName && (
                            <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm leading-none whitespace-nowrap max-w-[90px] truncate">
                              {r.senderName}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  const animationMap: Record<string, unknown> = {
                    applause: applauseAnimation,
                    love: loveAnimation,
                    kiss: kissAnimation,
                    wow: wowAnimation,
                    fire: fireAnimation,
                    crown: crownAnimation,
                    confetti: confettiAnimation,
                  };
                  const animData = animationMap[r.reaction];
                  return (
                    <div
                      key={r.id}
                      className="flex flex-col items-center gap-0.5 pointer-events-none"
                      style={posStyle}
                    >
                      <div className={`${floatAnim} flex flex-col items-center gap-0.5`}>
                        {animData ? (
                          <Player
                            autoplay
                            loop={false}
                            src={animData}
                            style={{ width: '110px', height: '110px' }}
                          />
                        ) : (
                          <span className="text-4xl">🔥</span>
                        )}
                        {r.senderName && (
                          <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm leading-none whitespace-nowrap max-w-[110px] truncate">
                            {r.senderName}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Action Dock - Moved outside to ensure visibility during UserListModal */}
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full flex justify-center z-20 ${isUserListOpen ? 'mt-3' : 'mt-0'}`}
            >
              <QuickActionDock
                onOpenChat={() => setIsChatOpen(true)}
                onOpenQueue={() => setIsQueueOpen(true)}
                onSendReaction={handleSendReaction}
                isPowerOn={isPowerOn}
                showSocialFeatures={isPowerOn}
                themeKey={getThemeClass(themeText)}
              />
            </div>

            {/* PTT Button */}
            {showPTT && (
              <div
                className={`absolute left-0 right-0 w-full flex justify-center transition-opacity duration-300 opacity-100 ${isPowerOn ? '' : 'pointer-events-none'}`}
                style={{ bottom: 'calc(12px + env(safe-area-inset-bottom, 8px))' }}
              >
                <div onClick={(e) => e.stopPropagation()}>
                  <PTTButton
                    isActive={isTransmitting}
                    isBusy={isBusy}
                    isMuted={status === 'muted'}
                    waitCountdown={waitTimer}
                    onPressStart={() => {
                      if (isPowerOn) {
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
                      }
                    }}
                    onPressEnd={() => setIsTransmitting(false)}
                  />
                </div>
              </div>
            )}

            {/* Floating Karaoke Player — lazy-loaded, hanya mount saat mode music aktif */}
            {isPowerOn && audioMode === 'music' && isKaraokePlayerOpen && (
              <div onClick={(e) => e.stopPropagation()}>
                <Suspense fallback={<KaraokePlayerSkeleton />}>
                  <FloatingKaraokePlayer onClose={() => setIsKaraokePlayerOpen(false)} />
                </Suspense>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Channel List Modal Dialog */}
      {isChannelListOpen && (
        <ChannelListModal
          onClose={() => setIsChannelListOpen(false)}
          onSelectChannel={(num) => setChannelNumber(num)}
        />
      )}

      {/* In-App Feedback Modal */}
      <FeedbackModal />
    </div>
  );
}
