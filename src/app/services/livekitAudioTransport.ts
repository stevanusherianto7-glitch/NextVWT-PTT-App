import {
  Room,
  Track,
  LocalAudioTrack,
  createLocalAudioTrack,
  type RemoteParticipant,
  type LocalParticipant,
} from 'livekit-client';
import type { AudioTransport } from './audioTransport';

/** Snapshot user dari LiveKit room (presence SFU). */
export interface SfuPresenceUser {
  userId: string;
  displayName: string;
  callSign: string;
  location: string;
  isLocal: boolean;
}

/**
 * LiveKitAudioTransport — implementasi SFU dari `AudioTransport`.
 *
 * Topologi: client publish 1 audio track, subscribe track semua participant lain.
 * Offload bandwidth ke server LiveKit.
 *
 * Integrasi:
 * - Task 5+: `useSfuTransport` hook mengelola lifecycle connect/disconnect
 * - Task 9: `setMicEnabled` dipanggil via useEffect di `useSfuTransport`
 * - Task 12: presence diisi dari `Room.participants` via `onPresence` callback
 *
 * Catatan keamanan: token HARUS di-generate di server (Supabase Edge Function),
 * tidak pernah di-bundle ke client (lihat PRD §7.2 AD-1, SECURITY.md).
 */
export class LiveKitAudioTransport implements AudioTransport {
  private room: Room;
  private localTrack: LocalAudioTrack | null = null;
  private remoteCb: ((userId: string, stream: MediaStream) => void) | null = null;
  private presenceCb: ((users: SfuPresenceUser[]) => void) | null = null;
  private readonly url: string;

  constructor(url: string) {
    this.url = url;
    this.room = new Room({
      // Audio-only: matikan fitur video/kamera
      adaptiveStream: false,
      dynacast: false,
    });
    this.wireParticipantEvents();
  }

  async connect(_roomId: string, token: string): Promise<void> {
    if (!this.url) throw new Error('[LiveKit] VITE_LIVEKIT_URL kosong — SFU tidak aktif');
    await this.room.connect(this.url, token, {
      // autoSubscribe: terima track audio semua participant
      autoSubscribe: true,
    });
  }

  disconnect(): void {
    this.room.disconnect();
    this.localTrack = null;
  }

  async publishMic(track: MediaStreamTrack): Promise<void> {
    // Bungkus MediaStreamTrack mentah ke LocalAudioTrack LiveKit via constructor resmi.
    this.localTrack = new LocalAudioTrack(track);
    if (this.localTrack.source === undefined) {
      // source informational; set ke Microphone bila belum
      try {
        (this.localTrack as unknown as { source: Track.Source }).source = Track.Source.Microphone;
      } catch {
        /* source read-only di beberapa versi — tidak kritis */
      }
    }
    await this.room.localParticipant.publishTrack(this.localTrack);
    // Default: mic mati sampai user TX (PTT). Diatur via setMicEnabled.
    this.localTrack.mute();
  }

  setMicEnabled(enabled: boolean): void {
    if (this.localTrack) {
      if (enabled) this.localTrack.unmute();
      else this.localTrack.mute();
    }
  }

  onRemoteAudio(cb: (userId: string, stream: MediaStream) => void): void {
    this.remoteCb = cb;
  }

  /**
   * Daftarkan callback presence (Task 12). Emit list user dari LiveKit room
   * (local + remote participants) saat connect & tiap ada perubahan.
   */
  onPresence(cb: (users: SfuPresenceUser[]) => void): void {
    this.presenceCb = cb;
  }

  private emitPresence(): void {
    if (!this.presenceCb) return;
    const local = this.room.localParticipant as LocalParticipant;
    const list: SfuPresenceUser[] = [
      {
        userId: local.identity,
        displayName: local.name || local.identity,
        callSign: '',
        location: '',
        isLocal: true,
      },
      ...Array.from(this.room.remoteParticipants.values()).map((p: RemoteParticipant) => ({
        userId: p.identity,
        displayName: p.name || p.identity,
        callSign: '',
        location: '',
        isLocal: false,
      })),
    ];
    this.presenceCb(list);
  }

  onLocalChunk(_cb: (base64: string) => void): void {
    // SFU mengalirkan audio via track, bukan base64 chunk.
    // Callback sengaja tidak dipanggil (no-op) — mesh yang pakai base64.
  }

  // ── Internal ────────────────────────────────────────────────────────────────
  private wireParticipantEvents(): void {
    this.room
      .on('trackSubscribed', (track, _publication, participant) => {
        if (track.kind !== Track.Kind.Audio) return;
        const stream = new MediaStream([track.mediaStreamTrack]);
        this.remoteCb?.(participant.identity, stream);
      })
      .on('participantConnected', () => {
        this.emitPresence();
      })
      .on('participantDisconnected', () => {
        this.emitPresence();
      });
  }

  /** Panggil setelah connect berhasil untuk emit presence awal. */
  emitInitialPresence(): void {
    this.emitPresence();
  }
}

/**
 * Factory: buat transport SFU dari URL konfigurasi.
 * Mengembalikan null bila SFU tidak dikonfigurasi (panggil mesh sebagai gantinya).
 */
export function createLiveKitTransport(livekitUrl: string): LiveKitAudioTransport | null {
  if (!livekitUrl) return null;
  return new LiveKitAudioTransport(livekitUrl);
}

// Re-export helper untuk membuat mic track bila diperlukan nanti.
export { createLocalAudioTrack };
