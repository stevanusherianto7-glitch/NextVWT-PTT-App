# Testing — NextVWT

## 1. Unit (Vitest)

```bash
pnpm test                 # jalankan semua (~19 file, 253+ test)
pnpm test src/app/store/slices/createWebRTCSlice.test.ts   # file spesifik
npx vitest run --coverage # jalankan + ukur coverage (bukan klaim kosong)
```

Konfigurasi: `vitest.config.ts`. Environment: `jsdom` untuk store/hook, `node` untuk util.
Fokus coverage: permissions (`permissions.test.ts`), rateLimiter, useWebRTC,
channel 100 echo, realtime handlers (ptt/voice/webrtc), roomId, config, supabase, secureConfig.

**Gate**: semua test harus hijau sebelum merge. Jangan sementara-disable.

> Catatan coverage (diukur 2026-07-21): baseline Lines ~20%, Branches ~14%.
> Naikkan per batch dengan test pada logic inti; jangan asumsikan 100%.

## 2. E2E (Playwright)

```bash
pnpm test:e2e             # butuh server di :5188 (auto-start via webServer config)
```

- Config: `playwright.config.ts` (baseURL `localhost:5188`, Chromium fake media).
- Spec: `e2e/*.spec.ts` (app-boot, channel-scan, karaoke-ptt, ptt-safeguards, voice-streaming, ...).
- Screenshot hanya di-fail (`screenshot: 'only-on-failure'`).
- Untuk cek visual manual: `npx playwright test --project=chromium --headed`.

> PERHATIAN: E2E butuh Playwright browser ter-install (`npx playwright install chromium`).
> Di environment tanpa browser, `pnpm test:e2e` TIDAK bisa dijalankan — gunakan
> unit test + `vitest --coverage` sebagai bukti, bukan klaim E2E hijau.

## 3. Lint & Type

```bash
pnpm lint                 # ESLint src/**/*.{ts,tsx}
pnpm type-check           # tsc --noEmit (wajib 0 error; tsconfig sudah sertakan vitest/globals)
```

Keduanya wajib **0 error** (warning boleh, tapi usahakan 0).

## 4. Alur Verifikasi Sebelum Merge
1. `pnpm lint` → 0 error
2. `pnpm type-check` → exit 0
3. `pnpm test` → semua hijau
4. `pnpm build` → exit 0
5. (jika ubah UI/audio) `pnpm test:e2e` → hijau + cek screenshot (butuh browser)

## 5. Tips
- `useWebRTC.test.ts` mock peer connection; jangan butuh mic asli.
- Playwright pakai `--use-fake-device-for-media-stream` → tidak butuh mic fisik.
- Jika test flaky pada timing audio, naikkan `expect.timeout` di config, jangan `--force`.
