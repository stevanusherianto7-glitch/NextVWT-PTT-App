# SFU Runbook — NextVWT PTT (LiveKit)

Panduan menjalankan, memverifikasi, dan mengatasi masalah **LiveKit SFU** untuk
NextVWT. Dokumen ini dibuat dari hasil debugging live (2026-07-22) — semua
perintah di bawah **sudah terverifikasi jalan** di mesin dev.

---

## 1. Arsitektur Singkat

```
[Browser/App] --(1) minta token--> [Supabase Edge Function: livekit-token]
                                          |
                                     (2) sign JWT pakai LIVEKIT_API_SECRET
                                          |
[Browser/App] --(3) connect ws://HOST:7880 + token--> [LiveKit Server]
                                          |
                                     (4) publish/subscribe audio track (SFU)
```

- **(1) Token** di-generate di **server** (Edge Function), bukan client.
  `LIVEKIT_API_SECRET` tidak pernah ke bundle client (lihat `src/app/services/livekitToken.ts`).
- **(3) Flag dual-mode**: `VITE_LIVEKIT_URL` **kosong** → fallback mesh Supabase;
  **terisi** → SFU aktif (`USE_SFU = Boolean(VITE_LIVEKIT_URL)`).

---

## 2. Prerequisites

| Kebutuhan | Cara cek | Status dev |
|---|---|---|
| Docker Desktop (Engine running) | `docker info` → "Server: ..." | ✅ terpasang |
| Supabase CLI | `npx supabase --version` | ✅ v2.x |
| `.env` dari `.env.example` | `cp .env.example .env` | wajib |
| `VITE_LIVEKIT_URL` di `.env` | `ws://localhost:7880` | dev lokal |

> **JANGAN commit `.env`** — sudah di-`.gitignore`.

---

## 3. Jalankan Stack Dev (Lokal)

### Opsi A — One-command (rekomendasi)
```bash
bash scripts/dev-livekit.sh
```
Script menjalankan berturut-turut:
1. `docker compose -f docker-compose.livekit.yml up -d` (LiveKit)
2. `npx supabase start` (DB + Auth lokal, jika belum jalan)
3. `npx supabase functions serve livekit-token --no-verify-jwt` (token generator)

> Catatan: `supabase start` mendownload image Postgres/GoTrue (bisa lambat,
> >5 menit di koneksi terbatas). Jika hang, gunakan **Opsi B** (Cloud).

### Opsi B — LiveKit lokal + Edge Function di Supabase Cloud
Paling cepat jika project Supabase Cloud sudah ada:
```bash
# 1. LiveKit lokal
docker compose -f docker-compose.livekit.yml up -d

# 2. Deploy Edge Function ke Cloud (butuh login + set secret)
npx supabase login
npx supabase functions deploy livekit-token
# Set di Dashboard: LIVEKIT_API_KEY + LIVEKIT_API_SECRET (lihat §5)
```

### Opsi C — Full Cloud (produksi/staging)
- LiveKit di VPS (self-host) atau LiveKit Cloud.
- Edge Function deploy ke Supabase Cloud.
- `VITE_LIVEKIT_URL=wss://<domain-livekit>:443` di `.env` VPS.

---

## 4. Verifikasi (bukti nyata, bukan asumsi)

Setelah container jalan, cek:

```bash
# Container harus "Up"
docker ps --filter name=nextvwt-livekit --format "{{.Names}} {{.Status}}"
# → nextvwt-livekit Up ...

# Signaling endpoint harus balas HTTP 200
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:7880/
# → HTTP 200

# Log server tidak boleh ada error "secret too short" / "no keys provided"
docker logs nextvwt-livekit 2>&1 | tail -5
# → INFO starting LiveKit server portHttp 7880, rtc.portTCP 7881,
#      rtc.portICERange [50000,60000]
```

Lalu di app:
```bash
pnpm dev   # buka http://localhost:5188
```
- Power on → `[SFU] gagal connect` **tidak** muncul di console.
- `useSfuTransport` connect ke `ws://localhost:7880` + token dari Edge Function.

---

## 5. Secrets Dev (placeholder — JANGAN pakai di prod)

| Var | Nilai |
|---|---|
| `LIVEKIT_API_KEY` | `devkey` |
| `LIVEKIT_API_SECRET` | `secret1234567890abcdefghijklmnopqr` (34 char) |

Sumber kebenaran: `docker-compose.livekit.yml` (`LIVEKIT_KEYS`) dan
`.env.example`. **Samakan** di Supabase Dashboard bila deploy Edge Function.

> ⚠️ Secret di atas adalah **dev placeholder**. Produksi: generate secret acak
> ≥32 char, simpan **hanya** di server (Supabase Dashboard / env VPS), tidak di
> client bundle.

---

## 6. Troubleshooting (dari log nyata)

| Gejala / Log | Penyebab | Fix |
|---|---|---|
| `Incorrect Usage: flag provided but not defined: -rtc-port` | flag salah di livekit 1.13.4 | gunakan `--udp-port 50000-50020` (sudah di compose) |
| `listen tcp: lookup 0.0.0.0:7880: no such host` | `--bind 0.0.0.0:7880` di-resolve DNS | pindah ke env `LIVEKIT_BIND=0.0.0.0` + `LIVEKIT_WS_PORT=7880` |
| `secret is too short, should be at least 32 characters` | secret <32 char | panjangkan (sudah 34 char di compose) |
| `Could not parse keys, it needs to be exactly, "key: secret"` | `--keys` tanpa spasi | gunakan env `LIVEKIT_KEYS="devkey: secret..."` (spasi wajib) |
| `Access to fetch ... blocked by CORS policy` | Edge Function `livekit-token` **belum deploy** | deploy/`serve` fungsi (§3) — `functions.invoke` ditangani SDK, bukan raw fetch |
| `[SFU] gagal connect ke LiveKit: Gagal mint token` | token endpoint 404 / offline | pastikan `supabase functions serve`/`deploy` jalan (§3) |
| `The Compose app is no longer running` (Docker Desktop) | container stop | `docker compose -f docker-compose.livekit.yml up -d` |
| `daemon down` saat `docker compose` | Docker Desktop belum start | buka Docker Desktop, tunggu "Engine running" |

---

## 7. Hentikan / Bersihkan

```bash
# Stop LiveKit saja
docker compose -f docker-compose.livekit.yml down

# Stop Supabase lokal (termasuk DB)
npx supabase stop

# Hapus volume Supabase (hatus-hati: hapus data lokal)
npx supabase stop --no-backup
```

---

## 8. File Terkait

| File | Fungsi |
|---|---|
| `docker-compose.livekit.yml` | LiveKit server container (port 7880/7881, UDP 50000-50020) |
| `supabase/functions/livekit-token/index.ts` | Edge Function generate token (CORS + auth user) |
| `supabase/config.toml` | config dev (`verify_jwt=false`) |
| `scripts/dev-livekit.sh` | one-command launcher (LiveKit + Supabase) |
| `src/app/services/livekitToken.ts` | client fetch token via `supabase.functions.invoke` |
| `src/app/services/livekitAudioTransport.ts` | `LiveKitAudioTransport` (impl `AudioTransport`) |
| `src/app/hooks/useSfuTransport.ts` | lifecycle connect/disconnect/mic SFU |
| `.env.example` | `VITE_LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` |

---

## 9. Catatan Keamanan (wajib baca)

1. **Token di server**. Client hanya terima JWT jadi; tidak bisa spoof identity
   (identity diambil dari `user.id` di Edge Function).
2. **`VITE_` prefix = publik**. `VITE_LIVEKIT_URL` aman di client.
   `LIVEKIT_API_SECRET` **TIDAK** boleh ada di `.env` client — hanya di server
   (Supabase Dashboard / env VPS).
3. **Dev mode** (`LIVEKIT_DEV=true`) mengizinkan `ws://` tanpa TLS — hanya untuk
   localhost. Produksi wajib `wss://` + sertifikat valid.
4. **Channel 100 = echo** tetap loopback lokal, tidak publish ke SFU.
