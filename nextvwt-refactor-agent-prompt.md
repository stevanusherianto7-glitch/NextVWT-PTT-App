# Agent Prompt — NextVWT Codebase Refactor (Sprint 1 + 2 + 3)

> **Cara pakai:** Paste prompt ini ke Claude Code, Cursor Agent, atau AI coding
> agent lain yang punya akses penuh ke root folder project NextVWT.
> Jalankan dari root direktori project. Baca seluruh prompt sebelum memulai.

---

## KONTEKS

Kamu adalah senior TypeScript/React engineer yang ditugaskan melakukan refactor
menyeluruh pada project NextVWT — aplikasi PTT (Push-to-Talk) walkie-talkie
berbasis WebRTC + Supabase Realtime + Capacitor Android.

Hasil audit menemukan masalah di tiga kategori:
- **Sprint 1 — Security & Critical** (blokir sebelum production)
- **Sprint 2 — Modularitas** (struktural debt)
- **Sprint 3 — Biznet Gio readiness** (infrastruktur Indonesia)

**Stack:** React 18 + TypeScript + Zustand v5 + Supabase JS v2 + Vite 6 +
Capacitor 8 + Tailwind 4 + Zod v4 + pnpm

**Aturan wajib selama refactor:**
- Jangan hapus fungsionalitas yang sudah ada
- Jangan ubah nama export publik yang sudah dipakai di file lain tanpa
  mengupdate semua importnya sekaligus
- Setiap file yang dimodifikasi harus bisa di-build tanpa error TypeScript
- Jalankan `pnpm type-check` setelah setiap sprint selesai
- Jangan commit — hanya modifikasi file

---

## FASE 0 — ORIENTASI (wajib sebelum mulai)

Sebelum menulis satu baris kode, lakukan langkah berikut:

1. Baca file-file ini secara berurutan:
   - `src/app/store/usePTTStore.ts`
   - `src/app/store/slices/createAuthSlice.ts`
   - `src/app/store/slices/createChannelSlice.ts`
   - `src/app/store/slices/createUISlice.ts`
   - `src/app/store/slices/createSettingsSlice.ts`
   - `src/app/store/slices/createWebRTCSlice.ts`
   - `src/app/store/subscription.ts`
   - `src/app/store/types.ts`
   - `src/features/moderation/permissions.ts`
   - `src/app/App.tsx`
   - `src/app/components/RadioLayout.tsx`
   - `src/app/components/PTTButton.tsx`
   - `supabase/functions/turn-credentials/index.ts`
   - `.env.local` (baca tapi jangan modifikasi)
   - `.gitignore`

2. Buat ringkasan singkat dari pemahaman kamu tentang:
   - Alur data dari PTT button press → Supabase broadcast → audio playback
   - Di mana `subscribeToChannel` saat ini berada dan apa yang dilakukannya
   - Bagaimana role user saat ini dibaca (localStorage vs Zustand)

3. Konfirmasi bahwa kamu siap sebelum melanjutkan ke Sprint 1.

---

## SPRINT 1 — SECURITY & CRITICAL

### Task 1.1 — Hapus `window.usePTTStore` dari App.tsx

**File:** `src/app/App.tsx`

Temukan dan hapus blok berikut sepenuhnya:

```ts
if (typeof window !== 'undefined') {
  (window as any).usePTTStore = usePTTStore;
}
```

Pastikan tidak ada referensi lain ke `window.usePTTStore` di codebase:

```bash
grep -rn "window.usePTTStore" src/
```

Jika ada, hapus semuanya. Ekspor store hanya boleh lewat modul import normal.

---

### Task 1.2 — Hapus duplikasi `ROLE_PRIORITY`, gunakan `roleRank`

**File:** `src/app/store/usePTTStore.ts`

**Masalah:** `ROLE_PRIORITY` didefinisikan ulang secara inline di dalam
event handler `ptt_state`, padahal `roleRank` yang identik sudah ada di
`src/features/moderation/permissions.ts`.

**Langkah:**

1. Tambahkan import di bagian atas `usePTTStore.ts`:
   ```ts
   import { roleRank } from '../../features/moderation/permissions';
   ```

2. Di dalam event handler `ptt_state`, temukan blok:
   ```ts
   const ROLE_PRIORITY: Record<string, number> = {
     noc: 5,
     sys_admin: 4,
     pjc: 3,
     operator: 2,
     member: 1.5,
     guest: 1,
   };
   const myPriority = ROLE_PRIORITY[myRole] || 1;
   const incomingPriority = ROLE_PRIORITY[payload.role || 'guest'] || 1;
   ```

3. Ganti dengan:
   ```ts
   import type { ChannelRole } from '../../features/moderation/permissions';
   // ...
   const myPriority = roleRank[(myRole as ChannelRole)] ?? 1;
   const incomingPriority = roleRank[(payload.role as ChannelRole) ?? 'guest'] ?? 1;
   ```

4. Hapus definisi `ROLE_PRIORITY` lokal sepenuhnya.

5. Periksa apakah `roleRank` mencakup semua key yang dipakai. Jika ada key
   `'member'` yang ada di ROLE_PRIORITY lama tapi tidak ada di `roleRank`,
   tambahkan ke `roleRank` di `permissions.ts` dengan rank yang sesuai, atau
   map `'member'` ke `'operator'` jika secara logika setara.

---

### Task 1.3 — Pindahkan role dari `localStorage` ke Zustand state

**Masalah:** Di beberapa titik di `usePTTStore.ts`, role user dibaca langsung
via `localStorage.getItem('channel-role:...')` di dalam event handler. Ini
bypass Zustand dan rawan race condition.

**Langkah:**

1. Di `src/app/store/types.ts`, tambahkan field ke `PTTState`:
   ```ts
   // Role & status user di channel aktif (dibaca dari DB saat join)
   myChannelRole: ChannelRole;
   myChannelStatus: 'normal' | 'muted' | 'controlled' | 'wait' | 'wait_controlled';
   setMyChannelRole: (role: ChannelRole) => void;
   setMyChannelStatus: (status: 'normal' | 'muted' | 'controlled' | 'wait' | 'wait_controlled') => void;
   ```

2. Di `src/app/store/slices/createChannelSlice.ts`, tambahkan implementasi:
   ```ts
   myChannelRole: 'guest' as ChannelRole,
   myChannelStatus: 'normal',
   setMyChannelRole: (role) => set({ myChannelRole: role }),
   setMyChannelStatus: (status) => set({ myChannelStatus: status }),
   ```

3. Di `usePTTStore.ts`, di dalam handler `update_role` saat
   `payload.targetUserId === currentStore.userId`:
   ```ts
   // Tambahkan setelah localStorage write yang sudah ada:
   usePTTStore.setState({ myChannelRole: payload.nextRole as ChannelRole });
   ```

4. Di dalam handler `update_status` saat `payload.targetUserId === currentStore.userId`:
   ```ts
   // Tambahkan setelah sessionStorage write yang sudah ada:
   usePTTStore.setState({ myChannelStatus: payload.statusType });
   ```

5. Di event handler `ptt_state`, ganti pembacaan localStorage role dengan:
   ```ts
   // Sebelum:
   const myRole = state.user
     ? localStorage.getItem(`channel-role:${roomId}:${state.userId}`) || 'guest'
     : 'guest';
   
   // Sesudah:
   const myRole = state.myChannelRole ?? 'guest';
   ```

6. Di dalam `subscribe()` callback saat status `SUBSCRIBED`, setelah `channelInstance.track()`,
   baca role dari localStorage (tetap boleh untuk initial load saat join) dan
   sync ke Zustand:
   ```ts
   const initialRole = (localStorage.getItem(
     `channel-role:${roomId}:${currentStore.userId}`
   ) || 'guest') as ChannelRole;
   usePTTStore.setState({ myChannelRole: initialRole });
   ```

**Catatan:** localStorage tetap boleh dipakai sebagai persistence layer untuk
initial load saat app restart. Yang diubah adalah: event handler tidak boleh
membaca langsung dari localStorage — mereka harus membaca dari Zustand state.

---

### Task 1.4 — Pindahkan semua file Python ke `scripts/` dan update .gitignore

**Masalah:** 34 file `.py` berada di root direktori (dev tools untuk icon
processing). Ini mencemari root dan bisa ikut masuk ke distribusi.

**Langkah:**

1. Buat folder `scripts/icon-tools/` jika belum ada.

2. Pindahkan semua file `.py` dari root ke `scripts/icon-tools/`:
   ```bash
   mkdir -p scripts/icon-tools
   mv *.py scripts/icon-tools/
   ```

3. Di `.gitignore`, tambahkan baris di bagian yang sesuai:
   ```
   # Icon processing scripts (dev only)
   scripts/icon-tools/*.py
   uv/
   uv.zip
   kumpulan_icon/
   kumpulan\ file\ markdown/
   kumpulan\ file\ png/
   scratch/
   hint-report/
   ```

4. Periksa apakah ada file lain di root yang bukan bagian dari project
   (`.cmd`, file PNG langsung di root seperti `media__*.png`):
   ```bash
   ls -la | grep -v "^d" | grep -vE "\.(ts|json|mjs|css|html|md|yaml|lock|config)$"
   ```
   Pindahkan file media ke folder yang sesuai atau tambahkan ke `.gitignore`.

---

### Checkpoint Sprint 1

Setelah semua task Sprint 1 selesai, jalankan:

```bash
pnpm type-check
pnpm lint
grep -rn "window.usePTTStore" src/         # harus tidak ada hasil
grep -rn "ROLE_PRIORITY" src/              # harus tidak ada hasil
```

Laporkan hasilnya sebelum lanjut ke Sprint 2.

---

## SPRINT 2 — MODULARITAS

### Task 2.1 — Ekstrak `subscribeToChannel` ke service tersendiri

**Masalah:** Fungsi `subscribeToChannel` (~500 baris) berada di dalam
`usePTTStore.ts`, mencampur subscription logic dengan store definition.

**Target struktur:**
```
src/app/services/
  channelSubscription.ts   ← subscribeToChannel + semua handler
  heartbeat.ts             ← heartbeat logic (pindah dari subscription.ts)
```

**Langkah:**

1. Buat file `src/app/services/channelSubscription.ts`.

2. Pindahkan seluruh fungsi `subscribeToChannel` beserta:
   - `startActiveTransmitterWatchdog`
   - `clearActiveTransmitterWatchdog`
   - Variabel `activeTransmitterTimeout` dan `subscribingChannelNum`
   ke file baru tersebut.

3. File baru perlu import:
   ```ts
   import { usePTTStore } from '../store/usePTTStore';
   import { getSupabase } from '../utils/supabase';
   import { BRAND } from '../utils/config';
   import { roleRank } from '../../features/moderation/permissions';
   import type { ChannelRole } from '../../features/moderation/permissions';
   import {
     activeChannelSubscription,
     setActiveChannelSubscription,
     heartbeatState,
     cleanupHeartbeat,
   } from '../store/subscription';
   import { safeParseRealtimePayload } from '../store/schemas/realtimePayloads';
   import {
     PttStatePayloadSchema, VoiceChunkPayloadSchema,
     WebRTCSignalingPayloadSchema, HangUpPayloadSchema,
     ReactionPayloadSchema, KickPayloadSchema,
     PresenceMetaSchema, UpdateRolePayloadSchema,
     UpdateStatusPayloadSchema,
   } from '../store/schemas/realtimePayloads';
   import { toast } from 'sonner';
   import { generateUUID } from '../store/storeUtils';
   import { checkIfNewUser } from '../utils/constants';
   import { startBackgroundService } from '../utils/backgroundSurvival';
   ```

4. Export fungsi:
   ```ts
   export { subscribeToChannel };
   ```

5. Di `usePTTStore.ts`:
   - Hapus semua kode yang dipindah
   - Tambahkan import:
     ```ts
     import { subscribeToChannel } from '../services/channelSubscription';
     ```
   - Store definition tinggal:
     ```ts
     export const usePTTStore = create<PTTState>()((set, get, store) => ({
       ...createAuthSlice(set, get, store),
       ...createUISlice(set, get, store),
       ...createChannelSlice(set, get, store),
       ...createSettingsSlice(set, get, store),
       ...createWebRTCSlice(set, get, store),
       subscribeToChannel: (channelNum: number) => {
         subscribeToChannel(channelNum, 0);
       },
     }));
     ```

6. `usePTTStore.ts` setelah refactor harus < 80 baris.

---

### Task 2.2 — Lengkapi heartbeat timeout handler yang kosong

**File:** `src/app/services/channelSubscription.ts` (setelah Task 2.1)
atau `src/app/store/usePTTStore.ts` jika Task 2.1 belum dikerjakan.

**Masalah:** Blok `setTimeout` dalam heartbeat hanya punya comment kosong:
```ts
heartbeatState.heartbeatTimeout = setTimeout(() => {
  // Ping timeout check
}, 5000);
```

**Perbaikan:** Isi implementasinya:
```ts
heartbeatState.heartbeatTimeout = setTimeout(() => {
  // Pong tidak diterima dalam 5 detik
  if (heartbeatState.expectedPingId) {
    heartbeatState.missedPings++;
    heartbeatState.expectedPingId = null;
    console.warn(
      `[Heartbeat] Pong timeout. Missed count: ${heartbeatState.missedPings}`
    );
    if (heartbeatState.missedPings >= 2) {
      console.error(
        `[Heartbeat] ${heartbeatState.missedPings} consecutive timeouts. ` +
        `Force reconnecting CH ${channelNum}...`
      );
      cleanupHeartbeat();
      subscribeToChannel(channelNum, 0);
    }
  }
}, 5000);
```

---

### Task 2.3 — Pecah `RadioLayout.tsx` menjadi sub-komponen

**Masalah:** `RadioLayout.tsx` adalah 1428 baris — satu komponen yang
menangani terlalu banyak hal sekaligus.

**Target struktur:**
```
src/app/components/
  RadioLayout.tsx              ← orchestrator, max ~150 baris
  radio/
    RadioHeader.tsx            ← LCD panel + signal indicator + user info
    RadioBody.tsx              ← PTT button area + waveform
    RadioFooter.tsx            ← control buttons row (settings, users, channel)
    RadioPanels.tsx            ← semua modal dan side panels
    RadioAquarium.tsx          ← AquariumCanvas wrapper (jika ada)
```

**Langkah:**

1. Baca `RadioLayout.tsx` dan identifikasi bagian-bagian utamanya berdasarkan
   JSX blocks (gunakan comments atau heading sebagai panduan).

2. Untuk setiap sub-komponen yang akan diekstrak:
   - Identifikasi props yang dibutuhkan dari store (gunakan `usePTTStore` hook
     langsung di sub-komponen, jangan prop-drilling)
   - Buat file baru di `src/app/components/radio/`
   - Pindahkan JSX yang relevan beserta state local yang hanya digunakan
     oleh bagian tersebut

3. `RadioLayout.tsx` yang tersisa harus hanya berisi:
   - Import sub-komponen
   - Layout wrapper (div/section utama)
   - Komponen-komponen yang sudah diekstrak tersusun sesuai hierarki

4. Pastikan semua CSS class dan style yang dipakai oleh kode yang dipindah
   ikut tersedia di file komponen baru (baik via import CSS atau Tailwind).

**Prioritas pecah (dari yang paling mudah ke paling kompleks):**
1. `RadioHeader` dulu — biasanya paling independen
2. `RadioFooter` — kontrol buttons
3. `RadioPanels` — semua modal/drawer
4. `RadioBody` — PTT area (paling banyak state interaction)

---

### Task 2.4 — Ekstrak transmit logic dari `PTTButton.tsx`

**Masalah:** `PTTButton.tsx` adalah 450 baris yang menggabungkan visual
rendering dengan audio permission, transmit logic, dan haptic feedback.

**Target:**
```
src/app/hooks/
  usePttTransmit.ts     ← start/stop transmit, permission check, broadcast
  useLongPress.ts       ← reusable long press detection hook
```

**Langkah:**

1. Buat `src/app/hooks/useLongPress.ts`:
   ```ts
   import { useRef, useCallback } from 'react';

   interface UseLongPressOptions {
     onStart?: () => void;
     onEnd?: () => void;
     threshold?: number;
   }

   export function useLongPress({ onStart, onEnd, threshold = 0 }: UseLongPressOptions) {
     const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
     const isPressingRef = useRef(false);

     const start = useCallback((e: React.PointerEvent) => {
       e.preventDefault();
       if (isPressingRef.current) return;
       isPressingRef.current = true;
       if (threshold > 0) {
         timerRef.current = setTimeout(() => { onStart?.(); }, threshold);
       } else {
         onStart?.();
       }
     }, [onStart, threshold]);

     const end = useCallback(() => {
       if (!isPressingRef.current) return;
       isPressingRef.current = false;
       if (timerRef.current) {
         clearTimeout(timerRef.current);
         timerRef.current = null;
       }
       onEnd?.();
     }, [onEnd]);

     return { onPointerDown: start, onPointerUp: end, onPointerLeave: end };
   }
   ```

2. Buat `src/app/hooks/usePttTransmit.ts`:
   - Pindahkan logic `startTransmit` dan `stopTransmit` dari `PTTButton.tsx`
   - Hook ini harus return: `{ isTransmitting, canTransmit, startTransmit, stopTransmit }`
   - Handle: permission check, `getUserMedia`, store state update,
     Supabase broadcast `ptt_state`, Capacitor haptic

3. Di `PTTButton.tsx`:
   - Import dan gunakan kedua hook baru
   - Komponen PTTButton setelah refactor harus < 150 baris
   - Hanya berisi: visual JSX, style logic, hook composition

---

### Checkpoint Sprint 2

```bash
pnpm type-check
pnpm build
pnpm test
```

Pastikan semua test masih pass. Laporkan hasil sebelum lanjut Sprint 3.

---

## SPRINT 3 — BIZNET GIO READINESS

### Task 3.1 — Update ALLOWED_ORIGINS di turn-credentials Edge Function

**File:** `supabase/functions/turn-credentials/index.ts`

Tambahkan domain Biznet Gio ke array `ALLOWED_ORIGINS`. Ganti nilai placeholder
dengan domain production aktual kamu:

```ts
const ALLOWED_ORIGINS = [
  // Development
  'http://localhost:5173',
  'http://localhost:4173',
  // Production — Vercel/hosting utama
  'https://nextvwt.vercel.app',
  'https://nextvwt.id',
  'https://www.nextvwt.id',
  'https://app.nextvwt.id',
  // Biznet Gio — tambahkan IP/domain VPS kamu
  // Ganti dengan IP publik VPS Biznet Gio kamu:
  'https://YOUR_BIZNET_GIO_DOMAIN_OR_IP',
  // Capacitor Android
  'capacitor://localhost',
  'http://localhost',
  // Android WebView
  'https://localhost',
];
```

**Catatan:** Jika domain Biznet Gio belum ada, tambahkan komentar TODO
dengan format IP yang akan digunakan.

---

### Task 3.2 — Update konfigurasi TURN server untuk Coturn Biznet Gio

**File:** `supabase/functions/turn-credentials/providers/static.ts`

Baca file ini terlebih dahulu. Kemudian update agar bisa dikonfigurasi
via environment variable yang akan diset di Supabase secrets:

```ts
export class StaticProvider {
  async getIceServers(): Promise<RTCIceServer[]> {
    // Ambil dari environment variable Supabase Edge Function secrets
    const turnUrl = Deno.env.get('COTURN_URL') ?? 'turn:YOUR_BIZNET_GIO_IP:3478';
    const turnUsername = Deno.env.get('COTURN_USERNAME') ?? '';
    const turnCredential = Deno.env.get('COTURN_CREDENTIAL') ?? '';

    const servers: RTCIceServer[] = [
      // STUN (gratis, tidak butuh auth)
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];

    // Tambahkan TURN hanya jika credential tersedia
    if (turnUsername && turnCredential) {
      servers.push(
        {
          urls: turnUrl,
          username: turnUsername,
          credential: turnCredential,
        },
        // TURN over TLS (port 443 untuk bypass firewall ketat)
        {
          urls: turnUrl.replace('turn:', 'turns:').replace(':3478', ':443'),
          username: turnUsername,
          credential: turnCredential,
        }
      );
    }

    return servers;
  }
}
```

Tambahkan juga buat file `supabase/functions/turn-credentials/README.md` berisi:

```markdown
# TURN Credentials Edge Function

## Environment Variables (set via Supabase Dashboard → Project Settings → Edge Functions)

| Variable | Description | Example |
|---|---|---|
| `TURN_PROVIDER` | Provider: `static`, `metered`, atau `twilio` | `static` |
| `COTURN_URL` | TURN server URL (Biznet Gio VPS) | `turn:123.456.789.0:3478` |
| `COTURN_USERNAME` | TURN username dari /etc/turnserver.conf | `nextvwt` |
| `COTURN_CREDENTIAL` | TURN password dari /etc/turnserver.conf | `your-secret-password` |
| `SUPABASE_URL` | Auto-injected by Supabase | — |
| `SUPABASE_ANON_KEY` | Auto-injected by Supabase | — |
| `SUPABASE_SERVICE_ROLE_KEY` | Set manually, needed for rate limiting | — |

## Testing TURN server dari browser

1. Buka https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
2. Hapus server default, tambahkan:
   - TURN URL: `turn:YOUR_BIZNET_GIO_IP:3478`
   - Username dan password dari turnserver.conf
3. Klik "Gather candidates" — pastikan muncul kandidat type `relay`
```

---

### Task 3.3 — Update `.env.example` dengan variabel Biznet Gio

**File:** `.env.example`

Ganti konten dengan template yang lebih lengkap dan informatif:

```bash
# ─── NextVWT Environment Variables Template ──────────────────────────────────
# Copy file ini ke .env.local lalu isi nilainya.
# JANGAN commit .env.local ke git.

# ─── Supabase ─────────────────────────────────────────────────────────────────
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable__YOUR_KEY

# ─── Google OAuth ─────────────────────────────────────────────────────────────
VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com

# ─── TURN Server (Coturn di Biznet Gio VPS Jakarta) ───────────────────────────
# Isi dengan IP publik atau domain VPS Biznet Gio kamu
# Format: turn:IP_VPS:3478
VITE_TURN_URL=turn:YOUR_BIZNET_GIO_IP:3478
VITE_TURN_USERNAME=nextvwt
VITE_TURN_CREDENTIAL=YOUR_COTURN_PASSWORD

# ─── Supabase Edge Function Secrets (set via Supabase Dashboard) ─────────────
# Variabel-variabel di bawah ini TIDAK perlu di .env.local.
# Set langsung di Supabase Dashboard → Project Settings → Edge Functions → Secrets.
#
# TURN_PROVIDER=static
# COTURN_URL=turn:YOUR_BIZNET_GIO_IP:3478
# COTURN_USERNAME=nextvwt
# COTURN_CREDENTIAL=YOUR_COTURN_PASSWORD
# SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

---

### Task 3.4 — Tambahkan `@ts-nocheck` removal notice ke turn-credentials

**File:** `supabase/functions/turn-credentials/index.ts`

File ini dimulai dengan `// @ts-nocheck`. Ganti dengan type annotations
yang proper agar TypeScript bisa memvalidasi file ini:

1. Hapus baris `// @ts-nocheck` di baris pertama.

2. Tambahkan type yang tepat untuk Deno imports. Jika TypeScript complain
   tentang Deno globals, tambahkan `/// <reference types="https://deno.land/x/types/index.d.ts" />`
   di baris pertama sebagai gantinya, atau biarkan dengan comment:
   ```ts
   // deno-lint-ignore-file no-explicit-any
   ```

3. Pastikan semua fungsi handler memiliki return type yang eksplisit:
   ```ts
   function handleCors(req: Request): Response | { headers: Record<string, string> } {
   ```

4. Jalankan di lingkungan Deno jika tersedia untuk memastikan tidak ada error.
   Jika tidak tersedia, pastikan TypeScript type check tidak ada error pada
   bagian non-Deno.

---

### Checkpoint Sprint 3

```bash
pnpm type-check
pnpm build
# Verifikasi tidak ada ALLOWED_ORIGINS yang masih placeholder:
grep "YOUR_" supabase/functions/turn-credentials/index.ts
grep "YOUR_" .env.example
```

---

## DELIVERABLES AKHIR

Setelah semua sprint selesai, buat file `REFACTOR_SUMMARY.md` di root
project berisi:

```markdown
# Refactor Summary — NextVWT

## Sprint 1 — Security & Critical
- [ ] window.usePTTStore dihapus dari App.tsx
- [ ] ROLE_PRIORITY diganti dengan roleRank dari permissions.ts
- [ ] Role dibaca dari Zustand state (myChannelRole) bukan localStorage langsung
- [ ] 34 file Python dipindah ke scripts/icon-tools/

## Sprint 2 — Modularitas
- [ ] subscribeToChannel diekstrak ke src/app/services/channelSubscription.ts
- [ ] Heartbeat timeout handler diimplementasi
- [ ] RadioLayout.tsx dipecah ke src/app/components/radio/
- [ ] PTTButton.tsx dipecah dengan usePttTransmit dan useLongPress hooks
- [ ] usePTTStore.ts setelah refactor: ___ baris (target < 80)
- [ ] RadioLayout.tsx setelah refactor: ___ baris (target < 150)
- [ ] PTTButton.tsx setelah refactor: ___ baris (target < 150)

## Sprint 3 — Biznet Gio Readiness
- [ ] ALLOWED_ORIGINS diupdate di turn-credentials/index.ts
- [ ] StaticProvider diupdate dengan env var COTURN_URL/USERNAME/CREDENTIAL
- [ ] README.md ditambahkan di turn-credentials/
- [ ] .env.example diupdate dengan template Biznet Gio
- [ ] @ts-nocheck dihapus dari turn-credentials/index.ts

## Build Status
- pnpm type-check: PASS / FAIL
- pnpm build: PASS / FAIL
- pnpm test: PASS / FAIL (___ tests passed, ___ failed)

## Masalah yang Ditemukan Selama Refactor
(isi jika ada temuan baru)
```

---

## CONSTRAINTS WAJIB

- **JANGAN** ubah nama atau signature dari `subscribeToChannel` yang di-export
  — ini dipanggil dari dalam store
- **JANGAN** ubah format key localStorage (`channel-role:${roomId}:${userId}`)
  — ini dipakai untuk persistence antar session
- **JANGAN** hapus fallback ke localStorage saat initial join — hanya
  event handler yang tidak boleh membaca langsung dari localStorage
- **JANGAN** ubah Supabase Edge Function runtime behavior — hanya
  typing dan konfigurasi
- **SELALU** jalankan `pnpm type-check` setelah setiap sprint
- **LAPORKAN** jika ada file yang tidak bisa dimodifikasi karena konflik
  dependency atau breaking change yang tidak terduga
