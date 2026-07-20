# Arsitektur NextVWT

Dokumen ini menjelaskan arsitektur sistem NextVWT secara otoritatif: bagaimana
frontend, state, realtime, audio, moderasi, dan keamanan tersusun. Ini melengkapi
`ARCHITECTURE_ADOPTION.md` (yang berisi catatan adopsi referensi eksternal) dan
`PRD.md` (kebutuhan produk).

---

## 1. Overview

NextVWT adalah aplikasi **PTT (Push-To-Talk)** real-time. Pengguna menekan tombol
untuk mengirim suara ke semua anggota saluran (channel) secara langsung. Tidak ada
server media terpusat di tahap prototipe — audio mengalir antar browser via WebRTC.

```
┌────────────┐         WebRTC mesh          ┌────────────┐
│  Browser A │ ←───────────────────────────→│  Browser B │
│ (React+SPA)│  (base64 voice chunk via      │ (React+SPA)│
└─────┬──────┘   Supabase Realtime broadcast)└─────┬──────┘
      │                                              │
      └──────────── Supabase Realtime ──────────────┘
                   (presence, ptt_state, signaling,
                    moderation, logs)
```

**Target produksi** (lihat `docs/ROADMAP.md`): WebRTC mesh diganti **LiveKit SFU**
— client hanya punya 1 koneksi ke server media, bukan N koneksi ke peer.

---

## 2. Tech Stack

| Layer | Teknologi | Catatan |
|---|---|---|
| Build | Vite + TypeScript | SPA, bukan SSR (Next.js tidak dipakai) |
| UI | React 18, Tailwind CSS, Radix UI | 8 tema visual (`theme-classic`…`theme-v6`, `theme-monokrom`) |
| State | Zustand (slices) | `usePTTStore` gabungan 5 slice |
| Audio | Web Audio API + WebRTC | `useAudioStreamer`, `useWebRTC` |
| Realtime | Supabase Realtime | presence + broadcast per channel |
| Auth/DB | Supabase | Google OAuth + Postgres (`channel_roles`, `channel_moderation_logs`) |
| Native | Capacitor | `com.nextvwt.ptt`, `npx cap sync android` |
| SFU (rencana) | LiveKit (`livekit-client` + `livekit-server`) | self-host di VPS |

---

## 3. Frontend Structure

```
src/app/
  store/
    usePTTStore.ts          # create() gabungan slice
    types.ts                # PTTState (interface tunggal)
    slices/
      createAuthSlice.ts    # user, session, signInWithGoogle, initializeSession
      createUISlice.ts      # isPowerOn, isTransmitting, theme, channel, setTransmitting
      createChannelSlice.ts # channelUp, setChannelNumber, activeUsers
      createSettingsSlice.ts# audioMode, fullDuplex, settings
      createWebRTCSlice.ts  # broadcastVoiceChunk, broadcastWebRTCSignaling, callbacks
  hooks/
    usePttTransmit.ts       # input PTT (tombol/keyboard), haptic, sound
    useAudioStreamer.ts     # inti mesh: peerConnectionsRef, recording, routing chunk
    useRadioOrchestrator.ts # komposisi tipis: audio + moderasi + reaksi
    useRadioAudioEngine.ts  # lifecycle transmit/receive, watchdog, AI ch.99, chirp
    useRadioModeration.ts   # kick/ban broadcast, wait-timer
    useRadioReactions.ts    # broadcast/receive reaksi + overlay
  services/
    channelSubscription.ts  # subscribeToChannel: Supabase presence + handler
    webrtcConfig.ts         # getIceServersConfig (STUN + optional TURN env)
    handlers/               # pttHandler, voiceHandler, modHandler
  utils/
    config.ts               # BRAND (single source of truth branding/channel)
    supabase.ts             # getSupabase() (lazy, fallback placeholder di dev)
    rateLimiter.ts          # broadcastRateLimiter (flood control)
    audioContext.ts         # shared AudioContext
    radioSound.ts           # oscillator UI sounds (press/release/chirp)
src/features/moderation/
  permissions.ts            # ChannelRole, canModerateRole, canUsePTT, ...
  useChannelRole.ts         # BACTH: baca role dari DB channel_roles
  useChannelSettings.ts     # pengaturan per-channel
```

---

## 4. State Management (Zustand)

`usePTTStore` adalah store tunggal, digabung dari 5 slice (`createAuthSlice`,
`createUISlice`, `createChannelSlice`, `createSettingsSlice`, `createWebRTCSlice`).
Setiap slice bertipe `StateCreator<PTTState>`. Tidak ada Redux/Context global lain.

Beberapa state krusial:
- `isPowerOn` — radio menyala/mati (gate utama).
- `isTransmitting` — sedang kirim suara (TX). `setTransmitting` memicu enable/disable mic.
- `activeTransmitter` — `userId` yang sedang TX (indikator RX di UI).
- `activeUsers` — daftar presence channel.
- `channelNumber` — channel aktif.

---

## 5. Audio Transport

### 5.1 Saat ini — WebRTC Mesh
`setiap user yang TX membuka RTCPeerConnection ke semua user lain`. Offerer ditentukan
melalui perbandingan UUID (`getChannelUUID` + sort). Voice dikirim sebagai **base64
chunk** via Supabase broadcast (`broadcastVoiceChunk` → event `voice_chunk`), lalu
di-replay di sisi penerima via `AudioContext.decodeAudioData`.

Batasan: mesh tidak skalabilitas untuk >~8 peer (ref: `david-spies/ptt-radio`
`MAX_PEERS=8`). Sesuai PRD target 10–50 user/channel, mesh akan saturasi.

### 5.2 Target — LiveKit SFU (SUDAH DIIMPLEMENTASI — dual-mode aktif)
Migrasi dijalankan **phase** via flag `VITE_LIVEKIT_URL` (AD-3):
- Kosong → mesh (behavior lama utuh, fallback/dev).
- Terisi → SFU: client publish 1 audio track, subscribe track semua user.

Abstraksi: `AudioTransport` (`src/app/services/audioTransport.ts`) adalah kontrak;
`LiveKitAudioTransport` (`src/app/services/livekitAudioTransport.ts`) implementasinya.
Switch `USE_SFU` (`src/app/utils/config.ts`) memilih topologi saat runtime.

Wiring SFU:
- `useRadioAudioEngine` (Task 8): saat `USE_SFU && isPowerOn`, ambil token via
  `fetchLiveKitToken(channel)` (Edge Function `livekit-token`), `getUserMedia` →
  `transport.publishMic`, `connect(room,token)`, `setMicEnabled(false)` (PTT off).
  TX on/off → `transport.setMicEnabled` (bukan `startRecording` mesh).
- Remote audio: `transport.onRemoteAudio` → `<audio>.srcObject = stream`.
- Inbound mesh (`setOnVoiceChunkReceived`) di-guard `!USE_SFU` (cegah double-play).
- Channel 100 (echo) **tidak** publish ke SFU — tetap loopback lokal (AD-4).

### 5.3 Presence (Task 12)
- Mesh: `activeUsers` dari Supabase presence sync (`channelSubscription.ts`).
- SFU: `LiveKitAudioTransport.onPresence` emit list dari `Room.participants`
  (local + remote) → tulis `activeUsers` di store. Supabase presence sync
  di-guard `!USE_SFU` agar tidak menimpa.
- Perbedaan kunci: SFU pakai **real count** (tanpa `simulatedUserOffset` +125 dev),
  karena jumlah participant akurat dari LiveKit.

---

## 6. Real-time & Signaling (Supabase Realtime)

`subscribeToChannel(channelNum)` membuat `supabase.channel('ptt-room-{n}')` dengan
konfigurasi `presence` + `broadcast: { self: true }`. Handler:
- **presence sync** → isi `activeUsers` (divalidasi via Zod `PresenceMetaSchema`).
- **broadcast `ptt_state`** → `handlePttState` (update `activeTransmitter`).
- **broadcast `voice_chunk`** → `handleVoiceChunk` (play audio).
- **broadcast `webrtc_signaling`** → `handleWebRTCSignaling` (offer/answer/candidate mesh).
- **broadcast moderation** → `handleKick`/`handleHangUp`/`handleUpdateRole`/`handleUpdateStatus`.

Rate limit: `broadcastRateLimiter` membatasi flood voice chunk.

---

## 7. Moderasi & Role (Server-Authoritative)

Role: `noc > sys_admin > pjc > operator > member ≈ guest`.

**Penting — keamanan**: `getGlobalRole()` di `permissions.ts` **sudah dihapus**
(return `null`). Role TIDAK boleh diambil dari `displayName`/`callSign` client-side
(bisa spoof: daftar sebagai "Pebe Herianto" → dapat akses NOC). Role dibaca dari
tabel `public.channel_roles` Supabase via `useChannelRole` pada saat join channel.

Aksi moderasi (mute/kick/ban/role/status) di-broadcast via Supabase dan **dicatat**
ke `channel_moderation_logs` (`logModerationAction`).

---

## 8. Channel Model

Channel statis didefinisikan di `BRAND`/`CHANNELS` (`config.ts`).
- `defaultChannel` — channel awal saat login.
- `isolatedChannels: [100]` — channel echo, audio tidak keluar ke jaringan.
- `simulatedUserOffset` — offset demo jumlah user; **0 di produksi**
  (`import.meta.env.PROD ? 0 : 125`). Jangan gunakan untuk metrik nyata.

---

## 9. Security Model

- `performSecurityAudit()` dijalankan saat app mount; di `PROD` memblokir jika isu kritis.
- Verifikasi signing fingerprint APK via native plugin + `VITE_EXPECTED_SIGNING_HASH`
  (lihat `SECURITY.md`).
- `getSupabase()` fallback ke placeholder di dev agar UI jalan tanpa env (bukan rahasia nyata).
- Tidak ada API key/token rahasia di client — LiveKit token akan di-generate di
  Supabase Edge Function (server-side), tidak di bundle.

---

## 10. Testing Strategy

- **Unit** (Vitest): store slices, permissions, rateLimiter, useWebRTC, channel 100 echo,
  realtime handlers (ptt/voice/webrtc), roomId, secureConfig. **Terukur 2026-07-21:
  233 test pass (19 file).** Coverage baseline (vitest --coverage): Lines ~20.6% /
  Branches ~14.4% — naikkan per batch, lihat `docs/TESTING.md`.
- **E2E** (Playwright): boot, PTT, moderasi, layout, voice streaming. Base URL
  `localhost:5188`, Chromium dengan fake media stream. **Butuh Playwright browser
  ter-install** (`npx playwright install chromium`) — di environment tanpa browser,
  E2E tidak dapat dijalankan; gunakan unit test + coverage sebagai bukti.
- **Lint/Type**: ESLint (`src/**/*.{ts,tsx}`) + `tsc --noEmit` wajib hijau sebelum merge
  (tsconfig sudah sertakan `vitest/globals` sehingga test file lolos type-check).

---

## 11. Build & Deploy

- `pnpm build` → `dist/` + PWA service worker (vite-plugin-pwa).
- `npx cap sync android` → sinkron ke `android/`.
- Deploy web: VPS (static + PWA). Deploy native: build APK/AAB.
- SFU: `livekit-server` self-host di VPS yang sama/terpisah (region SG dekat ID).
- Lihat `docs/DEPLOYMENT.md`.

---

## 12. Keputusan Arsitektur (Diambil alih Arsitek, 2026-07-20)

1. **SFU self-host di VPS**, bukan LiveKit Cloud.
2. **Moderasi tetap Supabase Realtime**, bukan LiveKit Data API.
3. **Rollout phase** via `VITE_LIVEKIT_URL` (dual-mode, mesh sebagai safety net).
4. **Channel 100 echo** tetap loopback lokal.

Rasionali & tradeoff lengkap di `docs/ROADMAP.md`.
