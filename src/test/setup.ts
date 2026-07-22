import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll } from 'vitest';

// Mock Capacitor (not available in jsdom)
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => 'web'),
  },
  registerPlugin: vi.fn(() => ({
    startBackgroundService: vi.fn(() => Promise.resolve()),
    stopBackgroundService: vi.fn(() => Promise.resolve()),
  })),
}));

// Mock Supabase client
vi.mock('@/app/utils/supabase', () => {
  const mockChannel = {
    on: vi.fn(() => mockChannel),
    track: vi.fn(() => Promise.resolve()),
    send: vi.fn(() => Promise.resolve()),
    subscribe: vi.fn((callback) => {
      if (callback) callback('SUBSCRIBED');
      return {
        unsubscribe: vi.fn(),
      };
    }),
    unsubscribe: vi.fn(),
  };

  const mockSupabase = {
    channel: vi.fn(() => mockChannel),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
    auth: {
      getUser: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  };

  return {
    supabase: mockSupabase,
    getSupabase: vi.fn(() => Promise.resolve(mockSupabase)),
  };
});

// Mock WebRTC APIs
global.RTCPeerConnection = vi.fn(() => ({
  createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
  createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' }),
  setLocalDescription: vi.fn().mockResolvedValue(undefined),
  setRemoteDescription: vi.fn().mockResolvedValue(undefined),
  addIceCandidate: vi.fn().mockResolvedValue(undefined),
  addTrack: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  connectionState: 'new',
  iceConnectionState: 'new',
})) as unknown as typeof RTCPeerConnection;

// Mock MediaDevices / getUserMedia
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: vi.fn(() => [{ stop: vi.fn(), kind: 'audio' }]),
      getAudioTracks: vi.fn(() => [{ stop: vi.fn(), enabled: true }]),
    }),
    enumerateDevices: vi
      .fn()
      .mockResolvedValue([
        { kind: 'audioinput', deviceId: 'default', label: 'Default Microphone' },
      ]),
  },
  configurable: true,
});

// Mock AudioContext as a proper class (supports `new` keyword in audioContext.ts)
class MockAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  createMediaStreamSource = vi.fn(() => ({ connect: vi.fn() }));
  createAnalyser = vi.fn(() => ({
    connect: vi.fn(),
    getByteFrequencyData: vi.fn(),
    frequencyBinCount: 128,
  }));
  createOscillator = vi.fn(() => ({
    type: 'sine' as OscillatorType,
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }));
  createGain = vi.fn(() => ({
    gain: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  }));
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn();
}

global.AudioContext = MockAudioContext as unknown as typeof AudioContext;

// Mock ResizeObserver (jsdom lacks it; Radix Slider/ScrollArea need it)
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// jsdom lacks scrollIntoView (cmdk/Radix use it)
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

// Silence console.error for expected errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning:')) return;
    originalError(...args);
  };
});
afterAll(() => {
  console.error = originalError;
});
