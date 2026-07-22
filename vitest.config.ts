import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Unit test diisolasi dari backend nyata: jangan load .env, dan paksa
    // env Supabase/LiveKit kosong agar mock supabase dipakai (bukan client nyata).
    envFile: false,
    env: {
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_PUBLISHABLE_KEY: '',
      VITE_LIVEKIT_URL: '',
    },
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        // BASELINE TERUKUR 2026-07-21 (vitest run --coverage):
        //   lines 20.59% / statements 20.35% / functions 14.09% / branches 14.44%
        // Ini adalah FLOOR jujur, bukan target akhir. Naikkan per batch saat
        // test logic inti (features/*, komponen UI) ditambah. JANGAN set 100%
        // sebelum benar-benar terukur — lihat docs/TESTING.md.
        branches: 14,
        // TAHAP 3 (2026-07-22, rtl batch): terukur 34.61% L / 26.49% B / 27.3% F /
        // 34.84% S setelah +64 test (logic + komponen UI presentasional).
        // NAHAP 4 (2026-07-22, komponen berat + services WebRTC): terukur 50.15% L /
        // 44.33% B / 48.07% F / 50.73% S setelah +135 test (RadioLayout, SettingsPanel,
        // RadioBody/Header/Footer, useSfuTransport, FloatingKaraokePlayer,
        // ChannelListModal, UserListModal, dll). Threshold dinaikkan mendekati riil
        // tapi tetap di bawah measured agar CI hijau & jujur.
        branches: 49,
        // TAHAP 6 (terbukti hijau di CI run 29935470556): 54.81 L / 50.05 B /
        // 51.59 F / 55.68 S setelah +17 test. TAHAP 7 DITUNDA: coverage full
        // run di CI crash (vitest emitUnexpectedExit, bukan threshold) — diduga
        // instrumentasi coverage + akumulasi 118 test files / rAF loop di
        // useAudioVisualizer. Kembalikan ke Tahap 6 sampai cara jalan coverage
        // stabil ditemukan (pool forks / split coverage).
        functions: 51,
        lines: 54,
        statements: 54,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
