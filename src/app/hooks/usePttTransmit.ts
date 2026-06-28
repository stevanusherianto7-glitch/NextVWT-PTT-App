import { useState, useEffect } from 'react';
import { usePTTStore } from '../store/usePTTStore';
import { initGlobalAudioContext } from '../utils/audioContext';

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
  let b0 = 0,
    b1 = 0,
    b2 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
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
  const duration = 0.08; // 80ms duration

  const osc = ctx.createOscillator();
  const env = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(1000, t); // Clean 1000Hz tone like IndoVWT

  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(0.38, t + 0.003); // Instant attack
  env.gain.setValueAtTime(0.38, t + duration - 0.01);
  env.gain.exponentialRampToValueAtTime(0.001, t + duration); // Fast release decay

  osc.connect(env);
  env.connect(masterGain);

  osc.start(t);
  osc.stop(t + duration + 0.01);
};

/**
 * Roger Beep + Squelch Tail: the unmistakable end-of-transmission signature
 * of a classic Motorola/Kenwood HT transceiver.
 */
const playReleaseSound = (ctx: AudioContext, masterGain: GainNode) => {
  const t = ctx.currentTime;

  // ── Squelch Tail Open ──────────────────────────────────────────────
  createRadioNoise(ctx, masterGain, 0.2, t, 0.32);

  // ── Roger Beep Sequence ────────────────────────────────────────────
  const rogerTones = [
    { freq: 1450, start: 0.2, dur: 0.085 },
    { freq: 1150, start: 0.31, dur: 0.085 },
    { freq: 1320, start: 0.42, dur: 0.075 },
  ];

  rogerTones.forEach(({ freq, start, dur }) => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    const waveShaper = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = x - (x * x * x) / 4; // soft clip
    }
    waveShaper.curve = curve;

    osc.type = 'sine';
    osc.frequency.value = freq;

    env.gain.setValueAtTime(0, t + start);
    env.gain.linearRampToValueAtTime(0.52, t + start + 0.01);
    env.gain.setValueAtTime(0.52, t + start + dur - 0.015);
    env.gain.exponentialRampToValueAtTime(0.001, t + start + dur);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 8;

    osc.connect(env);
    env.connect(waveShaper);
    waveShaper.connect(bp);
    bp.connect(masterGain);

    osc.start(t + start);
    osc.stop(t + start + dur + 0.01);
  });

  // ── Squelch Tail Close ─────────────────────────────────────────────
  createRadioNoise(ctx, masterGain, 0.06, t + 0.5, 0.18);

  const gateClick = ctx.createOscillator();
  const gateEnv = ctx.createGain();
  gateClick.type = 'sine';
  gateClick.frequency.setValueAtTime(60, t + 0.56);
  gateClick.frequency.exponentialRampToValueAtTime(20, t + 0.6);
  gateEnv.gain.setValueAtTime(0.35, t + 0.56);
  gateEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.61);
  gateClick.connect(gateEnv);
  gateEnv.connect(masterGain);
  gateClick.start(t + 0.56);
  gateClick.stop(t + 0.62);
};

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

interface UsePttTransmitProps {
  onPressStart: () => void;
  onPressEnd: () => void;
  isActive: boolean;
  isBusy: boolean;
}

export function usePttTransmit({
  onPressStart,
  onPressEnd,
  isActive,
  isBusy,
}: UsePttTransmitProps) {
  const [isDepressed, setIsDepressed] = useState(false);

  const isPowerOn = usePTTStore((state) => state.isPowerOn);
  const togglePtt = usePTTStore((state) => state.togglePtt);
  const toneOnStartEnd = usePTTStore((state) => state.toneOnStartEnd);
  const pttVolume = usePTTStore((state) => state.pttVolume);
  const vibrateOnStart = usePTTStore((state) => state.vibrateOnStart);

  const initAudio = () => {
    return initGlobalAudioContext();
  };

  const triggerHaptic = (duration: number) => {
    if (!vibrateOnStart) return;
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try {
        window.navigator.vibrate(duration);
      } catch {
        // Safe fallback
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
    const ctx = initAudio();

    if (!togglePtt && isPowerOn) {
      onPressStart();
      if (ctx) playRadioSound('press', ctx, toneOnStartEnd, pttVolume);
    }
  };

  const handleMouseUp = (e: React.MouseEvent | React.TouchEvent) => {
    if (isBusy) return;
    if (e.type === 'touchend') {
      e.preventDefault();
    }

    const ctx = initAudio();
    if (isDepressed && isPowerOn) {
      if (togglePtt) {
        const nextState = !isActive;
        if (nextState) {
          onPressStart();
          if (ctx) playRadioSound('press', ctx, toneOnStartEnd, pttVolume);
        } else {
          onPressEnd();
          if (ctx) playRadioSound('release', ctx, toneOnStartEnd, pttVolume);
        }
      } else {
        onPressEnd();
        if (ctx) playRadioSound('release', ctx, toneOnStartEnd, pttVolume);
      }
      triggerHaptic(10);
    }
    setIsDepressed(false);
  };

  const handleMouseLeave = () => {
    if (isBusy) return;
    const ctx = initAudio();
    if (isDepressed && isPowerOn) {
      if (!togglePtt) {
        onPressEnd();
        if (ctx) playRadioSound('release', ctx, toneOnStartEnd, pttVolume);
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
        e.preventDefault();
        if (!isPowerOn || isBusy) return;
        setIsDepressed(true);
        triggerHaptic(15);
        const ctx = initAudio();

        if (!togglePtt) {
          onPressStart();
          if (ctx) playRadioSound('press', ctx, toneOnStartEnd, pttVolume);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!isPowerOn || isBusy) return;

        const ctx = initAudio();
        if (isDepressed) {
          if (togglePtt) {
            const nextState = !isActive;
            if (nextState) {
              onPressStart();
              if (ctx) playRadioSound('press', ctx, toneOnStartEnd, pttVolume);
            } else {
              onPressEnd();
              if (ctx) playRadioSound('release', ctx, toneOnStartEnd, pttVolume);
            }
          } else {
            onPressEnd();
            if (ctx) playRadioSound('release', ctx, toneOnStartEnd, pttVolume);
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

  return {
    isDepressed,
    handleMouseDown,
    handleMouseUp,
    handleMouseLeave,
  };
}
