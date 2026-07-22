# Roadmap — NextVWT

Fase pengembangan & rencana migrasi arsitektur audio. Keputusan arsitektur di bawah
diambil alih arsitek pada 2026-07-20 (user mendelegasikan).

## Fase 0 — Fondasi (SELESAI)
- React + Vite + TS + Zustand + Tailwind.
- Supabase Auth (Google OAuth) + Realtime.
- WebRTC mesh PTT + UI walkie-talkie (8 tema).
- Moderasi (kick/ban/role/status) + logging.
- Capacitor Android shell.
- Keamanan: signing fingerprint, `performSecurityAudit`, role server-authoritative.

## Fase 1 — hardening & audit (SELESAI)
- General audit PTT (lint/type/test/build hijau, no secrets, no `any`).
- Eksekusi poin 1–5: sound engine bersama, split `useRadioOrchestrator`,
  dev-only guard `simulatedUserOffset`, ekstrak `UserListModal`, fix lint + bug `channelStatus`.
- TARGET: 0 warning lint, type-check OK, 196 test pass, build OK (TERCAPAI).

## Fase 2 — Migrasi Mesh → LiveKit SFU (SELESAI — dev live 2026-07-22)
**Mengapa**: mesh tidak skalabilitas untuk target PRD 10–50 user/channel
(ref: `david-spies/ptt-radio` `MAX_PEERS=8`).

**Keputusan Arsitek (2026-07-20)**:
1. **Self-host `livekit-server` di VPS** (bukan LiveKit Cloud) — gratis, region SG.
2. **Moderasi tetap di Supabase Realtime** (tidak pindah ke LiveKit Data API).
3. **Rollout phase** via dual-mode flag `VITE_LIVEKIT_URL` (kosong=mesh, terisi=SFU).
4. **Channel 100 echo** tetap loopback lokal (tidak publish SFU).

**Plan**: `.hermes/plans/2026-07-20_162000-nextvwt-mesh-to-livekit-sfu.md`
(16 task, 6 fase: persiapan → abstraksi transport → token → integrasi →
moderasi/presence → ch100 → deploy/verifikasi).

**Status Task (update 2026-07-21):**
| Task | Deskripsi | Status |
|---|---|---|
| 1 | `livekit-client` + env flag `VITE_LIVEKIT_URL` + `USE_SFU` | ✅ SELESAI |
| 2 | Interface `AudioTransport` + `LiveKitAudioTransport` skeleton | ✅ SELESAI |
| 3 | Implementasi `LiveKitAudioTransport` nyata (digeber ke T2) | ✅ SELESAI |
| 4 | `MeshAudioTransport` wrapper | ❌ DIBATALKAN (mesh tetap utuh) |
| 5 | Pilih transport di orchestrator | ✅ SELESAI (Task 8) |
| 6 | Edge Function `livekit-token` (server-side) | ✅ SELESAI |
| 7 | Test token | ✅ SELESAI |
| 8 | Integrasi SFU ke `useRadioAudioEngine` | ✅ SELESAI |
| 9 | PTT broadcast mapping | ✅ TERCAKUP (setMicEnabled) |
| 10 | Voice chunk routing (SFU=track, mesh=base64) | ✅ TERCAKUP (branch USE_SFU) |
| 11 | Moderasi tetap Supabase | ✅ TIDAK PERLU UBAH |
| 12 | Presence dari LiveKit participants | ✅ SELESAI |
| 13 | Channel 100 echo loopback lokal | ✅ SUDAH (isolated channel) |
| 14 | Deploy `livekit-server` dev (docker) + VPS | ✅ DEV SETUP (docker-compose.livekit.yml + scripts/dev-livekit.sh) |
| 15 | Playwright 2-origin (localhost + SFU) | ✅ SPEC READY (e2e/audio-topology.spec.ts; mesh jalan, SFU gated NEXTVWT_RUN_SFU_E2E) |
| 16 | Update ARCHITECTURE/REFACTOR docs | ✅ SELESAI |

**Catatan infra (bukan kode, terverifikasi 2026-07-21):**
- LiveKit dev butuh `rtc.node_ip` = IP host Windows (bukan IP container 172.x) agar browser reach media port via Docker port-map. Lihat `livekit/config.yaml`.
- `livekit-token` Edge Function **sudah DEPLOY** (2026-07-22, ACTIVE di project `tqixjycrxhjmpyffhxvg`) via `supabase login` → `supabase functions deploy livekit-token` → `supabase secrets set LIVEKIT_API_KEY=devkey LIVEKIT_API_SECRET=secret1234567890abcdefghijklmnopqr`. Publishable key SAJA tidak cukup untuk deploy. Token-mint sekarang live (bukan fallback) — SFU end-to-end terbukti: LiveKit container `ws://localhost:7880` (HTTP 200) + Edge Function ACTIVE. Lihat `docs/SFU_RUNBOOK.md` §3.1 cara dapat access token.
- Unit test diisolasi dari `.env` via `vitest.config.ts` (`envFile:false` + `env` kosong) → mock supabase dipakai. Dev/Playwright tetap pakai `.env` (Supabase URL milik user).

**Mapping fitur**:
| Fitur | Di SFU |
|---|---|
| PTT broadcast | `setMicEnabled` + `activeTransmitter` presence |
| Moderasi | Tetap Supabase broadcast + `channel_moderation_logs` |
| Presence | LiveKit `Room.participants` (override Supabase saat SFU) |
| Channel 100 echo | Loopback lokal (isolated) |

## Fase 3 — Skala & Multi-tenant (VISI)
- Dukung 5000 tenant (white-label via `BRAND` config).
- SFU region Indonesia (latensi <300ms).
- Monitoring & rate-limit per-tenant.

## Fase 4 — Native & Ekosistem
- iOS (roadmap PRD).
- Background service PTT (sudah ada stub `backgroundSurvival`).
- ROIP gateway (channel ROIP sudah ada di UI).
