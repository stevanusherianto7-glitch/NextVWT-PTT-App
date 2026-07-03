/**
 * useReactionSounds.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook untuk memutar efek suara reaksi secara lokal menggunakan Web Audio API.
 *
 * Tidak memerlukan file audio eksternal — semua suara di-generate secara
 * programatik menggunakan OscillatorNode dan AudioBufferSourceNode.
 */

import { useCallback, useRef } from 'react';
import { initGlobalAudioContext } from '../utils/audioContext';

// ─── Type ────────────────────────────────────────────────────────────────────

export type SoundReactionKind =
  | 'laugh'
  | 'buzzer'
  | 'drum'
  | 'horn'
  | 'ketawa_nular'
  | 'ketawa_anjay';

// ─── Sound generators (Web Audio API) ────────────────────────────────────────

/**
 * Buat sound "laugh" — cepat, ascending pitch
 */
function playLaugh(ctx: AudioContext, master: GainNode) {
  const times = [0, 0.08, 0.16, 0.24, 0.32];
  times.forEach((t, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(master);

    const freq = 350 + i * 80;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + t + 0.06);

    g.gain.setValueAtTime(0.4, ctx.currentTime + t);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.07);

    osc.type = 'sawtooth';
    osc.start(ctx.currentTime + t);
    osc.stop(ctx.currentTime + t + 0.08);
  });
}

/**
 * Buat sound "buzzer" — low buzz, negatif
 */
function playBuzzer(ctx: AudioContext, master: GainNode) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g);
  g.connect(master);

  osc.type = 'square';
  osc.frequency.setValueAtTime(120, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.4);

  g.gain.setValueAtTime(0.6, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.5);
}

/**
 * Buat sound "drum" — bass kick
 */
function playDrum(ctx: AudioContext, master: GainNode) {
  // Kick body
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g);
  g.connect(master);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(160, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);

  g.gain.setValueAtTime(0.9, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);

  // Snare noise
  const bufLen = Math.floor(ctx.sampleRate * 0.1);
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * 0.3;

  const noise = ctx.createBufferSource();
  const noiseGain = ctx.createGain();
  noise.buffer = buf;
  noise.connect(noiseGain);
  noiseGain.connect(master);
  noiseGain.gain.setValueAtTime(0.3, ctx.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  noise.start(ctx.currentTime);
  noise.stop(ctx.currentTime + 0.1);
}

/**
 * Buat sound "horn" — ascending fanfare
 */
function playHorn(ctx: AudioContext, master: GainNode) {
  const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(master);

    osc.type = 'square';
    osc.frequency.value = freq;

    const start = ctx.currentTime + i * 0.12;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(0.4, start + 0.04);
    g.gain.linearRampToValueAtTime(0.35, start + 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, start + 0.15);

    osc.start(start);
    osc.stop(start + 0.16);
  });
}

/**
 * Buat sound "ketawa_nular" — naik-turun berulang (contagious laugh)
 */
function playKetawaNular(ctx: AudioContext, master: GainNode) {
  const pattern = [440, 480, 420, 500, 400, 520, 380, 540];
  pattern.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(master);

    const t = ctx.currentTime + i * 0.09;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.2, t + 0.07);

    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.start(t);
    osc.stop(t + 0.09);
  });
}

/**
 * Buat sound "ketawa_anjay" — lebih eksplosif, descending
 */
function playKetawaAnjay(ctx: AudioContext, master: GainNode) {
  const pattern = [600, 550, 480, 400, 350];
  pattern.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(master);

    const t = ctx.currentTime + i * 0.07;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + 0.06);

    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.start(t);
    osc.stop(t + 0.08);
  });
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useReactionSounds() {
  const masterGainRef = useRef<GainNode | null>(null);

  const getMasterGain = useCallback((): GainNode | null => {
    const ctx = initGlobalAudioContext();
    if (!ctx) return null;

    if (!masterGainRef.current) {
      const gain = ctx.createGain();
      gain.gain.value = 0.8; // Volume master untuk semua efek suara reaksi
      gain.connect(ctx.destination);
      masterGainRef.current = gain;
    }
    return masterGainRef.current;
  }, []);

  /**
   * Putar efek suara untuk reaksi kategori 'sound'.
   * Dipanggil baik saat MENGIRIM maupun saat MENERIMA reaksi.
   *
   * @param reactionKind - jenis reaksi suara
   */
  const playReactionSound = useCallback(
    (reactionKind: string) => {
      const ctx = initGlobalAudioContext();
      if (!ctx) return;

      // Resume AudioContext jika suspended (wajib setelah user gesture)
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const master = getMasterGain();
      if (!master) return;

      try {
        switch (reactionKind as SoundReactionKind) {
          case 'laugh':
            playLaugh(ctx, master);
            break;
          case 'buzzer':
            playBuzzer(ctx, master);
            break;
          case 'drum':
            playDrum(ctx, master);
            break;
          case 'horn':
            playHorn(ctx, master);
            break;
          case 'ketawa_nular':
            playKetawaNular(ctx, master);
            break;
          case 'ketawa_anjay':
            playKetawaAnjay(ctx, master);
            break;
          default:
            console.warn(`[ReactionSounds] Unknown sound reaction: ${reactionKind}`);
        }
      } catch (err) {
        console.warn('[ReactionSounds] Gagal memutar efek suara:', err);
      }
    },
    [getMasterGain]
  );

  /**
   * Atur volume master untuk semua efek suara reaksi.
   * @param volume 0.0 – 1.0
   */
  const setReactionVolume = useCallback((volume: number) => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = Math.max(0, Math.min(1, volume));
    }
  }, []);

  return { playReactionSound, setReactionVolume };
}
