# Agent Prompt — NextVWT: Fix Logika Progress Bar Modulasi (Laser)

> **Cara pakai:** Paste ke Claude Code, Cursor Agent, atau AI coding agent
> yang punya akses penuh ke root folder project NextVWT.
> Jalankan dari root direktori project.

---

## KONTEKS & TUJUAN

Progress bar (laser needle) di NextVWT berfungsi sebagai **indikator modulasi**:
- Jarum laser **bergerak sedikit / pendek** = suara dari mic lemah / tidak terdeteksi
  → user lain di channel TIDAK mendengar transmisi dengan jelas
- Jarum laser **bergerak penuh sampai zona merah** = suara kuat, termodulasi baik
  → user lain di channel MENDENGAR transmisi dengan jelas

**Masalah saat ini:** Progress bar TIDAK mencerminkan level suara mic yang sebenarnya.
Nilai yang ditampilkan adalah **simulasi matematis** (sin/cos/random), bukan
level audio nyata dari mikrofon user.

**Yang sudah benar di codebase:**
- `useVAD.ts` sudah mengukur RMS nyata dari mic via `AnalyserNode` dan
  memanggil `usePTTStore.getState().setProgress(scaledProgress)` setiap 100ms
- `startVAD()` dipanggil dari `useAudioStreamer.ts` baris ~485 saat `startRecording()`
- `audioAnalyzer.ts` (`startStreamAnalyzer`) juga sudah ada dengan logika RMS serupa
- `ProgressBar.tsx` sudah punya threshold warna yang benar:
  - `0–62.5%` → hijau (lemah)
  - `62.5–83.3%` → kuning (sedang)
  - `83.3–100%` → merah (kuat / termodulasi penuh)

**Masalah utama yang harus diperbaiki:**
- `useRadioOrchestrator.ts` baris ~203–237 punya `setInterval` yang
  **menimpa nilai RMS nyata** dari VAD dengan nilai simulasi matematis setiap 80ms
- Ini yang menyebabkan progress bar tidak responsif terhadap suara mic sesungguhnya
- Plus beberapa masalah turunan di penerima audio dan edge case

---

## FASE 0 — BACA DAN PAHAMI KODE YANG ADA

Sebelum mengubah apapun, baca file-file berikut secara berurutan:

```bash
# 1. Progress bar component
cat src/app/components/ProgressBar.tsx

# 2. Logika progress bar di orchestrator (LOKASI BUG UTAMA)
sed -n '200,245p' src/app/hooks/useRadioOrchestrator.ts

# 3. VAD yang sudah mengukur RMS nyata
cat src/app/hooks/useVAD.ts

# 4. AudioAnalyzer utility
cat src/app/utils/audioAnalyzer.ts

# 5. Bagaimana startVAD dipanggil
grep -n "startVAD\|stopVAD\|setProgress\|scaledProgress" \
  src/app/hooks/useAudioStreamer.ts

# 6. setProgress guard di store
grep -n "setProgress\|progress" \
  src/app/store/slices/createUISlice.ts

# 7. Bagaimana progress dipakai di UI
grep -n "progress\|ProgressBar" \
  src/app/components/radio/RadioBody.tsx
```

Konfirmasi pemahaman kamu sebelum lanjut:
- Di baris berapa `setInterval` simulasi matematika berada di orchestrator?
- Apakah `startVAD()` dipanggil sebelum atau sesudah `setProgress` dari interval?
- Apakah ada timing conflict antara VAD (100ms interval) dan orchestrator (80ms interval)?

Laporkan temuan sebelum ke Fase 1.

---

## FASE 1 — FIX BUG UTAMA: HAPUS SIMULASI, GUNAKAN VAD NYATA

### Task 1.1 — Hapus setInterval simulasi di useRadioOrchestrator.ts

**File:** `src/app/hooks/useRadioOrchestrator.ts`

Temukan blok `useEffect` berikut (sekitar baris 203):

```ts
// ❌ HAPUS SELURUH BLOK INI:
useEffect(() => {
  if (!isPowerOn) {
    setProgress(0);
    return;
  }

  const isReceiving =
    activeTransmitter && activeTransmitter.userId !== usePTTStore.getState().userId;

  if (isTransmitting || isReceiving) {
    const interval = setInterval(() => {
      const time = Date.now() / 1000;
      const speechEnvelope = Math.max(
        0.1,
        Math.sin(time * 1.6) * 0.45 + Math.sin(time * 0.55) * 0.55 + 0.25
      );
      const voiceRipple = Math.sin(time * 24) * 12 + Math.sin(time * 48) * 8;
      const randomNoise = Math.random() * 14 - 7;

      let simulatedProgress = speechEnvelope * 82 + voiceRipple + randomNoise;
      simulatedProgress = Math.max(0, Math.min(100, simulatedProgress));
      setProgress(simulatedProgress);
    }, 80);

    return () => {
      clearInterval(interval);
      setProgress(0);
    };
  } else {
    setProgress(0);
  }
}, [isPowerOn, isTransmitting, activeTransmitter, setProgress]);
```

**Ganti dengan blok yang lebih sederhana — hanya handle cleanup:**

```ts
// ✅ GANTI DENGAN INI:
// Progress bar saat TRANSMIT diisi oleh useVAD (RMS nyata dari mic).
// Progress bar saat RECEIVE diisi oleh useAudioPlayback (RMS dari audio yang diputar).
// useEffect ini HANYA handle reset saat power off atau idle.
useEffect(() => {
  if (!isPowerOn) {
    setProgress(0);
    return;
  }

  const isReceiving =
    !!activeTransmitter &&
    activeTransmitter.userId !== usePTTStore.getState().userId;

  // Reset saat tidak ada aktivitas sama sekali
  if (!isTransmitting && !isReceiving) {
    setProgress(0);
  }

  // Tidak ada setInterval di sini.
  // Progress saat TX diisi oleh VAD (useAudioStreamer → startVAD → setProgress)
  // Progress saat RX diisi oleh Task 1.3 di bawah
}, [isPowerOn, isTransmitting, activeTransmitter, setProgress]);
```

---

### Task 1.2 — Verifikasi bahwa startVAD sudah terhubung ke setProgress

**File:** `src/app/hooks/useVAD.ts`

Baca implementasi `checkVAD`. Pastikan baris berikut ada dan benar:

```ts
// Di dalam checkVAD(), setelah hitung RMS:
const scaledProgress = Math.min(100, Math.round(rms * 400));
usePTTStore.getState().setProgress(scaledProgress);
```

**Jika belum ada**, tambahkan setelah kalkulasi `rms`:

```ts
// Skala RMS ke 0-100 untuk progress bar
// rms biasanya 0.0 – 0.25 untuk suara normal
// × 400 = range 0 – 100
// Suara pelan (berbisik): rms ≈ 0.01 → progress ≈ 4%
// Suara normal (bicara): rms ≈ 0.05–0.12 → progress ≈ 20–48%
// Suara keras (teriak): rms ≈ 0.15–0.25 → progress ≈ 60–100%
const scaledProgress = Math.min(100, Math.round(rms * 400));
usePTTStore.getState().setProgress(scaledProgress);
```

**Jika sudah ada**, lanjutkan ke Task 1.3.

Verifikasi juga bahwa `stopVAD` memanggil `setProgress(0)`:

```ts
const stopVAD = useCallback(() => {
  if (vadIntervalRef.current) {
    clearInterval(vadIntervalRef.current);
    vadIntervalRef.current = null;
  }
  if (vadAnalyserRef.current) {
    vadAnalyserRef.current.disconnect();
    vadAnalyserRef.current = null;
  }
  // WAJIB: reset progress saat VAD berhenti
  usePTTStore.getState().setProgress(0);
}, []);
```

Jika belum ada `setProgress(0)` di stopVAD, tambahkan.

---

### Task 1.3 — Tambahkan RMS meter untuk mode RECEIVE (mendengarkan user lain)

Saat user lain sedang transmit, progress bar juga harus bergerak sesuai
level audio yang sedang diputar — bukan diam di nol.

**File:** `src/app/hooks/useAudioPlayback.ts`

Baca implementasi `playAudioChunk`. Temukan di mana audio di-decode dan diputar
via `AudioContext`. Tambahkan level meter setelah audio source dibuat:

```ts
// Di dalam playAudioChunk, setelah audioCtx.decodeAudioData:
const source = audioCtx.createBufferSource();
source.buffer = audioBuffer;

// ── RX Level Meter ────────────────────────────────────────────────────────
// Tambahkan AnalyserNode untuk mengukur level audio yang sedang diputar
const rxAnalyser = audioCtx.createAnalyser();
rxAnalyser.fftSize = 512;
const rxDataArray = new Float32Array(rxAnalyser.fftSize);

// Sambungkan: source → rxAnalyser → destination
source.connect(rxAnalyser);
rxAnalyser.connect(audioCtx.destination);

// Update progress bar selama audio diputar
const rxMeter = setInterval(() => {
  rxAnalyser.getFloatTimeDomainData(rxDataArray);
  let sum = 0;
  for (let i = 0; i < rxDataArray.length; i++) {
    sum += rxDataArray[i] * rxDataArray[i];
  }
  const rms = Math.sqrt(sum / rxDataArray.length);
  const scaledProgress = Math.min(100, Math.round(rms * 400));
  usePTTStore.getState().setProgress(scaledProgress);
}, 80);

source.onended = () => {
  clearInterval(rxMeter);
  rxAnalyser.disconnect();
  // Reset hanya jika sudah tidak ada transmitter aktif
  const state = usePTTStore.getState();
  if (!state.activeTransmitter && !state.isTransmitting) {
    state.setProgress(0);
  }
};
// ── End RX Level Meter ────────────────────────────────────────────────────

source.start(startTime);
```

**Catatan implementasi:** Sesuaikan posisi kode ini dengan struktur aktual
`playAudioChunk` yang ada. Kuncinya adalah:
1. `rxAnalyser` harus berada di antara `source` and `destination`
2. `setInterval` untuk update progress, `clearInterval` di `onended`
3. Import `usePTTStore` jika belum ada di file ini

---

### Task 1.4 — Fix simulasi progress AI Operator di Channel 99

**File:** `src/app/hooks/useRadioOrchestrator.ts`

Temukan blok `progInterval` untuk AI Operator response di channel 99
(sekitar baris 600–640):

```ts
// Blok ini menggunakan simulasi matematika untuk AI Operator:
const progInterval = setInterval(() => {
  const elapsed = (Date.now() - speechStart) / 1000;
  const speechEnvelope = Math.max(
    0.15,
    Math.sin(elapsed * 2.0) * 0.5 + Math.sin(elapsed * 0.7) * 0.5 + 0.3
  );
  const voiceRipple = Math.sin(elapsed * 30) * 10 + Math.sin(elapsed * 60) * 6;
  const randomNoise = Math.random() * 12 - 6;

  let simulatedProgress = speechEnvelope * 80 + voiceRipple + randomNoise;
  simulatedProgress = Math.max(0, Math.min(100, simulatedProgress));
  setProgress(simulatedProgress);
}, 80);
```

**Pertahankan simulasi ini untuk AI Operator** — karena AI Operator menggunakan
`SpeechSynthesisUtterance` (Web Speech API), bukan AudioContext yang bisa
dianalisa via AnalyserNode. Simulasi matematis untuk kasus ini adalah acceptable.

**Yang perlu diperbaiki:** Pastikan `speechEnvelope` menghasilkan variasi yang
lebih natural (naik-turun seperti suara manusia sesungguhnya):

```ts
// ✅ Update progInterval untuk AI Operator agar lebih natural:
const progInterval = setInterval(() => {
  const elapsed = (Date.now() - speechStart) / 1000;

  // Envelope lebih mirip pola bicara manusia:
  // - ada "burst" saat konsonan
  // - ada "sustain" saat vokal
  // - ada "gap" singkat saat jeda antar kata (setiap ~0.4 detik)
  const wordRhythm = Math.max(0, Math.sin(elapsed * 7.5)); // ~1 kata/detik
  const syllable = Math.abs(Math.sin(elapsed * 14));        // ~2 suku kata/detik
  const breathingGap = elapsed % 3.5 < 0.2 ? 0.05 : 1;    // jeda napas setiap 3.5 detik

  const speechEnvelope = (wordRhythm * 0.5 + syllable * 0.5) * breathingGap;
  const naturalProgress = Math.max(5, speechEnvelope * 85 + (Math.random() * 8 - 4));

  setProgress(Math.min(100, naturalProgress));
}, 80);
```

---

## FASE 2 — KALIBRASI SKALA RMS

### Task 2.1 — Verifikasi skala rms * 400

Skala `rms * 400` mungkin perlu disesuaikan tergantung karakteristik mic
Android. Buka `useVAD.ts` dan tambahkan logging sementara untuk kalibrasi:

```ts
// TAMBAHKAN SEMENTARA (hapus setelah kalibrasi):
if (import.meta.env.DEV) {
  const rawRms = rms.toFixed(4);
  const scaled = scaledProgress;
  // Uncomment satu baris berikut untuk lihat nilai di console browser:
  // console.warn(`[VAD] rms=${rawRms} → progress=${scaled}`);
}
```

**Panduan kalibrasi:**
- Bicara normal dengan jarak mic ~20cm dari mulut
- Jika progress bar tidak pernah melewati 30% → naikkan multiplier (`rms * 600`)
- Jika progress bar selalu di atas 80% bahkan saat diam → turunkan (`rms * 200`)
- Target: suara normal sehari-hari mencapai 50–75%, suara keras mencapai 85–95%

Sesuaikan nilai di `useVAD.ts` DAN `audioAnalyzer.ts` secara konsisten:

```ts
// useVAD.ts:
const PROGRESS_SCALE = 400; // Sesuaikan dengan hasil kalibrasi
const scaledProgress = Math.min(100, Math.round(rms * PROGRESS_SCALE));

// audioAnalyzer.ts (jika dipakai):
const scaledProgress = Math.min(100, Math.round(rms * PROGRESS_SCALE)); // sama
```

---

### Task 2.2 — Tambahkan smoothing untuk mencegah flicker

Tanpa smoothing, progress bar bisa bergerak sangat cepat (flicker) saat ada
perubahan tiba-tiba. Tambahkan exponential moving average:

**File:** `src/app/hooks/useVAD.ts`

```ts
// Tambahkan ref untuk nilai progress sebelumnya:
const prevProgressRef = useRef(0);

// Di dalam checkVAD(), ganti:
const scaledProgress = Math.min(100, Math.round(rms * PROGRESS_SCALE));
usePTTStore.getState().setProgress(scaledProgress);

// Dengan:
const rawProgress = Math.min(100, rms * PROGRESS_SCALE);

// Exponential moving average: 70% nilai lama + 30% nilai baru
// Naik: lebih responsif (attack cepat) → koefisien lebih besar
// Turun: lebih lambat (decay lambat) → koefisien lebih kecil
const ATTACK  = 0.45; // saat suara NAIK, progress naik cepat
const RELEASE = 0.15; // saat suara TURUN, progress turun lambat

const prev = prevProgressRef.current;
const smoothed = rawProgress > prev
  ? prev + (rawProgress - prev) * ATTACK   // naik cepat
  : prev + (rawProgress - prev) * RELEASE; // turun lambat

prevProgressRef.current = smoothed;
usePTTStore.getState().setProgress(Math.round(smoothed));
```

**Efek visual yang diharapkan:**
- Saat user mulai bicara → laser NAIK CEPAT ke zona suara
- Saat user berhenti → laser TURUN PERLAHAN (tidak langsung nol)
- Ini membuat progress bar terasa "hidup" seperti VU meter radio sungguhan

---

## FASE 3 — UPDATE THRESHOLD WARNA PROGRESS BAR

### Task 3.1 — Sesuaikan threshold warna di ProgressBar.tsx

**File:** `src/app/components/ProgressBar.tsx`

Threshold warna saat ini:
```ts
if (progress > 83.3) {
  headGlow = '#ff3333';  // merah
} else if (progress > 62.5) {
  headGlow = '#ffaa00';  // kuning/orange
}
// default: hijau
```

Ini sudah sesuai dengan logika yang diminta. Verifikasi bahwa gradient bar juga
konsisten dengan threshold tersebut:

```ts
// Di dalam style background gradient bar, pastikan breakpoint sama:
background: 'linear-gradient(to right, ' +
  '#00C853 0%, '   +   // hijau: 0-62.5% (suara lemah/tidak terdeteksi)
  '#00C853 62.5%, '+
  '#FFD600 62.5%, '+   // kuning: 62.5-83.3% (terdeteksi tapi belum optimal)
  '#FFD600 83.3%, '+
  '#FF1744 83.3%, '+   // merah: 83.3-100% (modulasi penuh, terdengar semua user)
  '#FF1744 100%)'
```

**Jika threshold di gradient tidak konsisten dengan `headGlow`, sinkronkan keduanya.**

---

### Task 3.2 — Tambahkan label deskriptif (opsional tapi recommended)

**File:** `src/app/components/ProgressBar.tsx`

Tambahkan teks kecil di bawah progress bar yang menjelaskan level modulasi
kepada user (terutama penting untuk user baru yang belajar penggunaan walkie-talkie):

```tsx
// Di dalam return ProgressBar, setelah div laser needle:
{progress > 0 && (
  <div
    className="absolute -bottom-4 left-0 right-0 text-center"
    style={{ fontSize: '8px', letterSpacing: '1.5px', opacity: 0.7 }}
  >
    {progress > 83.3 ? (
      <span style={{ color: '#ff3333' }}>◉ MODULASI PENUH</span>
    ) : progress > 62.5 ? (
      <span style={{ color: '#ffaa00' }}>◎ CUKUP TERDENGAR</span>
    ) : progress > 15 ? (
      <span style={{ color: '#00C853' }}>○ SUARA LEMAH</span>
    ) : (
      <span style={{ color: '#666' }}>· TIDAK TERDETEKSI</span>
    )}
  </div>
)}
```

**Atau** tampilkan label hanya saat PTT aktif (isTransmitting) untuk tidak
memenuhi UI saat idle. Sesuaikan dengan konteks komponen.

---

## FASE 4 — PERBAIKI PROGRESS BAR DI CHANNEL 100 (ECHO TEST)

Saat user di Channel 100 menekan PTT dan bicara, progress bar harus
menunjukkan level suara dari mic secara real-time (sama seperti channel biasa).

**Verifikasi:** `useVAD` dipanggil dari `useAudioStreamer.startRecording()`,
dan ini dipanggil saat `isTransmitting=true` termasuk di CH 100.

```bash
# Cek apakah ada guard yang mencegah VAD jalan di CH 100
grep -n "isolat\|channel.*100\|BRAND\.isolatedChannel" \
  src/app/hooks/useAudioStreamer.ts
```

Jika ada guard yang me-return sebelum `startVAD()` dipanggil di CH 100:

```ts
// Pastikan startVAD dipanggil meskipun di isolated channel:
// startVAD hanya butuh stream dan micTrack — tidak butuh isConnected
startVAD(stream, micTrack);  // harus ada setelah getUserMedia, tanpa guard channel
```

Saat echo playback di CH 100 (PTT dilepas → audio diputar ulang),
progress bar juga harus bergerak mengikuti audio yang diputar.
Task 1.3 (RX Level Meter di `useAudioPlayback`) sudah menangani ini.

---

## FASE 5 — VERIFIKASI AKHIR

### 5.1 Test manual progress bar

```bash
pnpm dev
```

Buka app di browser, lakukan:

1. **Test suara diam:** Tekan PTT, jangan bicara
   - Progress bar harus berada di bawah 15% (zona tidak terdeteksi)
   - Label harus "· TIDAK TERDETEKSI" (jika label ditambahkan)

2. **Test suara normal:** Tekan PTT, bicara dengan volume normal
   - Progress bar harus berada di 40–70% (zona hijau ke kuning)
   - Laser bergerak responsif mengikuti volume suara

3. **Test suara keras:** Tekan PTT, bicara dengan volume keras
   - Progress bar harus menyentuh zona merah (>83.3%)
   - Label "◉ MODULASI PENUH"

4. **Test penerima:** Minta user lain transmit ke channel yang sama
   - Progress bar harus bergerak saat mendengar suara user lain

5. **Test CH 100:** Masuk ke CH 100, tekan PTT, bicara
   - Progress bar bergerak saat merekam
   - Setelah PTT dilepas, progress bar bergerak saat playback

### 5.2 Verifikasi tidak ada setInterval simulasi yang tersisa

```bash
grep -n "speechEnvelope\|voiceRipple\|randomNoise\|simulatedProgress" \
  src/app/hooks/useRadioOrchestrator.ts
```

Hanya boleh ada di blok AI Operator (CH 99). Tidak boleh ada di blok
yang aktif saat user biasa transmit.

### 5.3 Run test suite

```bash
pnpm test --run 2>&1 | tail -20
pnpm type-check
```

---

## DELIVERABLES AKHIR

Setelah semua fase selesai, laporkan:

```
LAPORAN FIX PROGRESS BAR MODULASI
===================================

1. Bug yang diperbaiki:
   □ setInterval simulasi dihapus dari useRadioOrchestrator.ts
     (baris: ___, durasi simulasi yang dihapus: ___ baris)
   □ useVAD.ts setProgress sudah menggunakan RMS nyata
   □ stopVAD sudah memanggil setProgress(0)
   □ RX level meter ditambahkan ke useAudioPlayback.ts
   □ Smoothing (attack/release) ditambahkan ke useVAD.ts
   □ AI Operator CH 99 dipertahankan dengan simulasi natural

2. Kalibrasi:
   PROGRESS_SCALE yang digunakan: ___
   Alasan: ___

3. Threshold warna (ProgressBar.tsx):
   Hijau: 0% – 62.5% (suara lemah/tidak terdeteksi)
   Kuning: 62.5% – 83.3% (terdeteksi, cukup terdengar)
   Merah: 83.3% – 100% (modulasi penuh, terdengar semua user)
   Status: sudah konsisten antara headGlow dan gradient ✓/✗

4. Test manual:
   Suara diam → progress bar < 15%: PASS/FAIL
   Suara normal → progress bar 40-70%: PASS/FAIL
   Suara keras → progress bar > 83%: PASS/FAIL
   Mode RX (penerima) → progress bar bergerak: PASS/FAIL
   CH 100 TX → progress bar bergerak: PASS/FAIL
   CH 100 RX playback → progress bar bergerak: PASS/FAIL

5. Type check: PASS/FAIL (___ errors)
6. Unit test: ___/196 passed
```

---

## CONSTRAINTS WAJIB

- **JANGAN** hapus simulasi di blok AI Operator CH 99 — itu intentional
  karena SpeechSynthesisUtterance tidak bisa dianalisa via Web Audio API
- **JANGAN** ubah threshold warna (62.5% dan 83.3%) di ProgressBar.tsx
  kecuali diminta secara eksplisit
- **JANGAN** ubah logika `setProgress` guard di `createUISlice.ts`
  (guard yang reject non-zero progress saat tidak transmit/receive sudah benar)
- **SELALU** pertahankan smoothing yang asimetris (attack cepat, release lambat)
  agar terasa seperti VU meter radio sungguhan
- **JANGAN** menambahkan AudioContext baru — selalu gunakan `initGlobalAudioContext()`
  atau `getAudioContext()` yang sudah ada untuk menghindari memory leak
- **LAPORKAN** jika skala `rms * 400` tidak menghasilkan range yang baik
  di device Android target (HP mid-range dengan mic internal)
