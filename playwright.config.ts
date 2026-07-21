// playwright.config.ts – NextVWT E2E Test Configuration
// Menggunakan dotenv untuk memuat .env lokal sesuai Golden Rule #7

import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env dari root project (sesuai user rules: wajib terhubung dotenv)
dotenv.config({ path: path.resolve(__dirname, '.env') });

// NOTE: .env sets VITE_LIVEKIT_URL=ws://localhost:7880 which makes USE_SFU=true.
// For E2E tests, SFU is disabled via VITE_E2E_DISABLE_SFU env var in webServer.env.
// Vite's define injects __E2E_DISABLE_SFU__ at compile time from process.env.

export default defineConfig({
  // ─── Test discovery ────────────────────────────────────────────────────────
  testDir: './e2e',
  testMatch: '**/*.spec.ts',

  // ─── Global settings ───────────────────────────────────────────────────────
  timeout: 30_000,               // 30s per test
  expect: { timeout: 8_000 },   // 8s per assertion
  fullyParallel: false,          // Serial untuk konsistensi UI tests
  retries: process.env.CI ? 2 : 0,
  workers: 1,                    // Single worker untuk stabilitas

  // ─── Reporter ──────────────────────────────────────────────────────────────
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  // ─── Global use ────────────────────────────────────────────────────────────
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5188',

    // Screenshots & Traces untuk debugging CI failures (sesuai user rules)
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'retain-on-failure',

    // Viewport: Desktop 1280x800 (sesuai user rules untuk E2E)
    viewport: { width: 1280, height: 800 },

    // Locale Indonesia untuk konsistensi teks
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
  },

  // ─── Projects (browsers) ───────────────────────────────────────────────────
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
          ],
        },
      },
    },
    // Origin 2: SFU mode. Aktif ONLY bila NEXTVWT_RUN_SFU_E2E=1
    // (butuh LiveKit jalan + Supabase Edge Function livekit-token deploy).
    // Menjalankan dev server DENGAN VITE_LIVEKIT_URL ter-set.
    ...(process.env.NEXTVWT_RUN_SFU_E2E === '1'
      ? [
          {
            name: 'chromium-sfu',
            use: {
              ...devices['Desktop Chrome'],
              launchOptions: {
                args: [
                  '--use-fake-ui-for-media-stream',
                  '--use-fake-device-for-media-stream',
                ],
              },
            },
          },
        ]
      : []),
  ],

  // ─── Web server: auto-start Vite dev server sebelum tests ─────────────────
  webServer: [
    {
      command: 'pnpm dev',
      url: 'http://localhost:5188',
      reuseExistingServer: true,
      timeout: 30_000,
      // Untuk project chromium-sfu, inject VITE_LIVEKIT_URL via env
      env:
        process.env.NEXTVWT_RUN_SFU_E2E === '1'
          ? { VITE_LIVEKIT_URL: process.env.VITE_LIVEKIT_URL || 'ws://localhost:7880' }
          : { VITE_E2E_DISABLE_SFU: '1' },
    },
  ],

  // ─── Output directories ────────────────────────────────────────────────────
  outputDir: 'test-results/',
});
