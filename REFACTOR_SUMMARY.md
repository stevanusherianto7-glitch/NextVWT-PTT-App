# Refactor Summary — NextVWT

## Sprint 1 — Security & Critical
- [x] window.usePTTStore dihapus dari App.tsx
- [x] ROLE_PRIORITY diganti dengan roleRank dari permissions.ts
- [x] Role dibaca dari Zustand state (myChannelRole) bukan localStorage langsung
- [x] 34 file Python dipindah ke scripts/icon-tools/

## Sprint 2 — Modularitas
- [x] subscribeToChannel diekstrak ke src/app/services/channelSubscription.ts
- [x] Heartbeat timeout handler diimplementasi
- [x] RadioLayout.tsx dipecah ke src/app/components/radio/
- [x] PTTButton.tsx dipecah dengan usePttTransmit dan useLongPress hooks
- [x] usePTTStore.ts setelah refactor: 34 baris (target < 80)
- [x] RadioLayout.tsx setelah refactor: 147 baris (target < 150)
- [x] PTTButton.tsx setelah refactor: 121 baris (target < 150)

## Sprint 3 — Biznet Gio Readiness
- [x] ALLOWED_ORIGINS diupdate di turn-credentials/index.ts
- [x] StaticProvider diupdate dengan env var COTURN_URL/USERNAME/CREDENTIAL
- [x] README.md ditambahkan di turn-credentials/
- [x] .env.example diupdate dengan template Biznet Gio
- [x] @ts-nocheck dihapus dari turn-credentials/index.ts

## LiveKit SFU Dual-Mode (2026-07-20 → 2026-07-22)
- [x] Mesh + SFU dual-mode via VITE_LIVEKIT_URL / USE_SFU
- [x] AudioTransport interface + LiveKitAudioTransport
- [x] livekit-token Edge Function (server-side mint, room-scoped)
- [x] Integrasi ke useRadioAudioEngine; presence dari LiveKit participants
- [x] **2026-07-22: DEPLOYED** — LiveKit container lokal (`ws://localhost:7880`, HTTP 200) + Edge Function `livekit-token` **ACTIVE** di Supabase Cloud (project `tqixjycrxhjmpyffhxvg`). SFU end-to-end live. Lihat `docs/SFU_RUNBOOK.md`.

## Build Status
- pnpm type-check: PASS (diperbaiki 2026-07-21 — tsconfig.types ditambah vitest/globals; test files taip ulang)
- pnpm build: PASS
- pnpm test: PASS (253+ tests, 19 file)
- pnpm lint: 0 error / 4 warning

## Catatan Coverage (diukur nyata, 2026-07-21)
- `vitest run --coverage` baseline: Lines ~20%, Branches ~14% (sebagian besar
  features/* dan komponen UI masih 0%).
- Util/logic inti (permissions, rateLimit, roomId, config, supabase, secureConfig,
  realtime handlers) sudah ter-cover. Target: naikkan coverage per batch,
  jangan klaim 100% sebelum terukur.

## Masalah yang Ditemukan Selama Refactor
- tsconfig.json tidak menyertakan `vitest/globals` → tsc gagal pada test file
  yang pakai `vi`/`beforeEach` global. SUDAH DIPERBAIKI.
- REFACTOR_SUMMARY lama salah menyatakan "196 tests" dan "type-check PASS"
  padahal saat itu tsc FAIL. SUDAH DIPERBAIKI di dokumen ini.
