# NextVWT — Virtual Walkie-Talkie (PTT) App

Aplikasi **Push-To-Talk (PTT)** bergaya walkie-talkie virtual untuk koordinasi komunitas
(radio amatir, kepanitiaan, komunitas lokal). Berjalan di web (PWA) dan Android (Capacitor),
dengan audio real-time antar pengguna melalui WebRTC.

> Bahasa dokumentasi: Indonesia. Kode & komentar: Indonesia/Inggris campuran.

## Status
- **Tahap**: Prototipe fungsional → Beta
- **Audio transport**: WebRTC **mesh** (saat ini) → **LiveKit SFU** (rencana produksi, lihat `docs/ROADMAP.md`)
- **PRD**: `PRD.md` (v1.0, Draft — Review Internal)

## Stack Singkat
| Layer | Teknologi |
|---|---|
| UI | React 18 + Vite + TypeScript + Tailwind CSS |
| State | Zustand (slices) |
| Realtime/Audio | Supabase Realtime (presence + broadcast) + WebRTC mesh |
| Auth/DB | Supabase (Auth, Postgres) |
| Native | Capacitor (`com.nextvwt.ptt`) |
| Test | Vitest (unit) + Playwright (e2e) |

## Struktur Dokumen
- `PRD.md` — Product Requirements Document (kebutuhan produk)
- `ARCHITECTURE.md` — Arsitektur sistem & pengambilan keputusan teknis
- `SECURITY.md` — Checklist keamanan & signing fingerprint
- `docs/ENVIRONMENT.md` — Variabel environment & konfigurasi
- `docs/DEPLOYMENT.md` — Build, deploy VPS, Capacitor Android
- `docs/SFU_RUNBOOK.md` — **LiveKit SFU**: jalankan, verifikasi, troubleshooting
- `docs/TESTING.md` — Cara menjalankan unit & e2e test
- `docs/CONTRIBUTING.md` — Konvensi kode & alur kontribusi
- `docs/ROADMAP.md` — Fase pengembangan & migrasi mesh → SFU

## Quick Start
```bash
pnpm install
cp .env.example .env        # isi VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
pnpm dev                    # http://localhost:5188
```

## Quick Start — SFU (LiveKit)
Mode mesh default jalan tanpa SFU. Untuk aktifkan SFU (audio via server):
```bash
# 1. Salin env & isi VITE_LIVEKIT_URL=ws://localhost:7880
cp .env.example .env
# 2. Jalankan stack dev (LiveKit + Supabase Edge Function token)
bash scripts/dev-livekit.sh
# 3. App otomatis pakai SFU saat VITE_LIVEKIT_URL terisi (lihat docs/SFU_RUNBOOK.md)
```
Verifikasi: `curl -s -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:7880/`
harus mencetak `HTTP 200`.

## Scripts
| Perintah | Fungsi |
|---|---|
| `pnpm dev` | Dev server Vite (port 5188) |
| `pnpm build` | Production build + PWA |
| `pnpm lint` | ESLint |
| `pnpm type-check` | `tsc --noEmit` |
| `pnpm test` | Vitest (unit) |
| `pnpm test:e2e` | Playwright |

## Struktur Kode (ringkas)
```
src/app/
  store/        # Zustand: slices (auth, ui, channel, settings, webrtc) + types
  hooks/        # usePttTransmit, useAudioStreamer, useRadioOrchestrator (+ split)
  services/     # channelSubscription, webrtcConfig, handlers (ptt/voice/mod)
  components/   # UI (RadioLayout, UserListModal, PTTButton, ...)
  utils/        # config (BRAND/CHANNELS), supabase, rateLimiter, audioContext
src/features/moderation/  # permissions, useChannelRole, useChannelSettings
supabase/       # migrations + edge functions (moderate-channel, payment-webhook, ...)
e2e/            # Playwright specs
```

## Keputusan Arsitektur Kunci (2026-07-20)
1. **SFU self-host di VPS** (bukan LiveKit Cloud) — konsisten strategi deploy.
2. **Moderasi tetap di Supabase Realtime** (tidak pindah ke LiveKit Data API).
3. **Rollout phase** via flag `VITE_LIVEKIT_URL` (kosong = mesh, terisi = SFU).
4. **Channel 100 = echo**, tetap loopback lokal (tidak publish ke SFU).

Lihat `ARCHITECTURE.md` untuk detail.
