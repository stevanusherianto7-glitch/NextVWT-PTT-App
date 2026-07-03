# Agent Prompt — NextVWT Full Infrastructure Testing Suite

> **Cara pakai:** Paste prompt ini ke Claude Code, Cursor Agent, atau AI coding
> agent lain yang punya akses penuh ke root folder project NextVWT.
> Jalankan dari root direktori project. Baca seluruh prompt sebelum memulai.

---

## KONTEKS & TUJUAN

Kamu adalah QA Engineer senior yang ditugaskan **memastikan seluruh infrastruktur
codebase NextVWT berfungsi robust, tidak ada error, dan siap deploy ke VPS
Biznet Gio Jakarta**.

NextVWT adalah aplikasi PTT (Push-to-Talk) walkie-talkie berbasis:
- **Frontend:** React 18 + TypeScript + Zustand v5 + Vite 6 + Tailwind 4
- **Backend:** Supabase Realtime + Supabase Edge Functions + PostgreSQL RLS
- **Audio/Voice:** WebRTC (RTCPeerConnection) + MediaRecorder + Web Audio API
- **Mobile:** Capacitor 8 (Android)
- **Validation:** Zod v4 pada setiap realtime payload
- **Test runners:** Vitest (unit/integration) + Playwright (E2E)

**Test yang sudah ada (jangan dihapus, hanya diperluas):**
- `src/app/hooks/useWebRTC.test.ts`
- `src/app/hooks/useAudioStreamer.test.ts`
- `src/app/hooks/useAudioPlayback.test.ts`
- `src/app/hooks/useVAD.test.ts`
- `src/app/store/usePTTStore.test.ts`
- `src/app/utils/rateLimiter.test.ts`
- `src/features/moderation/permissions.test.ts`
- `e2e/*.spec.ts` (13 file Playwright)

**Stack test:**
```bash
pnpm test                    # Vitest unit/integration (watch mode)
pnpm test --run              # Vitest single run
pnpm test --coverage         # Vitest + coverage report
pnpm test:e2e:playwright     # Playwright E2E
```

---

## FASE 0 — ORIENTASI & BASELINE

Sebelum menulis satu baris test baru, lakukan langkah berikut secara berurutan.

### 0.1 Jalankan semua test yang sudah ada

```bash
pnpm test --run --reporter=verbose 2>&1 | tee /tmp/test-baseline.txt
cat /tmp/test-baseline.txt
```

Catat persis:
- Jumlah test yang **pass / fail / skip**
- **Error message** lengkap dari test yang fail
- File mana yang menyebabkan fail

### 0.2 Jalankan coverage baseline

```bash
pnpm test --run --coverage 2>&1 | tee /tmp/coverage-baseline.txt
cat /tmp/coverage-baseline.txt
```

Catat file mana yang coverage-nya di bawah threshold 70%.

### 0.3 Jalankan E2E baseline

```bash
# Pastikan dev server berjalan di terminal terpisah terlebih dahulu
# pnpm dev &
pnpm test:e2e:playwright --reporter=list 2>&1 | tee /tmp/e2e-baseline.txt
cat /tmp/e2e-baseline.txt
```

### 0.4 Buat test inventory sebelum mulai

Buat tabel ini berdasarkan hasil Fase 0 sebelum lanjut:

| File test | Jumlah test | Pass | Fail | Area yang dicover |
|-----------|-------------|------|------|-------------------|
| permissions.test.ts | ? | ? | ? | Role hierarchy |
| usePTTStore.test.ts | ? | ? | ? | Store state |
| useWebRTC.test.ts | ? | ? | ? | Signaling, ICE |
| useAudioStreamer.test.ts | ? | ? | ? | MediaRecorder |
| useAudioPlayback.test.ts | ? | ? | ? | Playback |
| useVAD.test.ts | ? | ? | ? | Voice activity |
| rateLimiter.test.ts | ? | ? | ? | Rate limiting |
| e2e (13 spec) | ? | ? | ? | UI flow |

**Laporkan hasil Fase 0 sebelum melanjutkan ke Fase 1.**

---

## FASE 1 — UNIT TESTS: CORE BUSINESS LOGIC

### 1.1 Zod Schema Validation Tests

**File baru:** `src/app/store/schemas/realtimePayloads.test.ts`

Baca `src/app/store/schemas/realtimePayloads.ts` terlebih dahulu.
Tulis test untuk setiap schema yang ada menggunakan pattern berikut:

```ts
import { describe, it, expect } from 'vitest';
import {
  PttStatePayloadSchema,
  VoiceChunkPayloadSchema,
  WebRTCSignalingPayloadSchema,
  HangUpPayloadSchema,
  KickPayloadSchema,
  ReactionPayloadSchema,
  PresenceMetaSchema,
  UpdateRolePayloadSchema,
  UpdateStatusPayloadSchema,
  safeParseRealtimePayload,
} from './realtimePayloads';

// ─── Helper ────────────────────────────────────────────────────────────────
const validPttPayload = {
  userId: 'user-abc-123',
  displayName: 'Anto Bandung',
  callSign: 'ANTA1',
  isTransmitting: true,
};
```

**Test cases yang wajib ditulis:**

```
PttStatePayloadSchema:
  ✓ payload lengkap valid → sukses
  ✓ field role opsional → sukses tanpa role
  ✓ userId string kosong '' → gagal (min 1)
  ✓ userId > 200 karakter → gagal
  ✓ displayName > 100 karakter → gagal
  ✓ callSign lowercase 'ab1' → gagal (harus UPPERCASE atau pattern /^[A-Z0-9]{2,8}$/)
  ✓ callSign > 8 karakter → gagal
  ✓ isTransmitting bukan boolean (string 'true') → gagal
  ✓ timestamp negatif → terima (tidak ada constraint positif)
  ✓ role nilai tidak valid 'admin' → gagal

VoiceChunkPayloadSchema:
  ✓ base64 valid → sukses
  ✓ base64 kosong '' → gagal (min 1)
  ✓ base64 > 1_100_000 karakter → gagal (DOS prevention)
  ✓ callSign null → sukses (nullable)
  ✓ userId hilang → gagal

WebRTCSignalingPayloadSchema:
  ✓ type='offer' dengan SDP string → sukses
  ✓ type='answer' dengan SDP string → sukses
  ✓ type='candidate' dengan ICE object → sukses
  ✓ type='invalid_type' → gagal
  ✓ senderUserId kosong → gagal
  ✓ targetUserId tidak ada → sukses (opsional)
  ✓ data bukan RTCSdp atau ICE → gagal

HangUpPayloadSchema:
  ✓ targetUserId valid → sukses
  ✓ moderatorName opsional → sukses tanpa field ini
  ✓ moderatorName > 100 karakter → gagal
  ✓ targetUserId kosong → gagal

KickPayloadSchema:
  ✓ payload valid → sukses
  ✓ targetUserId kosong → gagal
  ✓ field opsional tidak ada → sukses

ReactionPayloadSchema:
  ✓ category='animation' → sukses
  ✓ category='sound' → sukses
  ✓ category='gift' → sukses
  ✓ category='unknown' → gagal
  ✓ reaction string kosong → gagal

UpdateRolePayloadSchema:
  ✓ nextRole='noc' → sukses
  ✓ nextRole='invalid' → gagal
  ✓ targetUserId ada → sukses

UpdateStatusPayloadSchema:
  ✓ statusType='muted' → sukses
  ✓ statusType='banned' → sukses
  ✓ statusType='unknown_status' → gagal

PresenceMetaSchema:
  ✓ payload lengkap → sukses
  ✓ status='wait_controlled' → sukses
  ✓ status='nilai_tidak_valid' → gagal
  ✓ role='noc' → sukses
  ✓ role='bukan_role_valid' → gagal

safeParseRealtimePayload helper:
  ✓ payload valid → kembalikan data parsed (bukan null)
  ✓ payload invalid → kembalikan null (tidak throw)
  ✓ payload null → kembalikan null
  ✓ payload undefined → kembalikan null
  ✓ payload number 42 → kembalikan null
  ✓ payload string 'hello' → kembalikan null
```

---

### 1.2 Permission Engine Tests (Perluas yang Ada)

**File:** `src/features/moderation/permissions.test.ts`

Test `isHigherRole` dan `canModerateRole` sudah ada. Tambahkan:

```ts
// Tambahkan describe block baru di bawah yang sudah ada

describe('canUsePTT', () => {
  // Baca signature canUsePTT dari permissions.ts terlebih dahulu
  // kemudian test semua kombinasi role × status × allowGuestPTT

  it('NOC dengan status normal → dapat PTT', () => { ... });
  it('NOC dengan status muted → tidak dapat PTT', () => { ... });
  it('guest, allowGuestPTT=true, status normal → dapat PTT', () => { ... });
  it('guest, allowGuestPTT=false → tidak dapat PTT', () => { ... });
  it('operator, status=ptt_blocked → tidak dapat PTT', () => { ... });
  it('pjc, status=banned → tidak dapat PTT', () => { ... });
  it('sys_admin, status=suspended → tidak dapat PTT', () => { ... });
});

describe('canUseChat', () => {
  it('guest, allowGuestChat=true → dapat chat', () => { ... });
  it('guest, allowGuestChat=false → tidak dapat chat', () => { ... });
  it('semua role dengan status=chat_blocked → tidak dapat chat', () => { ... });
  it('noc, status=normal, allowGuestChat=false → dapat chat (role override)', () => { ... });
});

describe('canUseReaction', () => {
  it('noc dengan status normal → dapat reaction', () => { ... });
  it('guest, allowGuestReaction=false → tidak dapat reaction', () => { ... });
  it('operator, status=muted → tidak dapat reaction', () => { ... });
});

describe('canPerformAction — matrix lengkap', () => {
  // Baca enum ModerationAction dari permissions.ts
  // Test setiap kombinasi role × action yang kritis

  it('NOC dapat VIEW_ADMIN_PANEL', () => { ... });
  it('NOC dapat BAN_USER', () => { ... });
  it('NOC dapat KICK_USER', () => { ... });
  it('NOC dapat MANAGE_CHANNEL', () => { ... });
  it('sys_admin dapat KICK_USER', () => { ... });
  it('sys_admin TIDAK dapat MANAGE_CHANNEL (reserved NOC)', () => { ... });
  it('pjc dapat MUTE_USER', () => { ... });
  it('pjc TIDAK dapat BAN_USER', () => { ... });
  it('operator TIDAK dapat KICK_USER', () => { ... });
  it('guest TIDAK dapat tindakan apapun', () => { ... });
});

describe('roleRank integrity', () => {
  it('semua 5 role terdefinisi di roleRank', () => {
    const roles = ['noc', 'sys_admin', 'pjc', 'operator', 'guest'];
    roles.forEach(role => {
      expect(roleRank[role as ChannelRole]).toBeDefined();
      expect(typeof roleRank[role as ChannelRole]).toBe('number');
    });
  });

  it('urutan hierarki numerik benar', () => {
    expect(roleRank['noc']).toBeGreaterThan(roleRank['sys_admin']);
    expect(roleRank['sys_admin']).toBeGreaterThan(roleRank['pjc']);
    expect(roleRank['pjc']).toBeGreaterThan(roleRank['operator']);
    expect(roleRank['operator']).toBeGreaterThan(roleRank['guest']);
  });
});
```

---

### 1.3 Store State Tests (Perluas yang Ada)

**File:** `src/app/store/usePTTStore.test.ts`

Tambahkan test suite baru (jangan hapus yang ada):

```
describe('PTT collision detection (tie-breaking logic)')
  Setup: store dengan userId='user-AAA', isTransmitting=true

  ✓ Terima ptt_state dari NOC (role noc) saat kita transmit
    → isTransmitting false (NOC override)
  ✓ Terima ptt_state timestamp lebih baru dari userId yang lebih kecil
    → kita kalah, isTransmitting false
  ✓ Terima ptt_state timestamp sama, userId pengirim > userId kita
    → kita menang, isTransmitting tetap true
  ✓ Terima ptt_state isTransmitting=false dari activeTransmitter
    → activeTransmitter null, progress 0

describe('channel number navigation')
  ✓ channelUp() dari channel 1 → channel 2
  ✓ channelUp() dari channel 999 → channel 0 (wrap)
  ✓ channelDown() dari channel 1 → channel 0
  ✓ channelDown() dari channel 0 → channel 999 (wrap)
  ✓ setChannelNumber(42) → channelNumber === 42
  ✓ setChannelNumber(-1) → tolak atau clamp ke 0
  ✓ setChannelNumber(1000) → tolak atau clamp ke 999

describe('kick handler')
  ✓ kick payload targetUserId === userId kita → channelNumber berubah ke 302
  ✓ kick payload targetUserId !== userId kita → channelNumber tidak berubah
  ✓ kick payload invalid (Zod gagal) → state tidak berubah

describe('update_role handler')
  ✓ targetUserId === userId kita, nextRole='pjc'
    → myChannelRole === 'pjc' (jika field ini ada di store)
    → localStorage `channel-role:${roomId}:${userId}` === 'pjc'
  ✓ targetUserId !== userId kita → myChannelRole tidak berubah

describe('presence member tracking')
  ✓ presence join event → activeUsers bertambah 1
  ✓ presence leave event → activeUsers berkurang 1
  ✓ presence join user yang sama dua kali → tidak duplikat di activeUsers
```

---

### 1.4 storeUtils Tests

**File baru:** `src/app/store/storeUtils.test.ts`

Baca `src/app/store/storeUtils.ts` terlebih dahulu, identifikasi semua
fungsi yang diekspor, kemudian test:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
// Import semua fungsi yang ada di storeUtils

describe('generateUUID', () => {
  it('menghasilkan string berformat UUID v4', () => {
    const uuid = generateUUID();
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('dua panggilan berurutan menghasilkan nilai yang berbeda', () => {
    expect(generateUUID()).not.toBe(generateUUID());
  });
});

describe('getChannelUUID', () => {
  it('mengembalikan string yang konsisten untuk input yang sama', () => {
    expect(getChannelUUID(1)).toBe(getChannelUUID(1));
    expect(getChannelUUID(100)).toBe(getChannelUUID(100));
  });

  it('channel berbeda menghasilkan UUID berbeda', () => {
    expect(getChannelUUID(1)).not.toBe(getChannelUUID(2));
    expect(getChannelUUID(100)).not.toBe(getChannelUUID(101));
  });

  it('format output adalah string non-empty', () => {
    expect(typeof getChannelUUID(1)).toBe('string');
    expect(getChannelUUID(1).length).toBeGreaterThan(0);
  });
});

describe('safeGetStorage / safeSetStorage', () => {
  beforeEach(() => { localStorage.clear(); });

  it('set → get mengembalikan nilai yang sama', () => {
    safeSetStorage('test-key', 'test-value');
    expect(safeGetStorage('test-key')).toBe('test-value');
  });

  it('get key yang tidak ada → null', () => {
    expect(safeGetStorage('nonexistent-key-xyz')).toBeNull();
  });

  it('tidak throw jika localStorage tidak tersedia', () => {
    // Simulasikan localStorage unavailable
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      get() { throw new Error('localStorage not available'); },
      configurable: true,
    });
    expect(() => safeGetStorage('key')).not.toThrow();
    expect(safeGetStorage('key')).toBeNull();
    // Restore
    if (original) Object.defineProperty(window, 'localStorage', original);
  });
});

describe('checkIfNewUser', () => {
  beforeEach(() => { localStorage.clear(); });

  it('user pertama kali → true', () => {
    expect(checkIfNewUser('user-123')).toBe(true);
  });

  it('user yang sama kedua kali → false', () => {
    checkIfNewUser('user-123'); // first call
    expect(checkIfNewUser('user-123')).toBe(false);
  });

  it('user berbeda → true (first time)', () => {
    checkIfNewUser('user-A');
    expect(checkIfNewUser('user-B')).toBe(true);
  });
});
```

---

### 1.5 RateLimiter Edge Cases (Perluas yang Ada)

**File:** `src/app/utils/rateLimiter.test.ts`

Tambahkan test yang belum ada:

```
describe('pttRateLimiter (pre-configured instance)')
  ✓ 6 press dalam 1 detik → semua allowed
  ✓ press ke-7 → blocked 3 detik
  ✓ setelah 3 detik berlalu → pulih

describe('channelSwitchRateLimiter')
  ✓ 3 switch → allowed
  ✓ switch ke-4 → blocked

describe('broadcastRateLimiter')
  ✓ 10 broadcast → allowed
  ✓ broadcast ke-11 → blocked 5 detik

describe('reset()')
  ✓ setelah blocked, reset() → canProceed() true
  ✓ reset saat tidak blocked → tidak ada efek negatif

describe('getTimeUntilReset()')
  ✓ saat tidak blocked → 0 atau falsy
  ✓ saat blocked → nilai positif dalam ms
  ✓ setelah blockDuration berlalu → 0

describe('window sliding')
  ✓ 2 request di detik ke-0, 2 di detik ke-0.9 → total 4 di window 1 detik
  ✓ request di detik ke-1.1 → window lama expired, slot baru tersedia
```

---

### 1.6 Config Integrity Tests

**File baru:** `src/app/utils/config.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { CHANNELS, BRAND, AUDIO_CONFIG } from './config';

describe('CHANNELS array', () => {
  it('memiliki tepat 300 channel (0-299) atau sesuai jumlah yang didefinisikan', () => {
    expect(CHANNELS.length).toBeGreaterThan(0);
  });

  it('tidak ada nomor channel yang duplikat', () => {
    const numbers = CHANNELS.map(ch => ch.number ?? ch.id ?? ch.channelNumber);
    const unique = new Set(numbers);
    expect(unique.size).toBe(numbers.length);
  });

  it('setiap channel memiliki property name/label', () => {
    CHANNELS.forEach(ch => {
      expect(ch.name ?? ch.label).toBeTruthy();
    });
  });

  it('channel 100 adalah LANDING/ECHO channel', () => {
    const ch100 = CHANNELS.find(ch => (ch.number ?? ch.id) === 100);
    expect(ch100).toBeDefined();
    expect((ch100?.name ?? ch100?.label ?? '').toUpperCase()).toContain('ECHO');
  });

  it('tidak ada channel dengan name undefined atau null', () => {
    CHANNELS.forEach(ch => {
      expect(ch.name ?? ch.label).not.toBeNull();
      expect(ch.name ?? ch.label).not.toBeUndefined();
    });
  });
});

describe('BRAND config', () => {
  it('supabaseRoomPrefix adalah string non-empty', () => {
    expect(typeof BRAND.supabaseRoomPrefix).toBe('string');
    expect(BRAND.supabaseRoomPrefix.length).toBeGreaterThan(0);
  });

  it('defaultChannel ada di array CHANNELS', () => {
    const channelNums = CHANNELS.map(ch => ch.number ?? ch.id);
    expect(channelNums).toContain(BRAND.defaultChannel);
  });

  it('isolatedChannels adalah array of number', () => {
    expect(Array.isArray(BRAND.isolatedChannels)).toBe(true);
    BRAND.isolatedChannels.forEach(ch => {
      expect(typeof ch).toBe('number');
    });
  });
});

describe('AUDIO_CONFIG', () => {
  it('sampleRate adalah 48000', () => {
    expect(AUDIO_CONFIG.sampleRate).toBe(48000);
  });

  it('chunkDurationMs adalah nilai positif', () => {
    expect(AUDIO_CONFIG.chunkDurationMs).toBeGreaterThan(0);
  });

  it('volume default antara 0 dan 100', () => {
    expect(AUDIO_CONFIG.volume?.default ?? 80).toBeGreaterThanOrEqual(0);
    expect(AUDIO_CONFIG.volume?.default ?? 80).toBeLessThanOrEqual(100);
  });
});
```

**Catatan:** Sesuaikan nama property (`.number`, `.id`, `.name`, `.label`)
dengan struktur aktual objek di `config.ts` setelah dibaca.

---

## FASE 2 — INTEGRATION TESTS: ALUR PTT END-TO-END (IN-MEMORY)

Semua test di Fase 2 berjalan di jsdom tanpa browser nyata. Gunakan mock
yang sudah ada di `src/test/setup.ts` sebagai fondasi.

### 2.1 PTT Transmit Flow Integration Test

**File baru:** `src/app/__tests__/ptt-transmit-flow.test.ts`

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePTTStore } from '../store/usePTTStore';

// Semua mock sudah dihandle oleh src/test/setup.ts
// Tambahkan mock spesifik yang dibutuhkan di sini

describe('PTT Transmit Flow', () => {
  beforeEach(() => {
    // Reset store ke initial state
    usePTTStore.setState({
      isConnected: false,
      isTransmitting: false,
      channelNumber: 1,
      userId: 'test-user-A',
      callSign: 'TESTA',
      activeTransmitter: null,
      transmitProgress: 0,
    });
  });

  describe('Saat isConnected=false', () => {
    it('setTransmitting(true) tidak mengubah isTransmitting', () => {
      // Pastikan tidak bisa transmit saat disconnect
      const store = usePTTStore.getState();
      expect(store.isConnected).toBe(false);
      // Test bahwa transmit guard bekerja
    });
  });

  describe('Saat isConnected=true', () => {
    beforeEach(() => {
      usePTTStore.setState({ isConnected: true });
    });

    it('setTransmitting(true) → isTransmitting true', () => {
      usePTTStore.getState().setTransmitting(true);
      expect(usePTTStore.getState().isTransmitting).toBe(true);
    });

    it('setTransmitting(false) setelah true → isTransmitting false', () => {
      usePTTStore.getState().setTransmitting(true);
      usePTTStore.getState().setTransmitting(false);
      expect(usePTTStore.getState().isTransmitting).toBe(false);
    });
  });

  describe('activeTransmitter state', () => {
    it('saat menerima ptt_state isTransmitting=true → activeTransmitter diset', () => {
      usePTTStore.setState({ isConnected: true });
      const simulatedPayload = {
        userId: 'user-B',
        displayName: 'User B',
        callSign: 'USRB1',
        isTransmitting: true,
        timestamp: Date.now(),
      };
      // Simulasikan handler ptt_state dipanggil
      // Implementasi tergantung bagaimana store mengekspos handler ini
      // Cek state activeTransmitter setelah handler dipanggil
    });

    it('saat menerima ptt_state isTransmitting=false → activeTransmitter null', () => {
      usePTTStore.setState({
        isConnected: true,
        activeTransmitter: {
          userId: 'user-B',
          displayName: 'User B',
          callSign: 'USRB1',
          startTime: Date.now(),
        },
      });
      // Simulasikan stop transmit dari user-B
    });
  });
});
```

---

### 2.2 Channel Subscription Lifecycle Test

**File baru:** `src/app/__tests__/channel-subscription.test.ts`

```
Test suite: subscribeToChannel lifecycle

Baca src/app/store/usePTTStore.ts (atau channelSubscription.ts jika sudah direfactor).
Temukan fungsi subscribeToChannel dan test:

  ✓ Panggil subscribeToChannel(5)
    → Supabase channel() dipanggil dengan nama yang mengandung '005' atau '5'
    → subscribe() dipanggil
    → setelah callback 'SUBSCRIBED': isConnected === true

  ✓ subscribeToChannel(1) lalu subscribeToChannel(5)
    → unsubscribe dari channel 1 dipanggil sebelum subscribe ke channel 5

  ✓ Subscribe callback 'CHANNEL_ERROR'
    → retry dijadwalkan (setTimeout atau setTimeout-like terpanggil)
    → isConnected === false

  ✓ Subscribe callback 'TIMED_OUT'
    → retry dijadwalkan
    → isConnected === false

  ✓ Payload ptt_state INVALID via Zod (missing userId)
    → safeParseRealtimePayload mengembalikan null
    → state tidak berubah
    → tidak ada unhandled exception

  ✓ Payload voice_chunk dengan base64 > 1.1MB
    → Zod menolak
    → onVoiceChunkReceived TIDAK dipanggil

  ✓ Payload webrtc_signaling untuk targetUserId yang bukan userId kita
    → handleSignaling TIDAK dipanggil (atau dipanggil tapi di-skip internal)
```

---

### 2.3 WebRTC ICE Queue Test (Perluas yang Ada)

**File:** `src/app/hooks/useWebRTC.test.ts`

Tambahkan test yang belum dicakup:

```
describe('ICE candidate queuing')
  ✓ candidate masuk sebelum setRemoteDescription
    → candidate masuk ke queue (belum applied ke peerConnection)
  ✓ setRemoteDescription dipanggil
    → semua candidate yang di-queue langsung applied (drain)
  ✓ candidate masuk setelah setRemoteDescription
    → langsung applied (tidak masuk queue)
  ✓ drain dipanggil dengan queue kosong → tidak ada error

describe('cleanupPeer')
  ✓ RTCPeerConnection.close() dipanggil
  ✓ audio element src dibersihkan
  ✓ peer dihapus dari peerConnectionsRef

describe('isolated channel (ch 100 atau dari BRAND.isolatedChannels)')
  ✓ handleSignaling pada isolated channel → tidak membuat RTCPeerConnection
  ✓ voice_chunk pada isolated channel → diputar lokal (echo test)
```

---

### 2.4 Audio Chunk Size Guard Test

**File baru:** `src/app/__tests__/audio-chunk-guard.test.ts`

```
Test suite: Voice chunk size validation

  ✓ Chunk 100KB → lolos Zod, dikirim via broadcast
  ✓ Chunk 500KB → lolos Zod, dikirim via broadcast
  ✓ Chunk 1.1MB + 1 byte → ditolak Zod, TIDAK dikirim
  ✓ Chunk kosong → ditolak Zod, TIDAK dikirim
  ✓ Chunk null → ditolak Zod, TIDAK dikirim

Cara generate payload besar untuk test:
  const bigChunk = 'A'.repeat(1_100_001);
  const result = VoiceChunkPayloadSchema.safeParse({
    userId: 'user-X',
    base64: bigChunk,
  });
  expect(result.success).toBe(false);
```

---

## FASE 3 — E2E TESTS: SKENARIO USER NYATA

### 3.1 Perbaiki E2E yang Fail Terlebih Dahulu

Jalankan E2E baseline dari Fase 0. Untuk setiap spec yang FAIL:

1. Buka `playwright-report/index.html` atau lihat output CLI
2. Identifikasi root cause (selector tidak ditemukan, timeout, state error)
3. Perbaiki sesuai panduan berikut:

**Masalah umum dan solusinya:**

```
Error: window.__store__ tidak terdefinisi
→ Cek App.tsx apakah sudah diupdate (window.usePTTStore dihapus saat refactor)
→ Ganti dengan: window.__store__ = usePTTStore (untuk E2E only, guard dengan DEV flag)
   Tambahkan di App.tsx:
   if (import.meta.env.DEV) {
     (window as any).__store__ = usePTTStore;
   }

Error: Selector 'button:has-text("PTT")' timeout
→ Cek apakah PTTButton menggunakan teks berbeda setelah refactor
→ Update selector ke data-testid: page.getByTestId('ptt-button')
→ Pastikan PTTButton.tsx memiliki data-testid="ptt-button"

Error: [data-testid="lcd-channel-number"] not found
→ Cek RadioLayout.tsx atau RadioHeader.tsx (setelah refactor)
→ Pastikan elemen LCD memiliki data-testid yang sesuai

Error: context.setOffline is not a function
→ Playwright versi lama: gunakan page.route('**', route => route.abort()) sebagai gantinya
```

---

### 3.2 E2E: PTT Core Flow

**File baru:** `e2e/ptt-core-flow.spec.ts`

```ts
import { test, expect } from '@playwright/test';

test.use({
  permissions: ['microphone'],
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ],
  },
});

test.describe('PTT Core Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // Bypass LoginGate dengan fake auth di localStorage
      const fakeSession = {
        access_token: 'e2e-mock-token',
        user: {
          id: 'e2e-user-001',
          email: 'e2e@nextvwt.test',
          role: 'authenticated',
        },
      };
      localStorage.setItem(
        'sb-' + 'tqixjycrxhjmpyffhxvg' + '-auth-token',
        JSON.stringify(fakeSession)
      );
    });
    await page.goto('/');
    await page.waitForSelector('[data-testid="ptt-button"], button:has-text("PTT")', {
      timeout: 15_000,
    });
  });

  test('App load tanpa white screen atau crash', async ({ page }) => {
    await expect(page.locator('#root')).toBeVisible();
    const body = await page.textContent('body');
    expect(body).not.toContain('Something went wrong');
    expect(body).not.toContain('Cannot read properties of undefined');
    expect(body).not.toContain('Uncaught Error');
  });

  test('PTT button terlihat pada initial load', async ({ page }) => {
    const pttBtn = page.getByTestId('ptt-button').or(
      page.locator('button:has-text("PTT")')
    );
    await expect(pttBtn).toBeVisible();
  });

  test('LCD menampilkan nomor channel', async ({ page }) => {
    const lcd = page.getByTestId('lcd-channel-number');
    await expect(lcd).toBeVisible({ timeout: 8_000 });
    const text = await lcd.textContent();
    expect(text).toMatch(/\d+/);
  });

  test('Power toggle ON by default', async ({ page }) => {
    const powerToggle = page.locator('input[type="checkbox"]').first();
    await expect(powerToggle).toBeChecked({ timeout: 5_000 });
  });

  test('Tombol SCAN terlihat', async ({ page }) => {
    await expect(
      page.locator('button:has-text("SCAN")').or(page.getByTestId('scan-button'))
    ).toBeVisible();
  });

  test('Menekan PTT → visual state transmitting muncul', async ({ page }) => {
    const pttBtn = page.getByTestId('ptt-button').or(
      page.locator('button:has-text("PTT")')
    ).first();

    await pttBtn.dispatchEvent('pointerdown');

    // Cek salah satu indikator transmitting
    const indicator = page.getByTestId('transmitting-indicator').or(
      page.locator('[aria-pressed="true"]')
    );
    await expect(indicator).toBeVisible({ timeout: 3_000 });

    await pttBtn.dispatchEvent('pointerup');
    await expect(indicator).toBeHidden({ timeout: 3_000 });
  });

  test('Tidak ada console error saat load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Filter error yang diharapkan (seperti Supabase auth yang belum setup)
    const criticalErrors = errors.filter(e =>
      !e.includes('auth') &&
      !e.includes('Failed to fetch') &&
      !e.includes('net::ERR')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
```

---

### 3.3 E2E: Connection Resilience

**File baru:** `e2e/connection-resilience.spec.ts`

```ts
import { test, expect } from '@playwright/test';

test.describe('Connection Resilience', () => {
  test('Microphone permission denied → error feedback muncul', async ({
    page,
    context,
  }) => {
    // Revoke semua permission
    await context.clearPermissions();
    // Deny microphone
    await context.grantPermissions([]);

    await page.addInitScript(() => {
      localStorage.setItem('nextvwt-guest', 'true');
    });
    await page.goto('/');
    await page.waitForSelector('[data-testid="ptt-button"], button:has-text("PTT")', {
      timeout: 15_000,
    });

    const pttBtn = page.getByTestId('ptt-button').or(
      page.locator('button:has-text("PTT")')
    ).first();
    await pttBtn.dispatchEvent('pointerdown');

    // Harus ada pesan error terkait microphone
    const errorEl = page.locator('[role="alert"]').or(
      page.locator('.toast, [data-sonner-toast]')
    ).first();
    await expect(errorEl).toBeVisible({ timeout: 5_000 });
  });

  test('Network offline → status disconnected muncul', async ({ page, context }) => {
    await page.addInitScript(() => {
      localStorage.setItem('nextvwt-guest', 'true');
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Simulasikan network putus
    await context.setOffline(true);
    await page.waitForTimeout(2_000);

    // Cek ada indikasi disconnected
    const body = await page.textContent('body');
    // Status disconnected bisa berupa text atau class CSS
    // Sesuaikan selector dengan implementasi aktual di RadioLayout

    // Restore
    await context.setOffline(false);
  });

  test('App tidak crash setelah 60 detik tanpa interaksi', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.addInitScript(() => {
      localStorage.setItem('nextvwt-guest', 'true');
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.waitForTimeout(60_000);

    // App tidak crash
    expect(errors).toHaveLength(0);
    await expect(page.locator('#root')).toBeVisible();
  });
});
```

---

### 3.4 E2E: Settings Flow

**File baru jika belum ada:** `e2e/settings-flow.spec.ts`

```
Scenario: Buka panel settings
  1. Load app, bypass auth
  2. Klik tombol SET atau settings
  3. Expect modal/panel settings terbuka
  4. Ubah volume → nilai berubah
  5. Tutup modal → nilai tersimpan

Scenario: Ganti display name
  1. Buka settings
  2. Ubah display name
  3. Simpan
  4. LCD atau header menampilkan nama baru

Scenario: Toggle dark/light mode (jika ada)
  1. Klik toggle tema
  2. Class CSS berubah (dark/light)
```

---

## FASE 4 — INFRASTRUCTURE & BUILD INTEGRITY

### 4.1 TypeScript Type Check

```bash
pnpm type-check 2>&1 | tee /tmp/typecheck-final.txt
echo "TypeScript errors:"
grep -c "error TS" /tmp/typecheck-final.txt || echo "0"
```

**Target: 0 TypeScript errors.**

Untuk setiap error:
- Error di `*.test.ts` → fix mock atau type annotation di test
- Error di source file → laporkan di `TEST_REPORT.md` sebagai temuan, jangan
  ubah logic produksi tanpa konfirmasi

---

### 4.2 Build Production

```bash
pnpm build 2>&1 | tee /tmp/build-final.txt
echo "Build status:"
ls -lh dist/assets/*.js 2>/dev/null | sort -k5 -rh | head -10
du -sh dist/
```

Verifikasi:
- Build selesai tanpa error
- `dist/index.html` ada
- `dist/assets/` ada dan tidak kosong
- Tidak ada warning circular dependency

---

### 4.3 Bundle Size Audit

```bash
ls -lh dist/assets/*.js | awk '{print $5, $9}' | sort -hr
TOTAL=$(du -sh dist/ | cut -f1)
echo "Total dist size: $TOTAL"

# Cek chunk terbesar
BIGGEST=$(ls -lS dist/assets/*.js | head -1 | awk '{print $5, $9}')
echo "Biggest JS chunk: $BIGGEST"
```

**Kriteria:**
- Total `dist/` < 5MB untuk first load yang reasonable di jaringan 4G Indonesia
- Tidak ada single chunk > 500KB (perlu code splitting jika ada)
- Jika ada chunk > 500KB, identifikasi package penyebabnya

---

### 4.4 Dependency Security Audit

```bash
pnpm audit --audit-level=moderate 2>&1 | tee /tmp/audit-final.txt
echo "=== Audit Summary ==="
grep -E "critical|high|moderate" /tmp/audit-final.txt | head -20
```

Laporkan:
- Jumlah vulnerabilities per severity
- Package yang perlu diupdate
- Jangan auto-fix tanpa review — beberapa fix bisa breaking

---

### 4.5 SQL Migration Integrity Check

```bash
echo "=== Checking RLS policies ==="
for f in supabase/migrations/*.sql; do
  echo ""
  echo "--- $f ---"
  # Cek USING (true) yang tidak aman
  UNSAFE=$(grep -n "USING (true)\|WITH CHECK (true)" "$f")
  if [ -n "$UNSAFE" ]; then
    echo "⚠️  UNSAFE RLS ditemukan:"
    echo "$UNSAFE"
  else
    echo "✓ Tidak ada USING (true) yang tidak aman"
  fi
  # Cek RLS enabled
  grep -n "ENABLE ROW LEVEL SECURITY\|RLS" "$f" | head -5
done
echo ""
echo "=== Migration count: $(ls supabase/migrations/*.sql | wc -l) ==="
```

---

### 4.6 Environment Variables Check

```bash
echo "=== Cek variabel di .env.example vs penggunaan di src/ ==="
while IFS= read -r line; do
  [[ "$line" =~ ^#.*$ ]] && continue
  [[ -z "$line" ]] && continue
  VAR=$(echo "$line" | cut -d'=' -f1 | tr -d ' ')
  [ -z "$VAR" ] && continue
  COUNT=$(grep -r "$VAR" src/ --include="*.ts" --include="*.tsx" -l 2>/dev/null | wc -l)
  if [ "$COUNT" -eq "0" ]; then
    echo "⚠️  $VAR: ada di .env.example tapi tidak digunakan di src/"
  else
    echo "✓  $VAR: digunakan di $COUNT file"
  fi
done < .env.example
```

---

## FASE 5 — PERFORMANCE & STRESS TESTS

### 5.1 Zod Schema Parse Performance

**File baru:** `src/app/store/schemas/realtimePayloads.perf.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { PttStatePayloadSchema, VoiceChunkPayloadSchema } from './realtimePayloads';

describe('Schema Parse Performance', () => {
  const validPtt = {
    userId: 'user-perf-test',
    displayName: 'Perf User',
    callSign: 'PERF1',
    isTransmitting: true,
  };

  it('parse 1000 PttStatePayload dalam < 50ms', () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      PttStatePayloadSchema.safeParse(validPtt);
    }
    const elapsed = performance.now() - start;
    console.log(`1000 PttState parses: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(50);
  });

  it('reject 1000 payload invalid dalam < 50ms', () => {
    const invalid = { userId: '', isTransmitting: 'bukan-boolean' };
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      PttStatePayloadSchema.safeParse(invalid);
    }
    const elapsed = performance.now() - start;
    console.log(`1000 invalid parses: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(50);
  });

  it('parse VoiceChunkPayload 50KB dalam < 10ms per chunk', () => {
    const chunk50kb = { userId: 'user-1', base64: 'A'.repeat(50_000) };
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      VoiceChunkPayloadSchema.safeParse(chunk50kb);
    }
    const elapsed = performance.now() - start;
    console.log(`100 VoiceChunk (50KB) parses: ${elapsed.toFixed(2)}ms`);
    expect(elapsed / 100).toBeLessThan(10); // < 10ms per parse
  });
});
```

---

### 5.2 RateLimiter Stress Test

**Tambahkan ke:** `src/app/utils/rateLimiter.test.ts`

```ts
describe('RateLimiter Stress Test', () => {
  it('1000 canProceed() calls dalam < 10ms', () => {
    vi.useFakeTimers();
    const limiter = new RateLimiter({
      maxRequests: 100,
      windowMs: 10_000,
      blockDurationMs: 5_000,
      ignoreTestEnv: true,
    });

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      limiter.canProceed();
    }
    const elapsed = performance.now() - start;
    console.log(`1000 canProceed() calls: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(10);
    vi.useRealTimers();
  });
});
```

---

## FASE 6 — LAPORAN AKHIR WAJIB

Setelah semua fase selesai, buat file `TEST_REPORT.md` di root project:

```markdown
# NextVWT — Infrastructure Test Report

**Tanggal:** [isi tanggal eksekusi]
**Tester:** AI Agent (Claude Code / Cursor)
**Codebase version:** [cek git log --oneline -1]
**Node:** [node --version]
**pnpm:** [pnpm --version]

---

## Ringkasan Eksekusi

| Layer | Total Test | Pass | Fail | Skip |
|-------|-----------|------|------|------|
| Unit — Vitest | ? | ? | ? | ? |
| Integration — Vitest | ? | ? | ? | ? |
| E2E — Playwright | ? | ? | ? | ? |
| **TOTAL** | **?** | **?** | **?** | **?** |

## Coverage Report

| File | Lines | Branches | Functions | Target 70% |
|------|-------|----------|-----------|------------|
| permissions.ts | ?% | ?% | ?% | ✓/✗ |
| realtimePayloads.ts | ?% | ?% | ?% | ✓/✗ |
| usePTTStore.ts | ?% | ?% | ?% | ✓/✗ |
| rateLimiter.ts | ?% | ?% | ?% | ✓/✗ |
| storeUtils.ts | ?% | ?% | ?% | ✓/✗ |
| config.ts | ?% | ?% | ?% | ✓/✗ |
| channelSubscription.ts | ?% | ?% | ?% | ✓/✗ |

## Build & Infrastructure

| Check | Status | Detail |
|-------|--------|--------|
| `pnpm type-check` | PASS/FAIL | [jumlah error] |
| `pnpm build` | PASS/FAIL | [total dist size] |
| Chunk terbesar | [size] | [filename] |
| `pnpm audit` | PASS/FAIL | [critical: X, high: Y] |
| SQL migration RLS | PASS/FAIL | [unsafe policy count] |

## Temuan Kritis (Bug Nyata)

<!-- Isi jika ada test yang mengungkap bug di kode produksi -->
<!-- Format: -->
### [CRITICAL/HIGH/MEDIUM] Judul temuan
- **Ditemukan di:** [nama test file]
- **Test case:** [nama test]
- **Repro steps:** [cara reproduksi]
- **Dampak ke NextVWT:** [dampak ke user/operator]
- **Rekomendasi fix:** [solusi yang diusulkan]

## Temuan Non-Kritis

### [LOW] Contoh: Bundle size 650KB (di atas 500KB threshold)
- **File:** dist/assets/vendor-XXXXXX.js
- **Ukuran:** 650KB
- **Rekomendasi:** Lazy load Three.js atau pisahkan vendor chunk

## Test Yang Di-skip / Belum Bisa Dijalankan

| Test | Alasan skip |
|------|-------------|
| Actual microphone test | Butuh hardware mic nyata |
| Android PTT button | Butuh Capacitor native bridge |
| Supabase live RLS | Butuh koneksi ke Supabase production |

## Performa

| Metric | Nilai | Target |
|--------|-------|--------|
| 1000 Zod parse (PttState) | ?ms | < 50ms |
| 1000 RateLimiter canProceed() | ?ms | < 10ms |
| App boot (Playwright) | ?ms | < 3000ms |
| E2E PTT button visible | ?ms | < 3000ms |

## Rekomendasi Prioritas

1. [CRITICAL] ...
2. [HIGH] ...
3. [MEDIUM] ...
```

---

## CONSTRAINTS WAJIB — BACA SEBELUM MULAI

1. **JANGAN** hapus atau modifikasi test yang sudah ada dan passing
2. **JANGAN** ubah logika source code untuk membuat test pass —
   jika test gagal karena bug nyata, laporkan di `TEST_REPORT.md`
3. **JANGAN** hit endpoint Supabase production saat test —
   gunakan mock yang ada di `src/test/setup.ts`
4. **SELALU** jalankan `pnpm test --run` sebelum dan sesudah setiap fase
   untuk memastikan tidak ada regression
5. **GUNAKAN** `data-testid` untuk E2E selector, bukan text atau CSS selector
   yang rapuh — tambahkan `data-testid` ke komponen jika belum ada
6. **LAPORKAN** setiap temuan dalam `TEST_REPORT.md` sebelum lanjut ke fase berikutnya
7. **CHECKPOINT** setelah setiap fase: laporkan jumlah pass/fail sebelum lanjut
8. Jika ada test yang butuh lebih dari 30 detik untuk pass →
   tambahkan `test.timeout(60_000)` atau pecah menjadi test lebih kecil
