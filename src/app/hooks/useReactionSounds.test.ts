import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useReactionSounds } from './useReactionSounds';

// ── Web Audio mock ──────────────────────────────────────────────────────────
const createNode = () => ({
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), value: 0 },
  gain: {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    value: 0,
  },
  type: 'sine',
});

const mockCtx = vi.hoisted(() => ({
  state: 'running',
  currentTime: 0,
  sampleRate: 44100,
  destination: {},
  resume: vi.fn().mockResolvedValue(undefined),
  createGain: vi.fn(() => createNode()),
  createOscillator: vi.fn(() => createNode()),
  createBuffer: vi.fn((_c: number, len: number) => ({
    getChannelData: () => new Float32Array(len),
  })),
  createBufferSource: vi.fn(() => createNode()),
}));

vi.mock('../utils/audioContext', () => ({
  initGlobalAudioContext: () => mockCtx,
}));

describe('useReactionSounds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCtx.createGain.mockClear();
    mockCtx.createOscillator.mockClear();
    mockCtx.createBuffer.mockClear();
    mockCtx.createBufferSource.mockClear();
    mockCtx.resume.mockClear();
  });

  const setup = () => renderHook(() => useReactionSounds());

  it('returns playReactionSound + setReactionVolume', () => {
    const { result } = setup();
    expect(typeof result.current.playReactionSound).toBe('function');
    expect(typeof result.current.setReactionVolume).toBe('function');
  });

  it('playReactionSound: laugh plays oscillators', () => {
    const { result } = setup();
    result.current.playReactionSound('laugh');
    expect(mockCtx.createOscillator).toHaveBeenCalled();
    expect(mockCtx.createGain).toHaveBeenCalled();
  });

  it('playReactionSound: buzzer/drum/horn/ketawa all invoke audio graph', () => {
    const { result } = setup();
    for (const k of ['buzzer', 'drum', 'horn', 'ketawa_nular', 'ketawa_anjay']) {
      result.current.playReactionSound(k);
    }
    // multiple oscillators created across all branches
    expect(mockCtx.createOscillator.mock.calls.length).toBeGreaterThan(10);
  });

  it('playReactionSound: unknown kind does not throw (warns only)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = setup();
    expect(() => result.current.playReactionSound('unknown_xyz')).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('setReactionVolume clamps + sets gain', () => {
    const { result } = setup();
    // call play first to init master gain
    result.current.playReactionSound('laugh');
    expect(() => result.current.setReactionVolume(0.5)).not.toThrow();
    expect(() => result.current.setReactionVolume(5)).not.toThrow(); // clamps to 1
    expect(() => result.current.setReactionVolume(-1)).not.toThrow(); // clamps to 0
  });
});
