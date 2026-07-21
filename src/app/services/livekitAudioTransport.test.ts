/**
 * src/app/services/livekitAudioTransport.test.ts
 * Unit tests untuk LiveKitAudioTransport (komponen integrasi SFU).
 *
 * Verifikasi:
 *  1. connect() memanggil room.connect dengan url + token.
 *  2. publishMic() publish track & default mute (PTT off).
 *  3. setMicEnabled(true/false) → unmute()/mute().
 *  4. onRemoteAudio dipanggil saat trackSubscribed event (audio).
 *  5. disconnect() → room.disconnect().
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockConnect = vi.fn(() => Promise.resolve());
const mockDisconnect = vi.fn();
const mockPublishTrack = vi.fn(() => Promise.resolve());
const mockMute = vi.fn();
const mockUnmute = vi.fn();
const mockOn = vi.fn();

const mockRoom: any = {
  connect: mockConnect,
  disconnect: mockDisconnect,
  localParticipant: { identity: 'local-user', name: 'Me', publishTrack: mockPublishTrack },
  remoteParticipants: new Map(),
  on: (...args: unknown[]) => {
    mockOn(...args);
    return mockRoom;
  },
  name: 'room',
};

vi.mock('livekit-client', () => {
  class FakeLocalAudioTrack {
    muted = false;
    source = 'microphone';
    constructor(public mediaStreamTrack: MediaStreamTrack) {}
    mute() {
      this.muted = true;
      mockMute();
    }
    unmute() {
      this.muted = false;
      mockUnmute();
    }
  }
  return {
    Room: class {
      constructor() {
        return mockRoom;
      }
    },
    Track: { Kind: { Audio: 'audio', Video: 'video' }, Source: { Microphone: 'microphone' } },
    LocalAudioTrack: FakeLocalAudioTrack,
    createLocalAudioTrack: vi.fn(),
  };
});

import { LiveKitAudioTransport } from './livekitAudioTransport';

// Polyfill minimal untuk node test env (browser punya MediaStream global)
class FakeMediaStream {
  constructor(public tracks: MediaStreamTrack[]) {}
}
(globalThis as unknown as { MediaStream: typeof FakeMediaStream }).MediaStream = FakeMediaStream;

describe('LiveKitAudioTransport', () => {
  beforeEach(() => {
    mockConnect.mockClear();
    mockDisconnect.mockClear();
    mockPublishTrack.mockClear();
    mockOn.mockClear();
    mockMute.mockClear();
    mockUnmute.mockClear();
  });

  it('connect memanggil room.connect dengan url + token', async () => {
    const t = new LiveKitAudioTransport('wss://sfu.example.com');
    await t.connect('ptt-room-1', 'jwt-token');
    expect(mockConnect).toHaveBeenCalledWith('wss://sfu.example.com', 'jwt-token', {
      autoSubscribe: true,
    });
  });

  it('publishMic publish track & default mute (PTT off)', async () => {
    const t = new LiveKitAudioTransport('wss://sfu.example.com');
    const fakeTrack = {} as MediaStreamTrack;
    await t.publishMic(fakeTrack);
    expect(mockPublishTrack).toHaveBeenCalled();
    expect(mockMute).toHaveBeenCalled(); // default muted
  });

  it('setMicEnabled(true) → unmute(), false → mute()', async () => {
    const t = new LiveKitAudioTransport('wss://sfu.example.com');
    await t.publishMic({} as MediaStreamTrack); // perlu track dulu
    t.setMicEnabled(true);
    expect(mockUnmute).toHaveBeenCalled();
    t.setMicEnabled(false);
    expect(mockMute).toHaveBeenCalledTimes(2); // default + explicit
  });

  it('onRemoteAudio dipanggil saat trackSubscribed (audio)', () => {
    const t = new LiveKitAudioTransport('wss://sfu.example.com');
    const cb = vi.fn();
    t.onRemoteAudio(cb);

    // Simulasikan event trackSubscribed yang di-wire di constructor
    const trackSubscribedCall = mockOn.mock.calls.find((c) => c[0] === 'trackSubscribed');
    expect(trackSubscribedCall).toBeTruthy();

    const fakeTrack = { kind: 'audio' as const, mediaStreamTrack: {} as MediaStreamTrack };
    const fakeParticipant = { identity: 'user-xyz' };
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    trackSubscribedCall![1](fakeTrack, {}, fakeParticipant);

    expect(cb).toHaveBeenCalledWith('user-xyz', expect.any(MediaStream));
  });

  it('onLocalChunk no-op (SFU tidak pakai base64)', () => {
    const t = new LiveKitAudioTransport('wss://sfu.example.com');
    expect(() => t.onLocalChunk(() => undefined)).not.toThrow();
  });

  it('disconnect → room.disconnect()', () => {
    const t = new LiveKitAudioTransport('wss://sfu.example.com');
    t.disconnect();
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('onPresence emit list dari participants (local + remote)', () => {
    const t = new LiveKitAudioTransport('wss://sfu.example.com');
    const cb = vi.fn();
    t.onPresence(cb);

    // Simulasikan participantConnected yang di-wire di constructor
    const connCall = mockOn.mock.calls.find((c) => c[0] === 'participantConnected');
    expect(connCall).toBeTruthy();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    connCall![1](); // trigger emitPresence

    expect(cb).toHaveBeenCalled();
    const list = cb.mock.calls[0][0] as Array<{ userId: string; isLocal: boolean }>;
    // minimal ada local participant
    expect(list.some((u) => u.isLocal)).toBe(true);
  });
});
