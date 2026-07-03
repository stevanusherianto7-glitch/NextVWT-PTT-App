# Agent Prompt — NextVWT GitHub Actions CI/CD Fix & Hardening

> **Cara pakai:** Paste prompt ini ke Claude Code, Cursor Agent, atau AI coding
> agent yang punya akses ke root folder project NextVWT.
> Repository: https://github.com/stevanusherianto7-glitch/NextVWT-PTT-App-Prototype
> Jalankan dari root direktori project. Baca seluruh prompt sebelum memulai.

---

## KONTEKS

GitHub Actions pipeline NextVWT saat ini **selalu failing** (exit code 1).
Pipeline sudah memiliki struktur yang benar (2 job: CI → CD Android),
tapi ada 6 masalah yang harus diperbaiki agar pipeline bisa hijau dan
bisa dijadikan quality gate sebelum merge ke `main`.

**Data dari run terbaru (run #209, 28 Juni 2026):**
- Job `Validate & Test (CI)` → ❌ FAIL (step 14: Cypress exit code 1)
- Job `Build & Sign Android (CD)` → ⏭️ SKIP (tidak jalan karena CI fail duluan)
- Artifact `playwright-report` berhasil diupload
- Artifact `test-results/` gagal diupload (path tidak ditemukan)

**Pola dari 309 workflow runs sebelumnya:**
- Banyak commit `fix(cypress):` dan `fix(e2e):` → E2E Cypress terus gagal
- Run cepat (12–23 detik) = fail di lint/typecheck sebelum sampai test
- Run lambat (3–4 menit) = fail di Cypress/Playwright

---

## FASE 0 — ORIENTASI & BACA WORKFLOW

### 0.1 Baca semua file workflow

```bash
cat .github/workflows/ci-cd.yml
echo "========"
cat .github/workflows/ci.yml 2>/dev/null || echo "[ci.yml tidak ada]"
echo "========"
ls .github/workflows/
```

Catat:
- Nama setiap job dan step-nya
- Node.js version yang dipakai
- Test runner yang digunakan (Cypress, Playwright, Vitest, atau kombinasi)
- Path artifact yang di-upload
- Environment variables dan secrets yang dibutuhkan

### 0.2 Baca konfigurasi test

```bash
cat cypress.config.ts 2>/dev/null || cat cypress.config.js 2>/dev/null || echo "[cypress config tidak ada]"
echo "========"
cat playwright.config.ts 2>/dev/null || echo "[playwright config tidak ada]"
echo "========"
cat vitest.config.ts 2>/dev/null || echo "[vitest config tidak ada]"
echo "========"
ls e2e/ 2>/dev/null || echo "[folder e2e tidak ada]"
ls cypress/ 2>/dev/null || echo "[folder cypress tidak ada]"
ls src/e2e/ 2>/dev/null || echo "[folder src/e2e tidak ada]"
```

### 0.3 Cek semua annotation error dari run terakhir

```bash
pnpm lint 2>&1 | tee /tmp/lint-output.txt
pnpm type-check 2>&1 | tee /tmp/typecheck-output.txt
pnpm test --run 2>&1 | tee /tmp/vitest-output.txt
```

Catat semua error sebelum lanjut.

### 0.4 Laporkan hasil Fase 0

Sebelum melanjutkan, buat ringkasan:
- Workflow file mana yang aktif?
- Test runner apa yang dipakai di CI?
- Error apa yang muncul dari lint, typecheck, vitest?

---

## FASE 1 — FIX LINT ERRORS

### Task 1.1 — Hapus semua `console.log` dari source code

**Masalah:** ESLint rule `no-console` (atau custom rule) melarang
`console.log` di source code produksi. Ditemukan di `channelSubscription.ts:88`.

**Langkah:**

1. Cari semua `console.log` di source code (bukan test file):
```bash
grep -rn "console\.log" src/ \
  --include="*.ts" --include="*.tsx" \
  --exclude-pattern="*.test.*" \
  --exclude-pattern="*.spec.*"
```

2. Untuk setiap `console.log` yang ditemukan:

   **Jika untuk debugging info → ganti dengan `console.warn`:**
   ```ts
   // Sebelum:
   console.log('[HeartBeat] Ping sent:', pingId);
   
   // Sesudah:
   console.warn('[HeartBeat] Ping sent:', pingId);
   ```

   **Jika untuk error → ganti dengan `console.error`:**
   ```ts
   // Sebelum:
   console.log('[Error] Subscription failed:', err);
   
   // Sesudah:
   console.error('[Error] Subscription failed:', err);
   ```

   **Jika hanya debug sementara → hapus sepenuhnya:**
   ```ts
   // Hapus baris seperti:
   console.log('DEBUG payload:', payload);
   console.log('state before:', get());
   ```

3. Verifikasi setelah fix:
```bash
grep -rn "console\.log" src/ --include="*.ts" --include="*.tsx" \
  --exclude-pattern="*.test.*"
# Harus tidak ada output
```

---

### Task 1.2 — Fix semua `any` type di source files

**Masalah:** ESLint rule `@typescript-eslint/no-explicit-any` melarang
penggunaan type `any`. Ditemukan di:
- `RadioBody.tsx:32`
- `RadioLayout.tsx:126` dan `149`
- `UserListModal.tsx:672`

**Langkah:**

1. Baca setiap baris yang bermasalah:
```bash
grep -n "any" src/app/components/RadioBody.tsx | head -5
grep -n "any" src/app/components/RadioLayout.tsx | head -10
grep -n "any" src/app/components/modals/UserListModal.tsx | head -5
```

2. Ganti `any` dengan type yang tepat sesuai konteks:

   **Pola umum dan penggantinya:**

   ```ts
   // Event handler yang pakai any:
   const handleEvent = (e: any) => { ... }
   // Ganti dengan:
   const handleEvent = (e: React.PointerEvent<HTMLButtonElement>) => { ... }
   // atau untuk custom event:
   const handleEvent = (e: CustomEvent<{ data: unknown }>) => { ... }

   // Capacitor plugin yang pakai any:
   const plugin = (window as any).CapacitorPlugin;
   // Ganti dengan:
   const plugin = (window as Record<string, unknown>).CapacitorPlugin;

   // Object yang belum diketahui strukturnya:
   const data: any = await fetch(...).json();
   // Ganti dengan:
   const data: unknown = await fetch(...).json();

   // Callback dari library eksternal tanpa type:
   supabase.channel().on('broadcast', { event: 'ptt_state' }, (payload: any) => {})
   // Ganti dengan:
   supabase.channel().on('broadcast', { event: 'ptt_state' }, (payload: { payload: unknown }) => {})
   ```

3. Untuk Zustand store callbacks yang kompleks, gunakan:
   ```ts
   // Jika susah di-type, gunakan unknown + type guard:
   function isValidPayload(p: unknown): p is PttStatePayload {
     return PttStatePayloadSchema.safeParse(p).success;
   }
   ```

4. Verifikasi:
```bash
pnpm lint --quiet 2>&1 | grep "no-explicit-any"
# Harus tidak ada output
```

---

### Task 1.3 — Fix `any` type di test files

**Masalah:** `useAudioStreamer.test.ts:83,87,88,112` menggunakan `any`.

**Langkah:**

1. Baca baris yang bermasalah:
```bash
sed -n '80,115p' src/app/hooks/useAudioStreamer.test.ts
```

2. Ganti `any` di test file dengan type yang sesuai:
   ```ts
   // Pola umum di test files:
   
   // Mock yang pakai any:
   const mockFn = vi.fn() as any;
   // Ganti dengan:
   const mockFn = vi.fn();
   
   // Spy result yang pakai any:
   const result = renderHook(() => useHook()) as any;
   // Ganti dengan:
   const { result } = renderHook(() => useHook());
   
   // Cast untuk access mock internals:
   (module as any).fn.mockReturnValue(...)
   // Ganti dengan:
   vi.mocked(module.fn).mockReturnValue(...)
   ```

3. Untuk cast yang memang diperlukan di test, gunakan comment ESLint disable
   yang tepat sasaran (satu baris, bukan seluruh file):
   ```ts
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   const complexMock = createComplexMock() as any;
   ```

---

### Task 1.4 — Fix `useEffect` missing dependency

**Masalah:** `UserListModal.tsx:732` — `useEffect` punya dependency yang
hilang dari dependency array, menyebabkan ESLint rule
`react-hooks/exhaustive-deps` error.

**Langkah:**

1. Baca context baris 720–745:
```bash
sed -n '720,745p' src/app/components/modals/UserListModal.tsx
```

2. Tambahkan dependency yang hilang. Pola umum:
   ```ts
   // Sebelum (dependency hilang):
   useEffect(() => {
     const mapped = mapUsers(users);
     setMapped(mapped);
   }, [users]); // ← mapUsers hilang!
   
   // Opsi A — tambahkan ke dependency array:
   useEffect(() => {
     const mapped = mapUsers(users);
     setMapped(mapped);
   }, [users, mapUsers]);
   // Dan wrap mapUsers dengan useCallback agar stable referencenya:
   const mapUsers = useCallback((u: User[]) => {
     return u.map(user => ({ ...user, label: user.displayName }));
   }, []); // deps sesuai isi fungsi
   
   // Opsi B — jika mapUsers adalah fungsi pure yang tidak perlu di-memo:
   // Pindahkan definisi mapUsers ke DALAM useEffect:
   useEffect(() => {
     const mapUsers = (u: User[]) => u.map(user => ({ ...user, label: user.displayName }));
     const mapped = mapUsers(users);
     setMapped(mapped);
   }, [users]);
   ```

3. Pilih opsi yang paling sesuai dengan konteks aktual di file.

4. Verifikasi:
```bash
pnpm lint --quiet 2>&1 | grep "exhaustive-deps"
# Harus tidak ada output
```

---

### Checkpoint Fase 1

```bash
pnpm lint 2>&1 | tail -5
# Target: "0 problems"
```

Laporkan hasil sebelum lanjut ke Fase 2.

---

## FASE 2 — FIX CYPRESS / E2E CONFIGURATION

### Task 2.1 — Diagnosa masalah `specPattern` Cypress

**Masalah:** Run terbaru gagal karena Cypress tidak menemukan spec files.
Commit terakhir mencoba fix ini tapi masih failing.

**Langkah:**

1. Baca konfigurasi Cypress saat ini:
```bash
cat cypress.config.ts 2>/dev/null || cat cypress.config.js
echo "========"
ls -la e2e/ cypress/ cypress/e2e/ 2>/dev/null
echo "========"
find . -name "*.cy.ts" -o -name "*.cy.js" -o -name "*.spec.ts" \
  | grep -v node_modules | head -20
```

2. Identifikasi mismatch antara `specPattern` di config dan lokasi file aktual.

3. **Perbaiki sesuai kondisi yang ditemukan:**

   **Skenario A — File `.cy.ts` di folder `cypress/e2e/`:**
   ```ts
   // cypress.config.ts
   export default defineConfig({
     e2e: {
       specPattern: 'cypress/e2e/**/*.cy.{ts,tsx,js,jsx}',
       supportFile: 'cypress/support/e2e.ts',
       baseUrl: 'http://localhost:5173',
     },
   });
   ```

   **Skenario B — File `.spec.ts` di folder `e2e/` (Playwright-style):**
   ```ts
   // cypress.config.ts
   export default defineConfig({
     e2e: {
       specPattern: 'e2e/**/*.spec.{ts,tsx,js,jsx}',
       baseUrl: 'http://localhost:5173',
     },
   });
   ```

   **Skenario C — File ada tapi nama extension salah:**
   ```bash
   # Rename semua .spec.ts ke .cy.ts (jika pakai Cypress):
   find e2e/ -name "*.spec.ts" | while read f; do
     mv "$f" "${f/.spec.ts/.cy.ts}"
   done
   ```

   **Skenario D — Cypress dan Playwright tercampur (YANG PALING MUNGKIN):**
   Jika project memakai **Playwright** tapi workflow juga menjalankan Cypress,
   ada konflik. Pilih satu runner saja:

   ```bash
   # Cek apakah ada keduanya:
   cat package.json | grep -E '"cypress|playwright"'
   ```

   Jika ada keduanya → lihat Task 2.2.

---

### Task 2.2 — Pilih satu E2E runner (Cypress ATAU Playwright)

**Context NextVWT:** Codebase memiliki Playwright config (`playwright.config.ts`)
dan 13 file spec Playwright di `e2e/`. Tapi CI workflow juga menjalankan Cypress.
Ini kemungkinan penyebab utama failing berulang.

**Rekomendasi: Gunakan Playwright saja** karena:
- 13 spec sudah ditulis untuk Playwright
- `playwright.config.ts` sudah dikonfigurasi dengan baik
- Playwright lebih modern dan support fake media device untuk PTT testing
- Cypress tidak support `--use-fake-device-for-media-stream` yang krusial untuk test PTT

**Langkah jika memilih Playwright:**

1. Di `package.json`, pastikan script berikut ada:
   ```json
   {
     "scripts": {
       "test:e2e": "playwright test",
       "test:e2e:ui": "playwright test --ui",
       "test:e2e:headed": "playwright test --headed",
       "test:e2e:report": "playwright show-report"
     }
   }
   ```

2. Di `.github/workflows/ci-cd.yml`, ganti step Cypress dengan Playwright:
   ```yaml
   # HAPUS step Cypress yang ada (semua baris yang menyebut cypress)
   # GANTI dengan:
   
   - name: Install Playwright browsers
     run: npx playwright install --with-deps chromium
   
   - name: Run Playwright E2E tests
     run: pnpm test:e2e
     env:
       CI: true
       PLAYWRIGHT_BASE_URL: http://localhost:5173
   
   - name: Upload Playwright report
     uses: actions/upload-artifact@v4
     if: always()
     with:
       name: playwright-report
       path: playwright-report/
       retention-days: 7
   
   - name: Upload test results
     uses: actions/upload-artifact@v4
     if: always()
     with:
       name: test-results
       path: test-results/     # ← sesuaikan dengan outputDir di playwright.config.ts
       retention-days: 3
   ```

3. Jika memilih tetap pakai Cypress (tidak direkomendasikan untuk PTT testing),
   lanjutkan ke Task 2.3.

---

### Task 2.3 — Fix artifact path `test-results/` tidak ditemukan

**Masalah:** Step upload artifact untuk `test-results/` gagal karena
Playwright menulis output ke path berbeda dari yang dikonfigurasi di workflow.

**Langkah:**

1. Baca konfigurasi output di `playwright.config.ts`:
```bash
grep -n "outputDir\|outputFolder\|testResults" playwright.config.ts
```

2. Sesuaikan path di workflow dengan nilai `outputDir` aktual:
   ```yaml
   # Jika playwright.config.ts punya:
   # outputDir: 'test-results'
   - name: Upload test results
     with:
       path: test-results/
   
   # Jika outputDir: './playwright-test-results'
   - name: Upload test results
     with:
       path: playwright-test-results/
   
   # Jika tidak ada outputDir (default Playwright):
   # Default Playwright outputDir adalah 'test-results'
   - name: Upload test results
     with:
       path: test-results/
   ```

3. Tambahkan `if: always()` pada step upload agar tetap upload meski test fail:
   ```yaml
   - name: Upload test results
     uses: actions/upload-artifact@v4
     if: always()  # ← wajib ada
     with:
       name: test-results-${{ github.run_number }}
       path: test-results/
       retention-days: 3
   ```

---

### Checkpoint Fase 2

```bash
# Verifikasi Playwright bisa menemukan semua spec
npx playwright test --list 2>&1 | head -20
# Harus menampilkan daftar 13+ test
```

---

## FASE 3 — UPDATE WORKFLOW FILE

Baca `.github/workflows/ci-cd.yml` terlebih dahulu secara lengkap,
kemudian terapkan semua perubahan berikut:

### Task 3.1 — Update Node.js version

**Masalah:** Node.js 20 sudah deprecated di GitHub Actions runners.

```yaml
# Ganti di SEMUA step setup-node di semua workflow file:

# Sebelum:
- uses: actions/setup-node@v4
  with:
    node-version: '20'

# Sesudah:
- uses: actions/setup-node@v4
  with:
    node-version: '22'      # LTS terbaru per Juni 2026
    cache: 'pnpm'           # Tambahkan cache jika belum ada
```

---

### Task 3.2 — Tambahkan pnpm setup yang benar

Jika workflow belum punya setup pnpm yang proper:

```yaml
# Tambahkan sebelum actions/setup-node:
- uses: pnpm/action-setup@v4
  with:
    version: 9              # Sesuaikan dengan packageManager di package.json

- uses: actions/setup-node@v4
  with:
    node-version: '22'
    cache: 'pnpm'
```

---

### Task 3.3 — Workflow CI final yang lengkap

Tulis ulang `.github/workflows/ci-cd.yml` dengan struktur berikut
(sesuaikan nama step dengan yang sudah ada, jangan hapus step yang
tidak bermasalah):

```yaml
name: NextVWT CI/CD

on:
  push:
    branches: [main, develop, 'feature/**', 'fix/**', 'hotfix/**']
  pull_request:
    branches: [main, develop]
  workflow_dispatch:

env:
  # Environment variables untuk test — gunakan dummy values untuk CI
  VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL || 'https://placeholder.supabase.co' }}
  VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable__placeholder' }}
  VITE_TURN_URL: ${{ secrets.VITE_TURN_URL || 'turn:127.0.0.1:3478' }}
  VITE_TURN_USERNAME: ${{ secrets.VITE_TURN_USERNAME || 'ci-test' }}
  VITE_TURN_CREDENTIAL: ${{ secrets.VITE_TURN_CREDENTIAL || 'ci-test-pass' }}

jobs:
  # ─── JOB 1: Validate & Test ──────────────────────────────────────────────
  validate-and-test:
    name: Validate & Test (CI)
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      # ── Lint & Type Check ──────────────────────────────────────────────
      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm type-check

      # ── Unit & Integration Tests ───────────────────────────────────────
      - name: Run Vitest (unit + integration)
        run: pnpm test --run --coverage
        env:
          CI: true

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: vitest-coverage-${{ github.run_number }}
          path: coverage/
          retention-days: 7

      # ── Build ─────────────────────────────────────────────────────────
      - name: Build production
        run: pnpm build

      # ── E2E Tests ─────────────────────────────────────────────────────
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Start dev server (background)
        run: pnpm dev &
        env:
          CI: true

      - name: Wait for dev server ready
        run: npx wait-on http://localhost:5173 --timeout 30000

      - name: Run Playwright E2E tests
        run: pnpm test:e2e
        env:
          CI: true
          PLAYWRIGHT_BASE_URL: http://localhost:5173

      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-${{ github.run_number }}
          path: playwright-report/
          retention-days: 7

      - name: Upload E2E test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results-${{ github.run_number }}
          path: test-results/
          retention-days: 3

  # ─── JOB 2: Build Android (CD) ───────────────────────────────────────────
  build-android:
    name: Build & Sign Android (CD)
    runs-on: ubuntu-latest
    needs: validate-and-test          # Hanya jalan jika CI pass
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    timeout-minutes: 30

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Setup Java (required for Android build)
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build web assets
        run: pnpm build

      - name: Sync Capacitor
        run: npx cap sync android

      - name: Build Android APK (debug)
        working-directory: android
        run: ./gradlew assembleDebug

      - name: Upload APK artifact
        uses: actions/upload-artifact@v4
        with:
          name: nextvwt-debug-${{ github.run_number }}.apk
          path: android/app/build/outputs/apk/debug/app-debug.apk
          retention-days: 14
```

---

### Task 3.4 — Tambahkan `wait-on` sebagai dev dependency

Workflow membutuhkan `wait-on` untuk menunggu dev server siap sebelum Playwright.

```bash
pnpm add -D wait-on
```

Jika sudah ada, skip langkah ini.

---

### Task 3.5 — Tambahkan secrets di GitHub Repository

Buat daftar secrets yang dibutuhkan di GitHub → Settings → Secrets and variables → Actions:

```
VITE_SUPABASE_URL         = https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY = sb_publishable__YOUR_KEY
VITE_TURN_URL             = turn:YOUR_BIZNET_GIO_IP:3478
VITE_TURN_USERNAME        = nextvwt
VITE_TURN_CREDENTIAL      = YOUR_COTURN_PASSWORD
```

**Catatan penting:** Workflow sudah punya fallback nilai dummy untuk CI
jika secrets tidak diset. Ini memastikan unit test dan build bisa jalan
tanpa secrets real. Hanya E2E test yang butuh Supabase real untuk
skenario login — tapi karena E2E menggunakan fake auth via `addInitScript`,
ini pun seharusnya bisa jalan tanpa secrets.

---

## FASE 4 — FIX PLAYWRIGHT TEST YANG FAIL

### Task 4.1 — Cek selector yang rusak

Setelah workflow fix, jalankan Playwright secara lokal:

```bash
pnpm dev &
sleep 5
pnpm test:e2e --reporter=list 2>&1 | tee /tmp/playwright-local.txt
cat /tmp/playwright-local.txt
```

Untuk setiap test yang fail, buka report:

```bash
pnpm test:e2e:report
# Atau buka playwright-report/index.html di browser
```

---

### Task 4.2 — Fix `window.__store__` undefined

**Masalah:** Beberapa E2E spec mengakses `(window as any).__store__` untuk
bypass LoginGate, tapi setelah refactor (hapus `window.usePTTStore`),
ini tidak tersedia lagi.

**Fix di `src/app/App.tsx`:**

```ts
// Tambahkan HANYA untuk development dan E2E testing:
if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
  // Expose store hanya di dev/test mode untuk E2E testing
  // TIDAK pernah ada di production build
  (window as Record<string, unknown>).__store__ = usePTTStore;
}
```

**Verifikasi di production build:**

```bash
pnpm build
grep -r "__store__" dist/ || echo "✓ __store__ tidak ada di production build"
```

---

### Task 4.3 — Fix selector E2E yang tidak ditemukan

Untuk setiap selector di E2E spec yang fail karena element tidak ditemukan,
tambahkan `data-testid` ke komponen yang sesuai:

**Komponen yang perlu `data-testid`:**

```tsx
// PTTButton.tsx atau RadioBody.tsx
<button
  data-testid="ptt-button"
  aria-pressed={isTransmitting}
  onPointerDown={handleStart}
  onPointerUp={handleStop}
>
  PTT
</button>

// Indikator transmitting (bisa berupa overlay, text, atau badge)
{isTransmitting && (
  <div data-testid="transmitting-indicator" aria-live="polite">
    ON AIR
  </div>
)}

// LCD channel number (RadioHeader.tsx atau RadioLayout.tsx)
<span data-testid="lcd-channel-number">
  {channelNumber.toString().padStart(3, '0')}
</span>

// Connection status
<span data-testid="connection-status">
  {isConnected ? 'ONLINE' : 'OFFLINE'}
</span>

// Scan button
<button data-testid="scan-button">SCAN</button>

// Settings button
<button data-testid="settings-button">SET</button>
```

**Cari komponen yang relevan:**

```bash
grep -rn "PTT\|ptt-button\|data-testid" src/app/components/ | grep -i "ptt\|transmit\|lcd\|channel"
```

---

### Task 4.4 — Fix E2E timeout issues

Jika E2E test timeout karena aplikasi loading terlalu lama di CI:

```ts
// Di playwright.config.ts, update timeout:
export default defineConfig({
  timeout: 30_000,           // 30 detik per test (cukup untuk CI)
  expect: { timeout: 10_000 }, // 10 detik per assertion (naik dari 8 detik)
  
  use: {
    actionTimeout: 10_000,   // 10 detik per action (click, fill, dll)
    navigationTimeout: 15_000, // 15 detik untuk navigasi
  },
  
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,         // Tunggu server ready hingga 60 detik
  },
});
```

---

## FASE 5 — VERIFIKASI LOKAL SEBELUM PUSH

Sebelum push ke GitHub, simulasikan CI pipeline secara lokal:

### 5.1 Full pipeline simulation

```bash
echo "=== STEP 1: Install ===" && pnpm install --frozen-lockfile
echo "=== STEP 2: Lint ===" && pnpm lint
echo "=== STEP 3: Type check ===" && pnpm type-check
echo "=== STEP 4: Unit tests ===" && pnpm test --run
echo "=== STEP 5: Build ===" && pnpm build
echo "=== STEP 6: E2E ===" && pnpm test:e2e
echo "=== ALL STEPS DONE ==="
```

Semua step harus hijau (exit code 0) sebelum push.

### 5.2 Cek tidak ada file sensitif di git

```bash
git status
git diff --cached --name-only
# Pastikan .env.local TIDAK ada di daftar
grep "\.env\.local" .gitignore || echo "⚠️  .env.local tidak di .gitignore!"
```

### 5.3 Push dan pantau Actions

```bash
git add .github/workflows/ src/ playwright.config.ts
git commit -m "fix(ci): fix lint errors, update node to 22, switch to playwright e2e"
git push origin develop
```

Buka https://github.com/stevanusherianto7-glitch/NextVWT-PTT-App-Prototype/actions
dan pantau run terbaru.

---

## DELIVERABLES AKHIR

Setelah semua fase selesai, buat `CI_FIX_REPORT.md` di root project:

```markdown
# NextVWT CI/CD Fix Report

**Tanggal:** [tanggal]
**Run sebelum fix:** FAILING (run #209)
**Run setelah fix:** PASS/FAIL (run #?)

## Perubahan yang Dilakukan

### Lint Fixes
- [ ] Hapus `console.log` di `channelSubscription.ts:88` (dan file lain)
- [ ] Fix `any` type di `RadioBody.tsx:32`
- [ ] Fix `any` type di `RadioLayout.tsx:126,149`
- [ ] Fix `any` type di `UserListModal.tsx:672`
- [ ] Fix `any` type di `useAudioStreamer.test.ts:83,87,88,112`
- [ ] Fix `useEffect` missing dep di `UserListModal.tsx:732`

### E2E Configuration
- [ ] Pilih satu runner: Playwright / Cypress
- [ ] Fix `specPattern` / test discovery
- [ ] Fix artifact path `test-results/`

### Workflow Updates
- [ ] Node.js updated ke v22
- [ ] pnpm/action-setup@v4 ditambahkan
- [ ] `wait-on` dependency ditambahkan
- [ ] Playwright menggantikan Cypress (jika dipilih)
- [ ] Android CD job hanya jalan saat push ke `main`

### Component data-testid
- [ ] `ptt-button` ditambahkan ke PTTButton
- [ ] `transmitting-indicator` ditambahkan
- [ ] `lcd-channel-number` ditambahkan
- [ ] `connection-status` ditambahkan

## Hasil Pipeline Setelah Fix

| Job | Status | Durasi |
|-----|--------|--------|
| Validate & Test (CI) | ✅ PASS / ❌ FAIL | ?m ?s |
| Build Android (CD) | ✅ PASS / ⏭️ SKIP | ?m ?s |

## Masalah yang Masih Ada

(isi jika ada yang belum selesai)

## Rekomendasi Selanjutnya

1. Tambahkan branch protection rule di GitHub → Settings → Branches →
   Require status checks: "Validate & Test (CI)" harus PASS sebelum merge
2. Tambahkan Dependabot untuk auto-update dependencies
3. Pertimbangkan split workflow: lint+typecheck (cepat) terpisah dari E2E (lambat)
```

---

## CONSTRAINTS WAJIB

- **JANGAN** push langsung ke `main` — gunakan branch `fix/ci-pipeline`
- **JANGAN** ubah logika source code untuk membuat test pass —
  hanya fix type annotations dan console.log
- **JANGAN** hapus E2E test yang sudah ada — perbaiki atau update selector
- **JANGAN** simpan secrets real di workflow file — selalu gunakan
  `${{ secrets.NAMA_SECRET }}`
- **SELALU** jalankan pipeline lokal terlebih dahulu sebelum push
- **LAPORKAN** jika ada step yang tidak bisa diperbaiki tanpa mengubah
  logika bisnis — ini butuh diskusi lebih lanjut
