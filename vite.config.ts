import { defineConfig, loadEnv, type PluginOption } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig(({ command: _command, mode }) => {
  // Load env file based on `mode` in the working directory.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: './',
    // Development server configuration
    server: {
      port: 5188,
      host: 'localhost',
      // For mobile testing via local network
      strictPort: true,
    },

    // Build configuration for production
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'terser',
      // [FIX P1-5] Warn jika ada chunk > 1500KB (default 500)
      chunkSizeWarningLimit: 1500,
      // Target modern browsers yang mendukung WebRTC & AudioContext
      target: ['es2020', 'chrome90', 'firefox90', 'safari14'],
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          // [PERF] passes: 2 sudah cukup, 3 menambah build time tanpa manfaat signifikan
          passes: 2,
        },
        mangle: {
          toplevel: true,
        },
        format: {
          comments: false,
        },
      },
      // [FIX P1-5] KRITIS: Logika manualChunks dibalik!
      // Sebelumnya: production = undefined (satu giant bundle) ← SALAH
      // Sekarang:   production = full code splitting         ← BENAR
      // Code splitting LEBIH PENTING di production untuk:
      //   1. Caching browser (vendor chunks jarang berubah)
      //   2. Parallel download (HTTP/2 multiplexing)
      //   3. Faster Time-to-Interactive (TTI)
      rollupOptions: {
        output: {
          manualChunks: mode !== 'production' ? undefined : {
            // Core React runtime — paling jarang berubah, cache terlama
            'vendor-react': ['react', 'react-dom'],

            // Supabase client — dipisah karena cukup besar (~200KB)
            'vendor-supabase': ['@supabase/supabase-js'],

            // Framer Motion / animation — besar & jarang berubah
                        // [REMOVED] 'vendor-motion': ['motion'],

            // Lucide icons — ratusan icons, dipisah agar tree-shakeable per chunk
            'vendor-icons': ['lucide-react'],

            // Semua Radix UI primitives — UI library stabil, cache lama
            'vendor-radix': [
              '@radix-ui/react-alert-dialog',
              '@radix-ui/react-avatar',
              '@radix-ui/react-checkbox',
              '@radix-ui/react-collapsible',
              '@radix-ui/react-context-menu',
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-hover-card',
              '@radix-ui/react-label',
              '@radix-ui/react-popover',
              '@radix-ui/react-progress',
              '@radix-ui/react-scroll-area',
              '@radix-ui/react-select',
              '@radix-ui/react-separator',
              '@radix-ui/react-slider',
              '@radix-ui/react-slot',
              '@radix-ui/react-switch',
              '@radix-ui/react-tabs',
              '@radix-ui/react-toggle',
              '@radix-ui/react-toggle-group',
              '@radix-ui/react-tooltip',
            ],

            // Zustand state management
                        'vendor-zustand': ['zustand'],

                        // Router - [REMOVED] react-router tidak dipakai di codebase
                        // 'vendor-router': ['react-router'],
          },
        },
      },
    },

    plugins: [
      figmaAssetResolver(),
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          name: 'NextVWT',
          short_name: 'NextVWT',
          description: 'Next Virtual Walkie Talkie - Real-time PTT communication platform',
          theme_color: '#0c62a8',
          background_color: '#0a1423',
          display: 'standalone',
          orientation: 'portrait',
          start_url: './index.html',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: ({ url }) => {
                return (
                  url.host.includes('supabase.co') ||
                  url.pathname.includes('/api/')
                )
              },
              handler: 'NetworkOnly'
            }
          ]
        },
        devOptions: {
          enabled: true
        }
      })
    ].filter(Boolean) as PluginOption[],

    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],

    optimizeDeps: {
      entries: ['index.html'],
      exclude: ['@opentelemetry/api'],
    },

    // Vitest configuration – exclude Playwright e2e spec files from unit test discovery
    test: {
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/*.spec.ts'],
      exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
      // [P2-7] jsdom agar React hooks (renderHook) dan Web APIs (window, document) tersedia
      environment: 'jsdom',
      // Globals: true agar vi/describe/it/expect tersedia tanpa import di tiap file test
      globals: true,
      setupFiles: [],
      // [P2-7] Coverage config menggunakan @vitest/coverage-v8 (V8 native, lebih cepat dari istanbul)
      coverage: {
        provider: 'v8',
        // [COVERAGE] Ukur SELURUH src/ secara jujur (bukan cuma 3 file).
        // Entrypoints (main.tsx/App.tsx) & e2e di-exclude dari threshold
        // agar angka mewakili logic yang bisa di-test, bukan bootstrap.
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          '**/*.test.ts',
          '**/*.test.tsx',
          'src/main.tsx',
          'src/App.tsx',
          '**/*.d.ts',
          'e2e/**',
        ],
        // [COVERAGE] Threshold BERTAHAP — naik tiap batch test baru.
        // Baseline riil (seluruh src/): ~32.5% L / 24.3% B / 23% F / 32.7% S.
        //   Tahap 1 (done): 25 / 20 / 18 / 25
        //   Tahap 2 (skrg): 30 / 25 / 22 / 30   <-- aktif
        //   Tahap 3 (target): 40 / 35 / 32 / 40
        //   Tahap 4 (target): 50 / 45 / 42 / 50  ... -> 100.
        thresholds: {
          lines: 30,
          functions: 22,
          branches: 25,
          statements: 30,
        },
        reporter: ['text', 'html', 'lcov'],
        reportsDirectory: './coverage',
      },
    },


    // Define global constants for use in the app
    define: {
      // Pass environment variables to the client
      'import.meta.env.VITE_VERCEL_ENV': JSON.stringify(env.VITE_VERCEL_ENV),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL),
      // E2E: compile-time flag to disable SFU (set via webServer.env in Playwright config)
      __E2E_DISABLE_SFU__: JSON.stringify(process.env.VITE_E2E_DISABLE_SFU === '1'),
    },
  }
})
