# NextVWT PTT App — Walkie-Talkie Digital Berbasis Internet

> **Versi:** 0.0.1 (Pre-Beta)  
> **Status:** ✅ Sistem Moderasi Terimplementasi · 🔴 Rotasi Credential Wajib Sebelum Distribusi  
> **Stack:** React 18 + TypeScript + Zustand 5 + Supabase Realtime + WebRTC + Capacitor Android 8  
> **Skor Kesiapan Produksi:** 92 / 100

---

## Apa itu NextVWT?

**NextVWT (Next Virtual Walkie-Talkie)** adalah aplikasi komunikasi Push-to-Talk (PTT) berbasis internet yang menghadirkan pengalaman walkie-talkie fisik dalam bentuk aplikasi Android. Pengguna bergabung ke saluran (channel) bernomor, berbicara real-time, dan menikmati antarmuka walkie-talkie skeuomorfik yang imersif dengan 8 tema visual premium.

---

## Dokumen Strategi & Implementasi Wajib

Untuk arsitektur target, roadmap pengembangan, KPI teknis, dan template kode modul inti (floor control, AI noise cancellation, wallet/koin, ROIP bridge, backend webhook), gunakan:

→ **[Implementasi wajib nextvwt.md](./Implementasi%20wajib%20nextvwt.md)**  
→ **[NextVWT_PRD_v3.md](./NextVWT_PRD_v3.md)** — dokumen produk aktif (roadmap, ADR, backlog, KPI)  
→ **[Spesifikasi_Infrastruktur_VPS_NextVWT.md](./Spesifikasi_Infrastruktur_VPS_NextVWT.md)** — spesifikasi teknis VPS untuk SFU/MQTT

**Eksekusi beta (P0):**
→ **[NextVWT_Blok_A_Keamanan_Runbook.md](./NextVWT_Blok_A_Keamanan_Runbook.md)** — panduan SEC-01 s/d SEC-08  
→ **[NextVWT_Privacy_Policy_dan_ToS_Draft.md](./NextVWT_Privacy_Policy_dan_ToS_Draft.md)** — draft Privacy Policy, ToS & kebijakan komunitas  
→ **[NextVWT_Beta_Testing_Protocol.md](./NextVWT_Beta_Testing_Protocol.md)** — protokol closed beta & skenario uji  
→ **[NextVWT_Owner_Playbook_Persiapan_Lengkap.md](./NextVWT_Owner_Playbook_Persiapan_Lengkap.md)** — panduan lengkap tahapan persiapan dari sisi owner

---

## Fitur Utama

- 🎙️ **PTT real-time** via WebRTC P2P + fallback Supabase Realtime
- 📡 **Channel 0–999** dengan presence tracking per channel
- 🔐 **Sistem Moderasi 5 Level**: N.O.C → Sys Admin → PJC → Operator → User Biasa
- 🎤 **Karaoke Mode**: audio stereo Opus 128kbps, built-in echo/reverb
- 🎨 **8 tema visual** skeuomorfik + glassmorfik premium
- 📱 **Android native** via Capacitor 8 dengan certificate pinning
- 🔄 **TURN server** multi-provider (Metered, Twilio, Static fallback)
- 🎵 **Entertainment**: Karaoke Queue, Song Request, Reactions (tipe definitions ready)

---

## Struktur Dokumen

| File | Deskripsi |
|------|-----------|
| `README.md` | Dokumen ini — gambaran proyek dan quick start |
| **`Implementasi wajib nextvwt.md`** | **Referensi utama** — strategi implementasi, roadmap 0–24 bulan, KPI, dan template codebase (PTT, audio, payment, ROIP, server) |
| **`NextVWT_PTT_Audit_Report_v4.md`** | **Laporan audit teknis terbaru** (skor prototipe 92/100) + addendum dokumentasi |
| `NextVWT_Super_Prompt.md` | Super prompt untuk AI coding assistant |
| **`NextVWT_PRD_v3.md`** | **PRD aktif** — rekonsiliasi PRD v2 + Implementasi Wajib + Audit v4 |
| **`Spesifikasi_Infrastruktur_VPS_NextVWT.md`** | **Spesifikasi VPS** — port, firewall, Ubuntu 22.04, stack SFU/MQTT (siap kirim ke provider) |
| **`NextVWT_Owner_Playbook_Persiapan_Lengkap.md`** | **Owner Playbook** — tahapan, akun, dokumen, biaya, checklist dari sisi pemilik aplikasi |
| **`NextVWT_Rincian_Biaya_Owner.md`** | **Rincian biaya** — breakdown F2/F3/F4, skenario minimal/standar/lengkap, biaya bulanan |
| **`NextVWT_Blok_A_Keamanan_Runbook.md`** | **Runbook keamanan** — eksekusi SEC-01 s/d SEC-08 sebelum beta |
| **`NextVWT_Privacy_Policy_dan_ToS_Draft.md`** | **Draft legal** — Privacy Policy, ToS, kebijakan komunitas (template) |
| **`NextVWT_Beta_Testing_Protocol.md`** | **Protokol beta** — skenario uji, kriteria lulus, template laporan |
| `NextVWT_PRD.md` | PRD v2.0 (arsitektur prototipe, arsip) |
| `PRD.md` | PRD versi ringkas (arsip) |
| `NEXTVWT_MODERASI_CHANNEL_HIRARKI.md` | Draft sistem moderasi 5 level (tanpa donasi) |
| `NEXTVWT_MODERASI_CHANNEL_HIRARKI_DONASI.md` | Draft sistem moderasi + fitur donasi |
| `NEXTVWT_MASTER_ENTERTAINMENT_IMPLEMENTATION_PLAN_NO_LIVE_STAGE.md` | Plan implementasi fitur entertainment |
| `DESIGN_SPEC.md` | Spesifikasi desain visual lengkap |
| `DESIGN_SPEC_MODALS_PANELS.md` | Spesifikasi modal dan panel UI |
| `LAYER_BREAKDOWN.md` | Breakdown komponen layer per layer |
| `CARA_KERJA_LOGIKA_FITUR.md` | Dokumentasi arsitektur & logika teknis |
| `RELEASE_GUIDE.md` | Panduan rilis Android & CI/CD |
| `pengelolaan_channel_nextvwt(2).md` | UI spec panel kelola channel |

---

## Prerequisites & Environment
- **Google Cloud SDK**: Terinstal & Terautentikasi.
  - Path Instalasi: `C:\Users\ASUS\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin`
  - Perintah refresh path di terminal saat ini:
    `$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")`

## Quick Start

```bash
# Install dependencies
pnpm install

# Development
pnpm dev

# Build
pnpm build

# Test
pnpm test
pnpm test:e2e:playwright

# Android
npx cap sync android
npx cap open android
```

---

## ⚠️ Sebelum Distribusi

File `.env` masih ter-commit di repositori dan berisi credential nyata. **Wajib diselesaikan hari ini:**

```bash
# 1. Rotasi credential di Supabase Dashboard + Google Cloud Console
# 2. Hapus dari git history:
java -jar bfg.jar --delete-files .env .
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

---

## Arsitektur Sistem

```
src/
├── app/
│   ├── components/       UI components (RadioLayout, LCDPanel, PTTButton, dll.)
│   ├── hooks/            Audio hooks (useVAD, useWebRTC, useAudioPlayback, useAudioStreamer)
│   ├── store/            Zustand store dengan 5 slices + storeUtils
│   └── utils/            Config, security, rate limiter, audio analyzer
├── features/
│   ├── moderation/       ✅ Implementasi lengkap (panel, hooks, permissions, tests)
│   ├── admin/            Types untuk role & permissions
│   ├── chat/             Types (implementasi next sprint)
│   ├── karaoke-queue/    Types (implementasi next sprint)
│   ├── reactions/        Types (implementasi next sprint)
│   ├── song-request/     Types (implementasi next sprint)
│   ├── presence/         Types (implementasi next sprint)
│   └── themes/           Theme catalog (3 tema aktif)
└── styles/               CSS themes, animations, fonts
supabase/
├── functions/turn-credentials/   Edge Function TURN multi-provider
└── migrations/                   Schema moderasi + turn rate limits
```

---

## Sistem Moderasi

Hirarki 5 level yang sudah terimplementasi penuh:

| Level | Role | Cakupan |
|-------|------|---------|
| 1 | **N.O.C** | Global — semua channel |
| 2 | **Sys Admin** | Global — semua channel |
| 3 | **PJC** | Per-channel yang ditugaskan |
| 4 | **Operator Otomatis** | Per-channel yang ditugaskan |
| 5 | **User Biasa / Tamu** | Akses dasar |

Lihat `NEXTVWT_MODERASI_CHANNEL_HIRARKI.md` untuk dokumentasi lengkap.

---

*NextVWT PTT App · © 2024–2026 Stevan Usherianto · Hak cipta dilindungi*
