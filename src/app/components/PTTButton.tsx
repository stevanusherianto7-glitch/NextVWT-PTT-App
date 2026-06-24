import { useState, useRef, useEffect } from 'react';
import { usePTTStore } from '../store/usePTTStore';

interface PTTButtonProps {
  onPressStart: () => void;
  onPressEnd: () => void;
  isActive?: boolean;
  isBusy?: boolean;
  isMuted?: boolean;
  waitCountdown?: number | null;
}


// ─── Walkie-Talkie Classic Sound Engine ───────────────────────────────────────

/**
 * Generates layered analog radio noise (colored noise via bandpass cascade)
 * simulating the warm, band-limited static of a classic VHF/UHF radio.
 */
const createRadioNoise = (
  ctx: AudioContext,
  dest: AudioNode,
  duration: number,
  startTime: number,
  peakGain: number = 0.3
) => {
  const bufferSize = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // Pink-ish noise: bias toward lower frequencies
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    data[i] = (b0 + b1 + b2 + white * 0.5362) / 4.5;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  // Layer 1: Radio speaker band (700–3500 Hz — classic walkie-talkie narrowband)
  const hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = 700;
  hpf.Q.value = 0.8;

  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = 3200;
  lpf.Q.value = 0.9;

  // Layer 2: Presence boost at ~1.8kHz (radio mic resonance)
  const presence = ctx.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 1800;
  presence.Q.value = 1.5;
  presence.gain.value = 5;

  // Gain envelope: sharp attack, exponential decay
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(peakGain, startTime + 0.008);
  gainNode.gain.setValueAtTime(peakGain, startTime + 0.015);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  source.connect(hpf);
  hpf.connect(lpf);
  lpf.connect(presence);
  presence.connect(gainNode);
  gainNode.connect(dest);

  source.start(startTime);
  source.stop(startTime + duration);
};

/**
 * Mechanical key-click + burst static: the physical sound of pressing a
 * spring-loaded PTT button on an analog transceiver.
 */
const playPressSound = (ctx: AudioContext, masterGain: GainNode) => {
  const t = ctx.currentTime;

  // 1. Mechanical thump (low-freq body impact ~80Hz)
  const thump = ctx.createOscillator();
  const thumpEnv = ctx.createGain();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(90, t);
  thump.frequency.exponentialRampToValueAtTime(40, t + 0.06);
  thumpEnv.gain.setValueAtTime(0, t);
  thumpEnv.gain.linearRampToValueAtTime(0.55, t + 0.005);
  thumpEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  thump.connect(thumpEnv);
  thumpEnv.connect(masterGain);
  thump.start(t);
  thump.stop(t + 0.08);

  // 2. Pre-chirp: rapid dual-tone sweep (classic trunking "bweeep")
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const chirpEnv = ctx.createGain();
  osc1.type = 'triangle';
  osc2.type = 'square';

  // Sweep up fast (like a fast DTMF or control channel burst)
  osc1.frequency.setValueAtTime(820, t + 0.01);
  osc1.frequency.linearRampToValueAtTime(1150, t + 0.065);
  osc2.frequency.setValueAtTime(1100, t + 0.01);
  osc2.frequency.linearRampToValueAtTime(1480, t + 0.065);

  chirpEnv.gain.setValueAtTime(0, t + 0.01);
  chirpEnv.gain.linearRampToValueAtTime(0.18, t + 0.022);
  chirpEnv.gain.setValueAtTime(0.18, t + 0.055);
  chirpEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.085);

  // Narrow bandpass filter on chirp for RF character
  const chirpBP = ctx.createBiquadFilter();
  chirpBP.type = 'bandpass';
  chirpBP.frequency.value = 1200;
  chirpBP.Q.value = 2.2;

  osc1.connect(chirpEnv);
  osc2.connect(chirpEnv);
  chirpEnv.connect(chirpBP);
  chirpBP.connect(masterGain);

  osc1.start(t + 0.01);
  osc2.start(t + 0.01);
  osc1.stop(t + 0.1);
  osc2.stop(t + 0.1);

  // 3. RF static burst (channel open noise)
  createRadioNoise(ctx, masterGain, 0.09, t + 0.04, 0.22);
};

/**
 * Roger Beep + Squelch Tail: the unmistakable end-of-transmission signature
 * of a classic Motorola/Kenwood HT transceiver.
 *
 * Sequence (timeline):
 *   0.00s – Squelch tail bursts open (white noise + bandpass)
 *   0.18s – Roger Beep tone 1 (1450 Hz, 85ms)
 *   0.30s – Roger Beep tone 2 (1150 Hz, 85ms)
 *   0.42s – Roger Beep tone 3 (1320 Hz, 75ms)
 *   0.52s – Squelch tail collapses with hard gate click
 */
const playReleaseSound = (ctx: AudioContext, masterGain: GainNode) => {
  const t = ctx.currentTime;

  // ── Squelch Tail Open ──────────────────────────────────────────────
  createRadioNoise(ctx, masterGain, 0.20, t, 0.32);

  // ── Roger Beep Sequence ────────────────────────────────────────────
  // Classic 3-tone Motorola roger: high → low → mid
  const rogerTones = [
    { freq: 1450, start: 0.20, dur: 0.085 },
    { freq: 1150, start: 0.31, dur: 0.085 },
    { freq: 1320, start: 0.42, dur: 0.075 },
  ];

  rogerTones.forEach(({ freq, start, dur }) => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    // Slight harmonic distortion for RF warmth
    const waveShaper = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = x - (x * x * x) / 4; // soft clip
    }
    waveShaper.curve = curve;

    osc.type = 'sine';
    osc.frequency.value = freq;

    // Sharp ADSR: fast attack, sustain, fast decay
    env.gain.setValueAtTime(0, t + start);
    env.gain.linearRampToValueAtTime(0.52, t + start + 0.010);
    env.gain.setValueAtTime(0.52, t + start + dur - 0.015);
    env.gain.exponentialRampToValueAtTime(0.001, t + start + dur);

    // Narrow bandpass to emulate radio speaker response
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 8; // Tight Q for clear tone character

    osc.connect(env);
    env.connect(waveShaper);
    waveShaper.connect(bp);
    bp.connect(masterGain);

    osc.start(t + start);
    osc.stop(t + start + dur + 0.01);
  });

  // ── Squelch Tail Close ─────────────────────────────────────────────
  // Brief crackle as channel gate slams shut after roger beep
  createRadioNoise(ctx, masterGain, 0.06, t + 0.50, 0.18);

  // Hard gate click (mechanical relay thud)
  const gateClick = ctx.createOscillator();
  const gateEnv = ctx.createGain();
  gateClick.type = 'sine';
  gateClick.frequency.setValueAtTime(60, t + 0.56);
  gateClick.frequency.exponentialRampToValueAtTime(20, t + 0.60);
  gateEnv.gain.setValueAtTime(0.35, t + 0.56);
  gateEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.61);
  gateClick.connect(gateEnv);
  gateEnv.connect(masterGain);
  gateClick.start(t + 0.56);
  gateClick.stop(t + 0.62);
};

// ─── Main Radio Sound Dispatcher ──────────────────────────────────────────────
const playRadioSound = (
  type: 'press' | 'release',
  ctx: AudioContext,
  toneOnStartEnd: boolean,
  pttVolume: number
) => {
  if (!toneOnStartEnd) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();

    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    masterGain.gain.value = Math.min(1.0, pttVolume / 100);

    if (type === 'press') {
      playPressSound(ctx, masterGain);
    } else {
      playReleaseSound(ctx, masterGain);
    }
  } catch (err) {
    console.warn('PTT audio playback failed:', err);
  }
};


export function PTTButton({
  onPressStart,
  onPressEnd,
  isActive = false,
  isBusy = false,
  isMuted = false,
  waitCountdown = null,
}: PTTButtonProps) {
  const [isDepressed, setIsDepressed] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Settings and states from Zustand store
  const isPowerOn = usePTTStore((state) => state.isPowerOn);
  const togglePtt = usePTTStore((state) => state.togglePtt);
  const toneOnStartEnd = usePTTStore((state) => state.toneOnStartEnd);
  const pttVolume = usePTTStore((state) => state.pttVolume);
  const vibrateOnStart = usePTTStore((state) => state.vibrateOnStart);
  const pttSize = usePTTStore((state) => state.pttSize);
  const pttBottom = usePTTStore((state) => state.pttBottom);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
  };

  const triggerHaptic = (duration: number) => {
    if (!vibrateOnStart) return;
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try {
        window.navigator.vibrate(duration);
      } catch {
        // Safe fallback for restricted vibration contexts
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (isBusy) return;
    if (e.type === 'touchstart') {
      e.preventDefault();
    }
    setIsDepressed(true);
    triggerHaptic(15);
    initAudio();

    if (!togglePtt && isPowerOn) {
      onPressStart();
      if (audioCtxRef.current)
        playRadioSound('press', audioCtxRef.current, toneOnStartEnd, pttVolume);
    }
  };

  const handleMouseUp = (e: React.MouseEvent | React.TouchEvent) => {
    if (isBusy) return;
    if (e.type === 'touchend') {
      e.preventDefault();
    }

    if (isDepressed && isPowerOn) {
      if (togglePtt) {
        const nextState = !isActive;
        if (nextState) {
          onPressStart();
          if (audioCtxRef.current)
            playRadioSound('press', audioCtxRef.current, toneOnStartEnd, pttVolume);
        } else {
          onPressEnd();
          if (audioCtxRef.current)
            playRadioSound('release', audioCtxRef.current, toneOnStartEnd, pttVolume);
        }
      } else {
        onPressEnd();
        if (audioCtxRef.current)
          playRadioSound('release', audioCtxRef.current, toneOnStartEnd, pttVolume);
      }
      triggerHaptic(10);
    }
    setIsDepressed(false);
  };

  const handleMouseLeave = () => {
    if (isBusy) return;
    if (isDepressed && isPowerOn) {
      if (!togglePtt) {
        onPressEnd();
        if (audioCtxRef.current)
          playRadioSound('release', audioCtxRef.current, toneOnStartEnd, pttVolume);
      }
      triggerHaptic(5);
    }
    setIsDepressed(false);
  };

  // Keyboard Spacebar event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (e.repeat) return;
        e.preventDefault(); // Prevent page scroll
        if (!isPowerOn || isBusy) return;
        setIsDepressed(true);
        triggerHaptic(15);
        initAudio();

        if (!togglePtt) {
          onPressStart();
          if (audioCtxRef.current)
            playRadioSound('press', audioCtxRef.current, toneOnStartEnd, pttVolume);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault(); // Prevent page scroll
        if (!isPowerOn || isBusy) return;

        if (isDepressed) {
          if (togglePtt) {
            const nextState = !isActive;
            if (nextState) {
              onPressStart();
              if (audioCtxRef.current)
                playRadioSound('press', audioCtxRef.current, toneOnStartEnd, pttVolume);
            } else {
              onPressEnd();
              if (audioCtxRef.current)
                playRadioSound('release', audioCtxRef.current, toneOnStartEnd, pttVolume);
            }
          } else {
            onPressEnd();
            if (audioCtxRef.current)
              playRadioSound('release', audioCtxRef.current, toneOnStartEnd, pttVolume);
          }
          triggerHaptic(10);
        }
        setIsDepressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isPowerOn,
    isBusy,
    isActive,
    isDepressed,
    togglePtt,
    toneOnStartEnd,
    pttVolume,
    vibrateOnStart,
    onPressEnd,
     
  ]);

  // Calculate dynamic scale factor and vertical offset
  const scaleFactor = 0.75 + (pttSize / 100) * 0.5; // at 30: 0.9, at 100: 1.25
  const yOffset = (50 - pttBottom) * 1.2; // vertical position adjustment

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: '332px',
        height: '102px',
        borderRadius: '51px',
        background: 'rgba(0, 0, 0, 0.12)',
        boxShadow: isDepressed
          ? 'inset 0 3px 6px rgba(0,0,0,0.4), inset 0 -6px 12px rgba(0,0,0,0.6), inset 0 0 10px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.08)'
          : 'inset 0 6px 10px rgba(0,0,0,0.45), inset 0 -14px 20px rgba(0,0,0,0.75), inset 0 0 14px rgba(0,0,0,0.4), 0 3px 6px rgba(0,0,0,0.12)',
        transform: `translateY(${yOffset}px) scale(${scaleFactor})`,
        transition: 'transform 0.12s ease-out, box-shadow 0.06s ease-in-out',
      }}
    >
      <button type="button"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        onTouchCancel={handleMouseLeave}
        className="relative w-[326px] h-[96px] flex items-center justify-center overflow-hidden focus:outline-none"
        style={{
          borderRadius: '48px',
          background: (!isPowerOn || isMuted)
            ? 'linear-gradient(to bottom, #a3a3a3 0%, #737373 100%)' // Gray when power is off or muted
            : (waitCountdown !== null || isBusy)
              ? 'linear-gradient(to bottom, #f97316 0%, #ea580c 100%)' // Orange when busy or wait
              : isActive
                ? 'linear-gradient(to bottom, #d62828 0%, #a01010 100%)' // Red when active
                : 'linear-gradient(to bottom, #2cdb66 0%, #19ba42 100%)', // Green when idle
          boxShadow: isDepressed
            ? 'inset 0 8px 12px rgba(0, 0, 0, 0.85), inset 0 -2px 3px rgba(0, 0, 0, 0.2)'
            : (!isPowerOn || isMuted)
              ? 'inset 0 3px 6px rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.25)'
              : (waitCountdown !== null || isBusy)
                ? 'inset 0 3px 6px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.2), 0 4px 10px rgba(249, 115, 22, 0.4)'
                : isActive
                  ? 'inset 0 3px 6px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.2), 0 4px 6px rgba(0,0,0,0.3)'
                  : 'inset 0 3px 6px rgba(255, 255, 255, 0.8), 0 4px 10px rgba(44, 219, 102, 0.4)',
          transform: isDepressed ? 'translateY(4px)' : 'translateY(0)',
          border: (!isPowerOn || isMuted)
            ? '1px solid #666666'
            : (waitCountdown !== null || isBusy)
              ? '1px solid #c2410c'
              : isActive
                ? '1px solid #730e0e'
                : '1px solid #149c35',
          transition: 'transform 0.06s ease-in-out, box-shadow 0.06s ease-in-out',
        }}
      >
        <span
          className="relative z-10"
          style={{
            color: '#ffffff',
            fontSize: '44px',
            fontWeight: 800,
            letterSpacing: '3px',
            textShadow:
              isActive || isBusy
                ? '0 0 12px rgba(255, 255, 255, 0.6)'
                : '1px 1px 2px rgba(0,0,0,0.3)',
          }}
        >
          {waitCountdown !== null ? waitCountdown.toString() : isBusy ? 'BUSY' : 'PTT'}
        </span>

        {/* Top inner glass highlight (convex effect) */}
        <div
          className="absolute top-0.5 left-2 right-2 h-[34px] rounded-[34px] pointer-events-none transition-opacity duration-300"
          style={{
            background:
              'linear-gradient(to bottom, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.0) 100%)',
            opacity: isActive && !isDepressed ? 0.6 : isDepressed ? 0.2 : 1,
          }}
        />
      </button>
    </div>
  );
}
