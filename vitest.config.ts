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
        // Naikkan per batch saat test komponen berat (RadioLayout, store slices,
        // services) ditambah. JANGAN set 100% sebelum benar-benar terukur.
        branches: 26,
        functions: 27,
        lines: 34,
        statements: 34,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
