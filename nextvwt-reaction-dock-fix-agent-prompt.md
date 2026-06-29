# Agent Prompt — NextVWT: Fix Logika Dock Reaksi

> **Cara pakai:** Paste ke Claude Code, Cursor Agent, atau AI coding agent
> yang punya akses penuh ke root folder project NextVWT.
> Jalankan dari root direktori project.

---

## KONTEKS & TUJUAN

Ada 2 aturan bisnis yang harus diimplementasikan untuk sistem reaksi NextVWT:

**Aturan 1 — Channel restriction:**
- Channel **100** (Echo/Modulasi Test) dan Channel **000** (DUKUNGAN & BANTUAN)
  adalah channel khusus → **dock reaksi TIDAK boleh muncul** di kedua channel ini
- Alasan CH 100: channel untuk test suara solo, tidak ada interaksi sosial
- Alasan CH 000: channel resmi bantuan/support, tidak ada hiburan

**Aturan 2 — Local reaction rendering:**
- Saat user A mengirim reaksi (animasi/suara/gift) → user A sendiri melihat/
  mendengar reaksi itu secara lokal **sekaligus** reaction terbroadcast ke
  semua user lain di channel yang sama
- Saat user B menerima reaction dari broadcast → user B melihat/mendengar
  reaksi tersebut di HP masing-masing
- **Reaksi kategori `sound`** harus diputar sebagai audio secara lokal
  (tidak hanya muncul emoji floating) — baik saat mengirim maupun menerima

**Kondisi saat ini dari kode:**
- `QuickActionDock` hanya ditampilkan jika `showSocialFeatures=true` tapi
  tidak ada guard untuk channel 100 dan channel 0
- `handleSendReaction` di `useRadioOrchestrator.ts` sudah menampilkan
  floating reaction lokal untuk pengirim ✓
- `setOnReactionReceived` sudah menampilkan floating reaction untuk penerima ✓
- **Yang BELUM ada:**
  - Guard `channel !== 100 && channel !== 0` sebelum dock ditampilkan
  - Playback audio lokal untuk reaksi kategori `sound`
  - Guard yang sama di `broadcastReaction` agar tidak bisa broadcast dari CH 100/000

---

## FASE 0 — ORIENTASI

Baca file-file berikut sebelum mulai:

```bash
# Komponen dock
cat src/app/components/QuickActionDock.tsx

# Tempat dock dirender
cat src/app/components/radio/RadioFooter.tsx

# Logika kirim dan terima reaksi
sed -n '490,550p' src/app/hooks/useRadioOrchestrator.ts

# Bagaimana dock dipanggil dari RadioLayout/RadioBody
grep -n "QuickActionDock\|RadioQuickDock\|showSocialFeatures\|handleSendReaction" \
  src/app/components/RadioLayout.tsx \
  src/app/components/radio/RadioBody.tsx

# Channel config
grep -n "isolatedChannels\|{ number: 0\|{ number: 100" \
  src/app/utils/config.ts

# broadcastReaction di store
grep -n "broadcastReaction" \
  src/app/store/slices/createUISlice.ts
```

Konfirmasi:
1. Di file mana dan baris berapa `RadioQuickDock` / `QuickActionDock` dirender?
2. Apakah ada prop `channelNumber` yang diteruskan ke dock saat ini?
3. Apakah ada file audio untuk sound reactions (`laugh.mp3`, `drum.mp3`, dll)?

Laporkan temuan sebelum ke Fase 1.

---

## FASE 1 — TAMBAHKAN CHANNEL GUARD KE DOCK REAKSI

### Task 1.1 — Definisikan konstanta channel yang dilarang

**File:** `src/app/utils/config.ts`

Tambahkan konstanta baru di bawah `BRAND`:

```ts
/**
 * Channel yang TIDAK menampilkan dock reaksi (Animasi / Suara / Gift).
 * - CH 000: DUKUNGAN & BANTUAN — channel resmi, tidak ada fitur sosial
 * - CH 100: LANDING/ECHO TEST — channel solo untuk test modulasi
 */
export const NO_REACTION_CHANNELS: ReadonlySet<number> = new Set([0, 100]);
```

---

### Task 1.2 — Tambahkan prop `channelNumber` ke `RadioQuickDock`

**File:** `src/app/components/radio/RadioFooter.tsx`

Baca interface `RadioQuickDockProps` yang ada. Tambahkan prop `channelNumber`:

```ts
// SEBELUM:
interface RadioQuickDockProps {
  isUserListOpen: boolean;
  onOpenChat: () => void;
  onOpenQueue: () => void;
  onSendReaction: (category: 'animation' | 'sound' | 'gift', reactionType: string) => void;
  getThemeClass: (theme: string) => string;
}

// SESUDAH:
interface RadioQuickDockProps {
  isUserListOpen: boolean;
  onOpenChat: () => void;
  onOpenQueue: () => void;
  onSendReaction: (category: 'animation' | 'sound' | 'gift', reactionType: string) => void;
  getThemeClass: (theme: string) => string;
  channelNumber: number;  // ← tambahkan
}
```

Update implementasi `RadioQuickDock`:

```ts
export function RadioQuickDock({
  isUserListOpen,
  onOpenChat,
  onOpenQueue,
  onSendReaction,
  getThemeClass,
  channelNumber,  // ← tambahkan
}: RadioQuickDockProps) {
  const { isPowerOn, themeText } = usePTTStore();

  // Import NO_REACTION_CHANNELS dari config
  // Guard: jangan render dock di channel 100 dan channel 0
  if (!isUserListOpen) return null;
  if (NO_REACTION_CHANNELS.has(channelNumber)) return null;  // ← tambahkan

  return (
    <div onClick={(e) => e.stopPropagation()} className="w-full flex justify-center z-20 mt-3">
      <QuickActionDock
        onOpenChat={onOpenChat}
        onOpenQueue={onOpenQueue}
        onSendReaction={onSendReaction}
        isPowerOn={isPowerOn}
        showSocialFeatures={isPowerOn}
        themeKey={getThemeClass(themeText)}
      />
    </div>
  );
}
```

Tambahkan import di bagian atas file:

```ts
import { NO_REACTION_CHANNELS } from '../../utils/config';
```

---

### Task 1.3 — Teruskan channelNumber ke RadioQuickDock di tempat render

**File:** `src/app/components/RadioLayout.tsx` atau `src/app/components/radio/RadioBody.tsx`

Cari di mana `RadioQuickDock` dirender. Temukan baris yang mirip:

```tsx
// SEBELUM (contoh):
<RadioQuickDock
  isUserListOpen={isUserListOpen}
  onOpenChat={handleOpenChat}
  onOpenQueue={handleOpenQueue}
  onSendReaction={handleSendReaction}
  getThemeClass={getThemeClass}
/>

// SESUDAH:
<RadioQuickDock
  isUserListOpen={isUserListOpen}
  onOpenChat={handleOpenChat}
  onOpenQueue={handleOpenQueue}
  onSendReaction={handleSendReaction}
  getThemeClass={getThemeClass}
  channelNumber={channel}  // ← tambahkan (sesuaikan nama variabel dengan yang ada)
/>
```

Pastikan `channel` / `channelNumber` sudah tersedia di komponen tersebut.
Jika belum, ambil dari store:

```ts
const channel = usePTTStore((state) => state.channelNumber);
```

---

### Task 1.4 — Guard `broadcastReaction` di store agar tidak bisa broadcast dari CH 100/000

**File:** `src/app/store/slices/createUISlice.ts`

Temukan implementasi `broadcastReaction`:

```ts
// SEBELUM:
broadcastReaction: (category, reaction) => {
  // ... existing broadcast code
},

// SESUDAH:
broadcastReaction: (category, reaction) => {
  const state = get();

  // Guard: jangan broadcast reaksi dari channel 100 (echo test) atau channel 0 (support)
  if (state.channelNumber === 100 || state.channelNumber === 0) {
    console.warn(
      `[Reaction] Broadcast reaksi diblokir di channel ${state.channelNumber}`
    );
    return;
  }

  // ... existing broadcast code (tidak ada perubahan di sini)
},
```

---

### Task 1.5 — Guard `handleSendReaction` di orchestrator

**File:** `src/app/hooks/useRadioOrchestrator.ts`

Temukan `handleSendReaction`:

```ts
// SEBELUM:
const handleSendReaction = (category: 'animation' | 'sound' | 'gift', reactionType: string) => {
  if (!isPowerOn) return;
  // ...
};

// SESUDAH:
const handleSendReaction = (category: 'animation' | 'sound' | 'gift', reactionType: string) => {
  if (!isPowerOn) return;

  // Guard channel 100 dan 0 — tidak ada reaksi di channel khusus ini
  if (channel === 100 || channel === 0) return;

  // ... sisa kode tidak berubah
};
```

---

### Checkpoint Fase 1

```bash
pnpm type-check 2>&1 | grep "error TS" | wc -l
# Target: 0

# Test manual: buka app, masuk CH 100, cek dock tidak muncul
# Test manual: masuk CH 000, cek dock tidak muncul
# Test manual: masuk CH 001, cek dock MUNCUL seperti biasa
```

---

## FASE 2 — LOCAL AUDIO PLAYBACK UNTUK REAKSI SUARA

Reaksi kategori `sound` harus diputar sebagai audio secara lokal di HP user.
Saat ini hanya muncul emoji floating tanpa suara apapun.

### Task 2.1 — Buat hook `useReactionSounds`

**File baru:** `src/app/hooks/useReactionSounds.ts`

```ts
/**
 * useReactionSounds.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook untuk memutar efek suara reaksi secara lokal menggunakan Web Audio API.
 *
 * Tidak memerlukan file audio eksternal — semua suara di-generate secara
 * programatik menggunakan OscillatorNode dan AudioBufferSourceNode.
 *
 * Jika ingin menggunakan file audio (.mp3/.ogg), lihat Task 2.2 di bawah.
 */

import { useCallback, useRef } from 'react';
import { initGlobalAudioContext } from '../utils/audioContext';

// ─── Type ────────────────────────────────────────────────────────────────────

export type SoundReactionKind =
  | 'laugh'
  | 'buzzer'
  | 'drum'
  | 'horn'
  | 'ketawa_nular'
  | 'ketawa_anjay';

// ─── Sound generators (Web Audio API) ────────────────────────────────────────

/**
 * Buat sound "laugh" — cepat, ascending pitch
 */
function playLaugh(ctx: AudioContext, master: GainNode) {
  const times = [0, 0.08, 0.16, 0.24, 0.32];
  times.forEach((t, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(master);

    const freq = 350 + i * 80;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + t + 0.06);

    g.gain.setValueAtTime(0.4, ctx.currentTime + t);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.07);

    osc.type = 'sawtooth';
    osc.start(ctx.currentTime + t);
    osc.stop(ctx.currentTime + t + 0.08);
  });
}

/**
 * Buat sound "buzzer" — low buzz, negatif
 */
function playBuzzer(ctx: AudioContext, master: GainNode) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g);
  g.connect(master);

  osc.type = 'square';
  osc.frequency.setValueAtTime(120, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.4);

  g.gain.setValueAtTime(0.6, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.5);
}

/**
 * Buat sound "drum" — bass kick
 */
function playDrum(ctx: AudioContext, master: GainNode) {
  // Kick body
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g);
  g.connect(master);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(160, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);

  g.gain.setValueAtTime(0.9, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);

  // Snare noise
  const bufLen = Math.floor(ctx.sampleRate * 0.1);
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * 0.3;

  const noise = ctx.createBufferSource();
  const noiseGain = ctx.createGain();
  noise.buffer = buf;
  noise.connect(noiseGain);
  noiseGain.connect(master);
  noiseGain.gain.setValueAtTime(0.3, ctx.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  noise.start(ctx.currentTime);
  noise.stop(ctx.currentTime + 0.1);
}

/**
 * Buat sound "horn" — ascending fanfare
 */
function playHorn(ctx: AudioContext, master: GainNode) {
  const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(master);

    osc.type = 'square';
    osc.frequency.value = freq;

    const start = ctx.currentTime + i * 0.12;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(0.4, start + 0.04);
    g.gain.linearRampToValueAtTime(0.35, start + 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, start + 0.15);

    osc.start(start);
    osc.stop(start + 0.16);
  });
}

/**
 * Buat sound "ketawa_nular" — naik-turun berulang (contagious laugh)
 */
function playKetawaNular(ctx: AudioContext, master: GainNode) {
  const pattern = [440, 480, 420, 500, 400, 520, 380, 540];
  pattern.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(master);

    const t = ctx.currentTime + i * 0.09;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.2, t + 0.07);

    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.start(t);
    osc.stop(t + 0.09);
  });
}

/**
 * Buat sound "ketawa_anjay" — lebih eksplosif, descending
 */
function playKetawaAnjay(ctx: AudioContext, master: GainNode) {
  const pattern = [600, 550, 480, 400, 350];
  pattern.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(master);

    const t = ctx.currentTime + i * 0.07;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + 0.06);

    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.start(t);
    osc.stop(t + 0.08);
  });
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useReactionSounds() {
  const masterGainRef = useRef<GainNode | null>(null);

  const getMasterGain = useCallback((): GainNode | null => {
    const ctx = initGlobalAudioContext();
    if (!ctx) return null;

    if (!masterGainRef.current) {
      const gain = ctx.createGain();
      gain.gain.value = 0.8; // Volume master untuk semua efek suara reaksi
      gain.connect(ctx.destination);
      masterGainRef.current = gain;
    }
    return masterGainRef.current;
  }, []);

  /**
   * Putar efek suara untuk reaksi kategori 'sound'.
   * Dipanggil baik saat MENGIRIM maupun saat MENERIMA reaksi.
   *
   * @param reactionKind - jenis reaksi suara
   */
  const playReactionSound = useCallback(
    (reactionKind: string) => {
      const ctx = initGlobalAudioContext();
      if (!ctx) return;

      // Resume AudioContext jika suspended (wajib setelah user gesture)
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const master = getMasterGain();
      if (!master) return;

      try {
        switch (reactionKind as SoundReactionKind) {
          case 'laugh':
            playLaugh(ctx, master);
            break;
          case 'buzzer':
            playBuzzer(ctx, master);
            break;
          case 'drum':
            playDrum(ctx, master);
            break;
          case 'horn':
            playHorn(ctx, master);
            break;
          case 'ketawa_nular':
            playKetawaNular(ctx, master);
            break;
          case 'ketawa_anjay':
            playKetawaAnjay(ctx, master);
            break;
          default:
            console.warn(`[ReactionSounds] Unknown sound reaction: ${reactionKind}`);
        }
      } catch (err) {
        console.warn('[ReactionSounds] Gagal memutar efek suara:', err);
      }
    },
    [getMasterGain]
  );

  /**
   * Atur volume master untuk semua efek suara reaksi.
   * @param volume 0.0 – 1.0
   */
  const setReactionVolume = useCallback(
    (volume: number) => {
      if (masterGainRef.current) {
        masterGainRef.current.gain.value = Math.max(0, Math.min(1, volume));
      }
    },
    []
  );

  return { playReactionSound, setReactionVolume };
}
```

---

### Task 2.2 — OPSIONAL: Gunakan file audio jika tersedia

Jika ada file audio di `src/assets/sounds/reactions/` (`.mp3`, `.ogg`, `.webm`):

```bash
# Cek apakah ada file audio
ls src/assets/sounds/reactions/ 2>/dev/null || echo "Tidak ada folder sounds/reactions"
ls public/sounds/ 2>/dev/null || echo "Tidak ada folder public/sounds"
```

Jika ada file audio (`laugh.mp3`, `ketawa_nular.mp3`, dll), ganti implementasi
masing-masing fungsi generator dengan `HTMLAudioElement` atau `fetch + decodeAudioData`:

```ts
// Contoh menggunakan HTMLAudioElement (paling sederhana):
async function playFromFile(src: string, volume = 0.8): Promise<void> {
  try {
    const audio = new Audio(src);
    audio.volume = volume;
    await audio.play();
  } catch (err) {
    console.warn('[ReactionSounds] Gagal memutar file audio:', src, err);
  }
}

// Di dalam playReactionSound:
case 'laugh':
  await playFromFile('/sounds/reactions/laugh.mp3', 0.7);
  break;
case 'ketawa_nular':
  await playFromFile('/sounds/reactions/ketawa_nular.mp3', 0.8);
  break;
// dst.
```

**Pilih salah satu approach** — Web Audio API (Task 2.1) jika tidak ada file audio,
atau file audio (Task 2.2) jika sudah tersedia. Jangan gunakan keduanya sekaligus.

---

### Task 2.3 — Integrasikan `useReactionSounds` ke `useRadioOrchestrator.ts`

**File:** `src/app/hooks/useRadioOrchestrator.ts`

**Step 1:** Tambahkan import dan inisialisasi hook:

```ts
import { useReactionSounds } from './useReactionSounds';

// Di dalam function useRadioOrchestrator():
const { playReactionSound } = useReactionSounds();
```

**Step 2:** Update `handleSendReaction` — putar suara saat MENGIRIM reaksi:

```ts
const handleSendReaction = (category: 'animation' | 'sound' | 'gift', reactionType: string) => {
  if (!isPowerOn) return;

  // Guard channel 100 dan 0
  if (channel === 100 || channel === 0) return;

  // ── Putar suara secara lokal saat MENGIRIM ──────────────────────────────
  if (category === 'sound') {
    playReactionSound(reactionType);
  }
  // ── End sound playback ──────────────────────────────────────────────────

  const localDisplayName = infoText || 'Saya';
  const localId = Math.random().toString();
  const x = 30 + Math.random() * 40;

  setFloatingReactions((prev) => [
    ...prev,
    { id: localId, category, reaction: reactionType, x, senderName: localDisplayName },
  ]);

  const isVideo = reactionType === 'lion' || reactionType === 'aquarium';
  const isKetawa = reactionType === 'ketawa_nular' || reactionType === 'ketawa_anjay';
  setTimeout(
    () => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== localId));
    },
    isVideo ? 60000 : isKetawa ? 12000 : 5000
  );

  broadcastReaction(category, reactionType);
};
```

**Step 3:** Update `setOnReactionReceived` callback — putar suara saat MENERIMA reaksi:

```ts
useEffect(() => {
  setOnReactionReceived((payload) => {
    if (!isPowerOn) return;

    const state = usePTTStore.getState();
    const isSelf =
      payload.senderId === state.userId &&
      (!payload.senderCallSign || payload.senderCallSign === state.callSign);
    if (isSelf) return;

    // ── Putar suara secara lokal saat MENERIMA ──────────────────────────
    if (payload.category === 'sound') {
      playReactionSound(payload.reaction);
    }
    // ── End sound playback ─────────────────────────────────────────────

    const id = payload.id || Math.random().toString();
    const x = 30 + Math.random() * 40;
    const senderName = payload.senderName || 'User';

    setFloatingReactions((prev) => [
      ...prev,
      { id, category: payload.category, reaction: payload.reaction, x, senderName },
    ]);

    const isVideo = payload.reaction === 'lion' || payload.reaction === 'aquarium';
    const isKetawa = payload.reaction === 'ketawa_nular' || payload.reaction === 'ketawa_anjay';
    setTimeout(
      () => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
      },
      isVideo ? 60000 : isKetawa ? 12000 : 5000
    );
  });

  return () => {
    setOnReactionReceived(null);
  };
}, [isPowerOn, setOnReactionReceived, playReactionSound]);
```

---

### Task 2.4 — Pastikan reaksi animasi juga terlihat secara lokal

Verifikasi bahwa `floatingReactions` ditampilkan di UI baik untuk pengirim
maupun penerima. Baca `RadioBody.tsx`:

```bash
grep -n "floatingReactions\|FloatingReaction\|setFloatingReactions" \
  src/app/components/radio/RadioBody.tsx
```

Pastikan kondisi render floating reactions sudah benar:

```tsx
{/* Floating reactions harus muncul untuk SEMUA user di channel */}
{isPowerOn && floatingReactions.length > 0 && (
  <div className="absolute inset-x-0 ...">
    {floatingReactions.map((r) => (
      // ... render emoji/animasi
    ))}
  </div>
)}
```

Jika ada kondisi `isUserListOpen &&` di depan `floatingReactions.map`, pertimbangkan
apakah itu perlu atau malah membatasi tampilan reaksi. Floating reactions seharusnya
bisa tampil meskipun user list tidak terbuka.

---

### Task 2.5 — Tambahkan animasi gift yang terlihat

Untuk kategori `gift`, floating reaction saat ini hanya menampilkan emoji.
Tambahkan efek visual khusus untuk gift:

**File:** `src/app/components/radio/RadioBody.tsx`

Cari di mana `floatingReactions.map` berada dan tambahkan variasi render
berdasarkan `category`:

```tsx
{floatingReactions.map((r) => {
  const isGift = r.category === 'gift';
  const isSound = r.category === 'sound';

  return (
    <div
      key={r.id}
      className="absolute pointer-events-none select-none"
      style={{
        left: `${r.x}%`,
        bottom: 0,
        animation: isGift
          ? 'float-up-bounce 3s ease-out forwards'  // gift: bounce saat naik
          : 'float-up 5s ease-out forwards',         // animasi: normal float
        fontSize: isGift ? '32px' : '26px',          // gift: lebih besar
        filter: isGift
          ? 'drop-shadow(0 0 8px gold) drop-shadow(0 0 16px rgba(255,215,0,0.5))'
          : 'none',
      }}
    >
      {/* Emoji reaksi */}
      {r.reaction === 'applause' ? '👏' :
       r.reaction === 'love' ? '❤️' :
       r.reaction === 'laugh' ? '🤣' :
       r.reaction === 'buzzer' ? '❌' :
       r.reaction === 'drum' ? '🥁' :
       r.reaction === 'horn' ? '🎺' :
       r.reaction === 'ketawa_nular' ? '😆' :
       r.reaction === 'ketawa_anjay' ? '😂' :
       r.reaction === 'giftbox' ? '🎁' :
       r.reaction === 'rose' ? '🌹' :
       r.reaction === 'diamond' ? '💎' :
       r.reaction === 'coffee' ? '☕' :
       r.reaction}

      {/* Label nama pengirim di bawah emoji */}
      {r.senderName && (
        <div
          className="text-center mt-0.5"
          style={{
            fontSize: '9px',
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '0.5px',
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          }}
        >
          {r.senderName}
        </div>
      )}
    </div>
  );
})}
```

**Catatan:** Jika sudah ada implementasi emoji yang berbeda, pertahankan yang
ada dan hanya tambahkan efek gift-specific (filter glow dan ukuran lebih besar).

---

## FASE 3 — VERIFIKASI AKHIR

### 3.1 Type check

```bash
pnpm type-check
# Target: 0 errors
```

### 3.2 Test manual — channel restriction

Buka app dan lakukan:

```
CH 100 → Tekan PTT → Lihat LCD dan UI
  □ Dock reaksi (Animasi/Suara/Gift) TIDAK muncul sama sekali
  □ Floating reactions TIDAK muncul
  □ PTT masih berfungsi normal (echo test)

CH 000 (DUKUNGAN & BANTUAN) → Masuk channel
  □ Dock reaksi TIDAK muncul sama sekali

CH 001 atau channel manapun selain 000 dan 100
  □ Dock reaksi MUNCUL seperti biasa saat user list terbuka
  □ Tombol Animasi, Suara, Gift tersedia
```

### 3.3 Test manual — local reaction playback

```
Buka CH 001, ada minimal 2 user (atau simulasikan dengan 2 browser tab):

User A mengirim reaksi kategori SUARA (contoh: "drum")
  □ User A: floating emoji 🥁 muncul + suara drum terdengar di HP A
  □ User B: floating emoji 🥁 muncul + suara drum terdengar di HP B

User B mengirim reaksi kategori ANIMASI (contoh: "fire")
  □ User B: floating emoji 🔥 muncul di screen B
  □ User A: floating emoji 🔥 muncul di screen A
  □ TIDAK ada suara (kategori animation tidak punya audio)

User A mengirim reaksi kategori GIFT (contoh: "giftbox")
  □ User A: floating emoji 🎁 muncul dengan efek glow gold di screen A
  □ User B: floating emoji 🎁 muncul dengan efek glow gold di screen B
  □ TIDAK ada suara (kategori gift tidak punya audio)
```

### 3.4 Unit test

```bash
pnpm test --run
```

---

## DELIVERABLES AKHIR

Setelah semua fase selesai, laporkan:

```
LAPORAN FIX DOCK REAKSI
========================

1. Channel Guard:
   □ NO_REACTION_CHANNELS didefinisikan di config.ts: [0, 100]
   □ RadioQuickDock return null untuk CH 000 dan CH 100
   □ handleSendReaction guard di useRadioOrchestrator.ts
   □ broadcastReaction guard di createUISlice.ts
   File yang dimodifikasi: ___________

2. Local Sound Playback:
   □ useReactionSounds.ts dibuat di src/app/hooks/
   □ Approach yang dipakai: Web Audio API / file audio
   □ Sound reactions yang diimplementasi:
     - laugh: ✓/✗
     - buzzer: ✓/✗
     - drum: ✓/✗
     - horn: ✓/✗
     - ketawa_nular: ✓/✗
     - ketawa_anjay: ✓/✗
   □ playReactionSound dipanggil saat MENGIRIM reaksi
   □ playReactionSound dipanggil saat MENERIMA reaksi

3. Floating Reactions:
   □ Tampil untuk pengirim (local): ✓/✗
   □ Tampil untuk penerima (broadcast): ✓/✗
   □ Gift memiliki efek visual khusus (glow gold): ✓/✗
   □ Label nama pengirim ditampilkan: ✓/✗

4. Test Manual:
   CH 100 — dock tidak muncul: PASS/FAIL
   CH 000 — dock tidak muncul: PASS/FAIL
   CH 001 — dock muncul: PASS/FAIL
   Sound reaction terdengar saat kirim: PASS/FAIL
   Sound reaction terdengar saat terima: PASS/FAIL
   Animation reaction tampil tanpa suara: PASS/FAIL
   Gift reaction tampil dengan efek: PASS/FAIL

5. Type check: PASS/FAIL (___ errors)
6. Unit test: ___/total passed
```

---

## CONSTRAINTS WAJIB

- **JANGAN** tambahkan dependency baru (Howler.js, Tone.js, dll) — gunakan
  Web Audio API yang sudah ada via `initGlobalAudioContext()`
- **JANGAN** ubah interface `QuickActionDock` selain menambahkan props yang diperlukan
- **JANGAN** hapus animasi floating reactions yang sudah ada — hanya tambahkan
  guard channel dan playback suara
- **SELALU** gunakan `initGlobalAudioContext()` dari `utils/audioContext.ts`
  (bukan `new AudioContext()` langsung) untuk menghindari duplikasi context
- **PASTIKAN** `playReactionSound` tidak throw exception — selalu wrap dengan
  try/catch karena iOS WebView kadang memblokir audio
- **JANGAN** memutar suara untuk kategori `animation` and `gift` — hanya
  kategori `sound` yang memiliki audio
- Tambahkan `playReactionSound` ke dependency array `useEffect` yang memanggil
  `setOnReactionReceived` untuk menghindari stale closure
