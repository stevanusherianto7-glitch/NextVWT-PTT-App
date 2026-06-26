/**
 * src/app/hooks/useWebRTC.test.ts
 * Unit tests untuk WebRTC Signaling hook
 *
 * Tests memverifikasi:
 *   1. ICE candidate queuing sebelum remoteDescription tersedia
 *   2. ICE candidate draining setelah remoteDescription di-set
 *   3. handleSignaling offer → creates answer dan broadcasts kembali
 *   4. handleSignaling answer → memanggil setRemoteDescription
 *   5. handleSignaling skip jika targetUserId bukan userId kita
 *   6. handleSignaling skip jika channel === BRAND.isolatedChannels[0] (isolated channel)
 *   7. cleanupPeer menutup PeerConnection dan membersihkan audio element
 *   8. cleanupAllPeers membersihkan semua peers sekaligus
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebRTC } from './useWebRTC';
import { usePTTStore } from '../store/usePTTStore';
import type { WebRTCSignalingPayload } from '../store/usePTTStore';
import { BRAND } from '../utils/config';

vi.mock('../utils/supabase', () => {
  const mockSupabase = {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      track: vi.fn(() => Promise.resolve()),
      send: vi.fn(() => Promise.resolve()),
      subscribe: vi.fn((cb) => {
        cb?.('SUBSCRIBED');
        return { unsubscribe: vi.fn() };
      }),
      unsubscribe: vi.fn(),
    })),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ order: vi.fn(() => Promise.resolve({ data: [], error: null })) })),
    })),
  };

  return {
    supabase: mockSupabase,
    getSupabase: vi.fn(() => Promise.resolve(mockSupabase)),
  };
});

// ─── Mock secureConfig ────────────────────────────────────────────────────────
vi.mock('../utils/secureConfig', () => ({
  getCachedConfig: vi.fn(() => ({
    turnUsername: '',
    turnCredential: '',
    turnUrls: [],
  })),
  getSecureConfig: vi.fn(() =>
    Promise.resolve({
      turnUsername: '',
      turnCredential: '',
      turnUrls: [],
    })
  ),
}));

// ─── Mock localStorage ────────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((k: string) => store[k] ?? null),
    setItem: vi.fn((k: string, v: string) => {
      store[k] = v;
    }),
    removeItem: vi.fn((k: string) => {
      delete store[k];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// ─── Mock RTCPeerConnection ───────────────────────────────────────────────────
// jsdom tidak mengimplementasikan WebRTC
let mockPc: {
  connectionState: string;
  remoteDescription: RTCSessionDescriptionInit | null;
  addTrack: ReturnType<typeof vi.fn>;
  addIceCandidate: ReturnType<typeof vi.fn>;
  setRemoteDescription: ReturnType<typeof vi.fn>;
  setLocalDescription: ReturnType<typeof vi.fn>;
  createAnswer: ReturnType<typeof vi.fn>;
  createOffer: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null;
  ontrack: ((event: RTCTrackEvent) => void) | null;
  onconnectionstatechange: (() => void) | null;
};

const createMockPc = () => {
  mockPc = {
    connectionState: 'connected',
    remoteDescription: null,
    addTrack: vi.fn(),
    addIceCandidate: vi.fn(() => Promise.resolve()),
    setRemoteDescription: vi.fn(() => {
      mockPc.remoteDescription = { type: 'offer', sdp: 'mock-sdp' };
      return Promise.resolve();
    }),
    setLocalDescription: vi.fn(() => Promise.resolve()),
    createAnswer: vi.fn(() =>
      Promise.resolve({ type: 'answer', sdp: 'mock-answer-sdp' } as RTCSessionDescriptionInit)
    ),
    createOffer: vi.fn(() =>
      Promise.resolve({ type: 'offer', sdp: 'mock-offer-sdp' } as RTCSessionDescriptionInit)
    ),
    close: vi.fn(),
    onicecandidate: null,
    ontrack: null,
    onconnectionstatechange: null,
  };

  // KRITIS: RTCPeerConnection harus di-mock sebagai class constructor
  // Gunakan function biasa, bukan arrow function agar bisa di-new
  const MockRTCPeerConnection = vi.fn().mockImplementation(function () {
    return mockPc;
  });
  Object.defineProperty(globalThis, 'RTCPeerConnection', {
    value: MockRTCPeerConnection,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(globalThis, 'RTCSessionDescription', {
    value: vi.fn().mockImplementation(function (init) {
      return init;
    }),
    writable: true,
    configurable: true,
  });

  Object.defineProperty(globalThis, 'RTCIceCandidate', {
    value: vi.fn().mockImplementation(function (init) {
      return init;
    }),
    writable: true,
    configurable: true,
  });
};

// ─── Helper: buat hook dengan setup yang dibutuhkan ──────────────────────────
const MY_USER_ID = 'user-local-001';
const PEER_USER_ID = 'user-peer-002';

function setupHook() {
  const mockSilentTrack = {
    track: null as MediaStreamTrack | null,
    stream: null as MediaStream | null,
  };
  const getSilentTrack = vi.fn(() => mockSilentTrack);
  const streamRef = { current: null as MediaStream | null };

  const { result } = renderHook(() => useWebRTC(getSilentTrack, streamRef));

  return { result, getSilentTrack, streamRef };
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('useWebRTC', () => {
  beforeEach(() => {
    localStorageMock.clear();
    createMockPc();

    // Set store state
    usePTTStore.setState({
      userId: MY_USER_ID,
      channelNumber: 16,
      isTransmitting: false,
      pttVolume: 80,
      audioMode: 'discussion',
      broadcastWebRTCSignaling: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should expose all required WebRTC functions', () => {
    const { result } = setupHook();

    expect(result.current.createPeerConnection).toBeInstanceOf(Function);
    expect(result.current.cleanupPeer).toBeInstanceOf(Function);
    expect(result.current.cleanupAllPeers).toBeInstanceOf(Function);
    expect(result.current.handleSignaling).toBeInstanceOf(Function);
    expect(result.current.peerConnectionsRef).toBeDefined();
    expect(result.current.audioElementsRef).toBeDefined();
    expect(result.current.candidatesQueueRef).toBeDefined();
  });

  it('should create RTCPeerConnection when createPeerConnection is called', () => {
    const { result } = setupHook();

    act(() => {
      result.current.createPeerConnection(PEER_USER_ID);
    });

    expect(RTCPeerConnection).toHaveBeenCalled();
    expect(result.current.peerConnectionsRef.current.has(PEER_USER_ID)).toBe(true);
  });

  it('should return existing peer connection without creating new one (idempotent)', () => {
    const { result } = setupHook();

    act(() => {
      result.current.createPeerConnection(PEER_USER_ID);
      result.current.createPeerConnection(PEER_USER_ID); // panggil dua kali
    });

    // RTCPeerConnection hanya boleh dibuat sekali
    expect(RTCPeerConnection).toHaveBeenCalledTimes(1);
    expect(result.current.peerConnectionsRef.current.size).toBe(1);
  });

  it('should queue ICE candidates when remoteDescription is not yet set', async () => {
    const { result } = setupHook();

    // Pastikan remoteDescription null
    mockPc.remoteDescription = null;

    const candidatePayload: WebRTCSignalingPayload = {
      senderUserId: PEER_USER_ID,
      targetUserId: MY_USER_ID,
      type: 'candidate',
      data: { candidate: 'mock-ice-candidate', sdpMid: '0', sdpMLineIndex: 0 },
    };

    await act(async () => {
      await result.current.handleSignaling(candidatePayload);
    });

    // Kandidat harus di-queue, bukan langsung di-add
    expect(mockPc.addIceCandidate).not.toHaveBeenCalled();
    const queue = result.current.candidatesQueueRef.current.get(PEER_USER_ID);
    expect(queue).toBeDefined();
    expect(queue?.length).toBe(1);
  });

  it('should add ICE candidate directly when remoteDescription is available', async () => {
    const { result } = setupHook();

    // Buat peer connection dulu
    act(() => {
      result.current.createPeerConnection(PEER_USER_ID);
    });

    // Set remoteDescription agar tersedia
    mockPc.remoteDescription = { type: 'offer', sdp: 'sdp' };

    const candidatePayload: WebRTCSignalingPayload = {
      senderUserId: PEER_USER_ID,
      targetUserId: MY_USER_ID,
      type: 'candidate',
      data: { candidate: 'ice-candidate-data', sdpMid: '0', sdpMLineIndex: 0 },
    };

    await act(async () => {
      await result.current.handleSignaling(candidatePayload);
    });

    expect(mockPc.addIceCandidate).toHaveBeenCalled();
  });

  it('should handle offer: create answer and broadcast signaling', async () => {
    const broadcastFn = vi.fn();
    usePTTStore.setState({ broadcastWebRTCSignaling: broadcastFn });

    const { result } = setupHook();

    const offerPayload: WebRTCSignalingPayload = {
      senderUserId: PEER_USER_ID,
      targetUserId: MY_USER_ID,
      type: 'offer',
      data: { type: 'offer', sdp: 'mock-offer-sdp' },
    };

    await act(async () => {
      await result.current.handleSignaling(offerPayload);
    });

    // setRemoteDescription harus dipanggil dengan offer
    expect(mockPc.setRemoteDescription).toHaveBeenCalled();
    // createAnswer harus dipanggil
    expect(mockPc.createAnswer).toHaveBeenCalled();
    // setLocalDescription dengan answer
    expect(mockPc.setLocalDescription).toHaveBeenCalled();
    // Broadcast answer kembali ke peer
    expect(broadcastFn).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'answer',
        targetUserId: PEER_USER_ID,
        senderUserId: MY_USER_ID,
      })
    );
  });

  it('should handle answer: call setRemoteDescription on existing peer', async () => {
    const { result } = setupHook();

    // Buat peer connection dulu
    act(() => {
      result.current.createPeerConnection(PEER_USER_ID);
    });

    const answerPayload: WebRTCSignalingPayload = {
      senderUserId: PEER_USER_ID,
      targetUserId: MY_USER_ID,
      type: 'answer',
      data: { type: 'answer', sdp: 'mock-answer-sdp' },
    };

    await act(async () => {
      await result.current.handleSignaling(answerPayload);
    });

    expect(mockPc.setRemoteDescription).toHaveBeenCalled();
  });

  it('should skip signaling when targetUserId does not match local userId', async () => {
    const { result } = setupHook();

    const payload: WebRTCSignalingPayload = {
      senderUserId: PEER_USER_ID,
      targetUserId: 'other-user-999', // bukan MY_USER_ID
      type: 'offer',
      data: { type: 'offer', sdp: 'sdp' },
    };

    await act(async () => {
      await result.current.handleSignaling(payload);
    });

    // Tidak boleh membuat PeerConnection untuk sinyal yang bukan milik kita
    expect(RTCPeerConnection).not.toHaveBeenCalled();
    expect(mockPc.setRemoteDescription).not.toHaveBeenCalled();
  });

  it('should skip signaling when channelNumber === BRAND.isolatedChannels[0] (isolated channel)', async () => {
    usePTTStore.setState({ channelNumber: BRAND.isolatedChannels[0] });
    const { result } = setupHook();

    const payload: WebRTCSignalingPayload = {
      senderUserId: PEER_USER_ID,
      targetUserId: MY_USER_ID,
      type: 'offer',
      data: { type: 'offer', sdp: 'sdp' },
    };

    await act(async () => {
      await result.current.handleSignaling(payload);
    });

    expect(RTCPeerConnection).not.toHaveBeenCalled();
  });

  it('should close PeerConnection and cleanup audio element when cleanupPeer is called', () => {
    const { result } = setupHook();

    act(() => {
      result.current.createPeerConnection(PEER_USER_ID);
    });

    expect(result.current.peerConnectionsRef.current.has(PEER_USER_ID)).toBe(true);

    act(() => {
      result.current.cleanupPeer(PEER_USER_ID);
    });

    expect(mockPc.close).toHaveBeenCalled();
    expect(result.current.peerConnectionsRef.current.has(PEER_USER_ID)).toBe(false);
    expect(result.current.candidatesQueueRef.current.has(PEER_USER_ID)).toBe(false);
  });

  it('should cleanup all peers when cleanupAllPeers is called', () => {
    const { result } = setupHook();

    // Buat dua peer connections
    act(() => {
      result.current.createPeerConnection(PEER_USER_ID);
    });

    // Mock PeerConnection kedua
    const mockPc2 = { ...mockPc, close: vi.fn() };
    (RTCPeerConnection as unknown as import('vitest').Mock).mockImplementationOnce(function () {
      return mockPc2;
    });

    act(() => {
      result.current.createPeerConnection('another-peer-003');
    });

    act(() => {
      result.current.cleanupAllPeers();
    });

    // Semua peer connections harus dibersihkan
    expect(result.current.peerConnectionsRef.current.size).toBe(0);
    expect(result.current.audioElementsRef.current.size).toBe(0);
    expect(result.current.candidatesQueueRef.current.size).toBe(0);
  });

  it('should drain queued ICE candidates after offer sets remoteDescription', async () => {
    const { result } = setupHook();

    // 1. Simulasikan candidate datang sebelum offer (queue)
    const candidatePayload: WebRTCSignalingPayload = {
      senderUserId: PEER_USER_ID,
      targetUserId: MY_USER_ID,
      type: 'candidate',
      data: { candidate: 'early-candidate', sdpMid: '0', sdpMLineIndex: 0 },
    };

    await act(async () => {
      await result.current.handleSignaling(candidatePayload);
    });

    // Kandidat harus di-queue (belum ada peer connection dengan remoteDescription)
    const queueBeforeOffer = result.current.candidatesQueueRef.current.get(PEER_USER_ID);
    expect(queueBeforeOffer?.length).toBe(1);

    // 2. Sekarang offer datang → harus drain queue
    const offerPayload: WebRTCSignalingPayload = {
      senderUserId: PEER_USER_ID,
      targetUserId: MY_USER_ID,
      type: 'offer',
      data: { type: 'offer', sdp: 'sdp' },
    };

    await act(async () => {
      await result.current.handleSignaling(offerPayload);
    });

    // Queue harus sudah di-drain dan addIceCandidate dipanggil untuk early candidate
    expect(mockPc.addIceCandidate).toHaveBeenCalledTimes(1);
    // Queue harus kosong setelah drain
    expect(result.current.candidatesQueueRef.current.has(PEER_USER_ID)).toBe(false);
  });
});
