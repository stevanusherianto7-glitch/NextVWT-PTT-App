# Product Requirements Document (PRD)
# NextVWT — Virtual Walkie-Talkie PTT App

| | |
|---|---|
| **Versi Dokumen** | 1.1 |
| **Status** | Draft — Review Internal |
| **Tanggal** | Juli 2026 |
| **Product Owner** | Stevan Usherianto |
| **Platform Target** | Android (iOS roadmap) |
| **Fase Saat Ini** | Beta (audio mesh fallback + **LiveKit SFU aktif dev**, lihat `docs/SFU_RUNBOOK.md`) |

---

## Daftar Isi

1. [Ringkasan Produk](#1-ringkasan-produk)
2. [Latar Belakang & Peluang Pasar](#2-latar-belakang--peluang-pasar)
3. [Tujuan & Sasaran](#3-tujuan--sasaran)
4. [Pengguna & Persona](#4-pengguna--persona)
5. [Fitur & Persyaratan Fungsional](#5-fitur--persyaratan-fungsional)
6. [Persyaratan Non-Fungsional](#6-persyaratan-non-fungsional)
7. [Arsitektur Sistem](#7-arsitektur-sistem)
8. [Desain UI/UX](#8-desain-uiux)
9. [Model Monetisasi](#9-model-monetisasi)
10. [Metrik Keberhasilan](#10-metrik-keberhasilan)
11. [Roadmap Rilis](#11-roadmap-rilis)
12. [Risiko & Mitigasi](#12-risiko--mitigasi)
13. [Dependensi & Asumsi](#13-dependensi--asumsi)
14. [Di Luar Cakupan](#14-di-luar-cakupan)

---

## 1. Ringkasan Produk

### 1.1 Deskripsi Singkat

**NextVWT (Next Virtual Walkie-Talkie)** adalah aplikasi komunikasi Push-to-Talk (PTT) berbasis internet yang menghadirkan pengalaman walkie-talkie fisik dalam bentuk aplikasi smartphone. Pengguna dapat bergabung ke saluran (channel) bernomor, berbicara secara real-time dengan pengguna lain di saluran yang sama, dan menikmati tampilan antarmuka perangkat walkie-talkie yang imersif dan realistis.

### 1.2 Proposisi Nilai Utama

> **"Walkie-talkie profesional di saku Anda — tanpa frekuensi radio, tanpa jarak batas, tanpa biaya perangkat keras."**

- **Gratis & Instan:** Tidak perlu beli perangkat walkie-talkie. Cukup install dan langsung berkomunikasi.
- **Jangkauan Tak Terbatas:** Selama ada koneksi internet, pengguna bisa berkomunikasi lintas kota, pulau, bahkan negara.
- **Karaoke Mode Unik:** Satu-satunya PTT app yang memiliki mode transmisi musik berkualitas tinggi (stereo Opus 128kbps) dengan built-in echo effect untuk karaoke bersama.
- **Desain Imersif:** Tampilan walkie-talkie skeuomorfik 3D dengan 8 tema visual premium yang dapat disesuaikan.
- **White-Label Ready:** Arsitektur modular yang memungkinkan rebrand cepat untuk klien korporat atau komunitas spesifik.

### 1.3 Tagline

*"NEXT VIRTUAL WALKIE TALKIE"*

---

## 2. Latar Belakang & Peluang Pasar

### 2.1 Konteks

Walkie-talkie fisik masih banyak digunakan di Indonesia oleh komunitas motor, tim SAR, pengamanan lingkungan (siskamling), panitia acara, dan penghobi radio amatir. Namun perangkat fisik memiliki keterbatasan: harga mahal, frekuensi terbatas, jangkauan pendek, dan memerlukan perijinan ORARI untuk penggunaan tertentu.

Solusi digital seperti Zello dan Voxer sudah ada di pasar global, namun memiliki gap:
- UI generik dan kurang imersif
- Tidak ada mode musik/karaoke
- Tidak ada versi white-label mudah untuk komunitas Indonesia
- Monetisasi model yang kurang sesuai konteks Indonesia

### 2.2 Peluang

| Segmen | Estimasi Pengguna Potensial Indonesia |
|---|---|
| Komunitas motor (Kawasaki, Honda, Suzuki, dll.) | ~5 juta anggota aktif |
| Tim siskamling & keamanan warga | ~8 juta petugas |
| Panitia event & EO | ~500 ribu profesional |
| Penghobi walkie-talkie & radio amatir | ~300 ribu anggota ORARI |
| Tim outdoor (hiking, SAR, pecinta alam) | ~2 juta aktif |
| **Total Addressable Market (TAM)** | **~15 juta pengguna** |

### 2.3 Kompetitor

| Kompetitor | Kekuatan | Kelemahan NextVWT vs Mereka |
|---|---|---|
| **Zello** | Brand recognition global, fitur lengkap | UI lebih imersif, karaoke mode, white-label |
| **Voxer** | UX baik, versi bisnis tersedia | Lebih murah, lebih lokal |
| **TeamSpeak** | Latensi sangat rendah, untuk gaming | PTT UX lebih baik, tidak perlu server sendiri |
| **WhatsApp Voice** | Penetrasi tinggi di Indonesia | PTT dedicated, channel management, mode radio |

---

## 3. Tujuan & Sasaran

### 3.1 Tujuan Bisnis

| Periode | Target |
|---|---|
| 3 bulan (Beta) | 1.000 pengguna aktif, validasi PMF pada 3 komunitas |
| 6 bulan (v1.0) | 10.000 pengguna aktif, 2 klien white-label berbayar |
| 12 bulan | 50.000 pengguna aktif, revenue Rp 50 juta/bulan |

### 3.2 Tujuan Produk (OKR)

**Objective 1: Luncurkan aplikasi yang stabil dan aman**
- KR1: Crash rate < 0.5% per sesi
- KR2: Audio latency rata-rata < 300ms
- KR3: Zero credential leak incident
- KR4: App Store rating ≥ 4.2 bintang

**Objective 2: Akuisisi & Retensi Pengguna**
- KR1: D1 retention ≥ 40%
- KR2: D7 retention ≥ 20%
- KR3: Rata-rata sesi per pengguna per hari ≥ 3 kali
- KR4: Durasi sesi rata-rata ≥ 8 menit

**Objective 3: Validasi Monetisasi**
- KR1: 5% pengguna aktif upgrade ke Premium
- KR2: 2 kontrak white-label dalam 6 bulan
- KR3: ARPU (Average Revenue Per User) ≥ Rp 15.000/bulan

---

## 4. Pengguna & Persona

### Persona 1: Pebe — Ketua Komunitas Motor 🏍️
> *"Saya perlu koordinasi real-time saat touring, tapi walkie-talkie fisik mahal dan ribet."*

- **Usia:** 32 tahun
- **Lokasi:** Bandung, Jawa Barat
- **Perangkat:** Android mid-range (Xiaomi/Samsung)
- **Kebutuhan:** Channel khusus komunitas, PTT push-hold, koordinasi 10–50 orang sekaligus
- **Pain Point:** Walkie-talkie fisik baterainya habis, sinyal terbatas, tidak ada fitur group chat
- **Fitur Prioritas:** Channel list, user count per channel, PTT button besar, haptic feedback

### Persona 2: Pak Rudi — Koordinator Siskamling 🏘️
> *"Saya mau bisa panggil semua anggota ronda dengan cepat, bukan ketuk pintu satu-satu."*

- **Usia:** 48 tahun
- **Lokasi:** Perumahan Depok
- **Perangkat:** Android entry-level (Samsung A series)
- **Kebutuhan:** Aplikasi mudah dipakai, tidak ribet, satu tombol tekan langsung ngobrol
- **Pain Point:** Tidak melek teknologi, tidak mau banyak setting
- **Fitur Prioritas:** UI sederhana, tombol PTT besar, mode tamu (tanpa login)

### Persona 3: Dewi — Panitia Event Musik 🎶
> *"Saat konser, saya butuh koordinasi audio-quality tinggi dengan tim stage crew."*

- **Usia:** 27 tahun
- **Lokasi:** Jakarta
- **Perangkat:** iPhone + Android (dual)
- **Kebutuhan:** Kualitas audio kristal, karaoke mode untuk cek sound, koordinasi tim produksi
- **Pain Point:** Zello terlalu boros bandwidth, audio kualitas rendah
- **Fitur Prioritas:** Karaoke/music mode, Opus stereo, echo effect, multi-channel management

### Persona 4: Hendra — Penghobi Radio Amatir 📡
> *"Saya suka eksplor frekuensi, tapi mau juga ada komunitas online yang bisa diakses dari mana saja."*

- **Usia:** 39 tahun
- **Lokasi:** Surabaya
- **Perangkat:** Android flagship
- **Kebutuhan:** Channel scanning, callsign display, signal strength indicator, full-duplex mode
- **Pain Point:** Komunitas radio konvensional makin sepi, jangkauan terbatas
- **Fitur Prioritas:** Channel scan, callsign (5 karakter), LCD panel realistis, tema klasik

---

## 5. Fitur & Persyaratan Fungsional

### 5.1 Matriks Prioritas Fitur

Every feature is tagged **[P0]** (Must Have), **[P1]** (Should Have), **[P2]** (Nice to Have).

---

### Modul 1: Autentikasi & Profil

| ID | Fitur | Prioritas | Deskripsi |
|---|---|---|---|
| AUTH-01 | Login Google OAuth | P0 | Login satu klik via akun Google |
| AUTH-02 | Mode Tamu (Guest) | P0 | Masuk tanpa akun, UUID unik per sesi |
| AUTH-03 | Nama tampilan kustom | P0 | Edit nama yang tampil di LCD panel |
| AUTH-04 | Lokasi kustom | P0 | Edit teks lokasi (kota/wilayah) |
| AUTH-05 | Foto profil Google | P1 | Sinkronisasi foto dari akun Google |
| AUTH-06 | Unggah foto kustom | P1 | Foto profil dari galeri |
| AUTH-07 | Callsign otomatis | P0 | 5 karakter alfanumerik acak, persisten |
| AUTH-08 | Logout | P0 | Keluar akun dan clear session |
| AUTH-09 | Login Facebook OAuth | P1 | Login satu klik via akun Facebook |
| AUTH-10 | Login TikTok OAuth | P1 | Login satu klik via akun TikTok |

**Penerimaan AUTH-02 (Guest Login):**
- UUID guest harus unik per sesi: `guest-{crypto.randomUUID()}`
- Tidak boleh ada dua sesi tamu dengan ID yang sama
- Data tamu tidak disimpan di Supabase database

---

### Modul 2: Manajemen Channel

| ID | Fitur | Prioritas | Deskripsi |
|---|---|---|---|
| CH-01 | Navigasi channel atas/bawah | P0 | Tombol UP/DOWN untuk ganti channel |
| CH-02 | Channel list modal | P0 | Daftar semua channel dengan nama dan status |
| CH-03 | Channel cari/filter | P1 | Search channel berdasarkan nomor atau nama |
| CH-04 | Indikator jumlah user | P0 | Tampilkan berapa user aktif di channel |
| CH-05 | Channel scan otomatis | P1 | Scan channel secara berurutan, hentikan jika ada aktivitas |
| CH-06 | Warna status channel | P1 | Hijau (aktif), Merah (terkunci/khusus), Abu (standby) |
| CH-07 | Channel 0–999 | P0 | Range channel 0 sampai 999 |
| CH-08 | Channel 100 (Landing) | P0 | Channel default landing, mode loopback (testing) |
| CH-09 | Persist channel terakhir | P0 | Simpan channel terakhir saat app ditutup |
| CH-10 | Fast Click mode | P1 | Switch channel instan vs debounce 800ms |
| CH-11 | Daftar user per channel | P1 | Modal daftar user aktif dengan nama dan lokasi |

**Spesifikasi CH-08 (Channel 100 — Landing):**
- Channel 100 adalah channel khusus landing/testing
- Di channel 100, audio yang ditransmit di-loopback ke speaker sendiri (self-test)
- Tidak ada broadcast ke user lain di channel 100
- Ditampilkan sebagai "LANDING-ECHO CHANNEL" di channel list

---

### Modul 3: Push-to-Talk (Inti)

| ID | Fitur | Prioritas | Deskripsi |
|---|---|---|---|
| PTT-01 | Tombol PTT push-hold | P0 | Tekan tahan = transmit, lepas = stop |
| PTT-02 | Tombol PTT toggle mode | P0 | Satu klik = mulai, klik lagi = stop |
| PTT-03 | Indikator transmit (TX) | P0 | Warna merah + animasi saat transmitting |
| PTT-04 | Indikator busy (RX) | P0 | Warna oranye + teks "BUSY" saat user lain transmit |
| PTT-05 | Half-duplex default | P0 | Tidak bisa transmit saat orang lain sedang transmit |
| PTT-06 | Full-duplex mode | P2 | Bisa transmit dan terima sekaligus (pengaturan) |
| PTT-07 | Ukuran tombol kustom | P1 | Slider 0–100% ukuran tombol PTT |
| PTT-08 | Posisi vertikal tombol | P1 | Slider posisi Y tombol PTT |
| PTT-09 | Tombol PTT tampil/sembunyi | P1 | Toggle visibilitas tombol PTT |
| PTT-10 | Spacebar = PTT (desktop) | P1 | Keyboard Spacebar trigger PTT di browser desktop |
| PTT-11 | Haptic feedback | P0 | Vibrasi 15ms saat tekan, 10ms saat lepas |
| PTT-12 | Sound feedback PTT | P0 | Tone tekan (chirp) + squelch + Roger beep |
| PTT-13 | Watchdog transmitter | P0 | Auto-clear stale transmitter setelah 1.5 detik silence |
| PTT-14 | Hang Up (moderasi) | P1 | Moderator/operator dapat memutus paksa transmisi user lain |

**Spesifikasi PTT-05 (Half-Duplex):**
- Saat `activeTransmitter !== null && activeTransmitter.userId !== myUserId`, tombol PTT menampilkan teks "BUSY" warna oranye
- Semua input di tombol diabaikan saat busy
- Pengecualian: `fullDuplex = true` atau `audioMode = 'music'` menonaktifkan pembatasan ini

**Acceptance Criteria PTT-01:**
- Latensi dari tekan tombol hingga suara terdengar di penerima: < 500ms di jaringan 4G
- Audio tidak terputus-putus saat koneksi stabil (packet loss < 5%)
- Mic release harus memicu squelch tail + Roger beep

**Spesifikasi PTT-14 (Hang Up):**
- Tombol "Hang Up" muncul di panel moderasi profil user (UserListModal) hanya jika target user sedang aktif transmit
- Hanya user dengan role `operator`, `pjc`, `sys_admin`, atau `noc` yang dapat melihat dan menekan tombol
- Mekanisme: broadcast event `hang_up` dengan payload `{ targetUserId, moderatorName }` melalui Supabase Realtime channel
- Pada sisi target: jika `targetUserId === userId` dan sedang transmitting, `isTransmitting` langsung di-set `false`
- Pada sisi semua klien: jika `activeTransmitter.userId === targetUserId`, `activeTransmitter` di-clear ke `null`
- Optimistic UI: moderator langsung melihat transmitter berhenti tanpa menunggu broadcast kembali

---

### Modul 4: Audio Engine

| ID | Fitur | Prioritas | Deskripsi |
|---|---|---|---|
| AUD-01 | WebRTC P2P audio (mesh) → LiveKit SFU | P0 | Transmisi audio latensi rendah. **Status 2026-07-22: SFU aktif (dev)** — LiveKit container lokal + Edge Function `livekit-token` ACTIVE di Supabase Cloud. Mesh tetap fallback saat `VITE_LIVEKIT_URL` kosong (AD-1, lihat §7.3 + `docs/SFU_RUNBOOK.md`) |
| AUD-02 | Fallback base64 via Supabase | P0 | Fallback jika WebRTC/SFU gagal (NAT/firewall) atau saat mesh mode |
| AUD-03 | VAD (Voice Activity Detection) | P1 | Mute mic otomatis saat silence > 1.5 detik |
| AUD-04 | Discussion mode audio | P0 | Echo cancel + noise suppress + auto gain |
| AUD-05 | Music/Karaoke mode | P1 | Stereo, Opus 128kbps, tanpa filter |
| AUD-06 | Built-in echo effect | P1 | Delay 250ms + feedback loop untuk reverb karaoke |
| AUD-07 | Volume kontrol | P0 | Slider 0–100% untuk volume speaker |
| AUD-08 | Echo feedback kontrol | P2 | Slider intensitas efek echo |
| AUD-09 | Queue management | P1 | Buffer audio dengan batas queue (maxQueue setting) |
| AUD-10 | STUN server | P0 | Google STUN untuk NAT traversal |
| AUD-11 | TURN server | P0 | Relay audio saat P2P gagal (wajib produksi). Mode mesh: server TURN via env `VITE_TURN_*`. Mode SFU: TURN bawaan LiveKit (AD-1) |
| AUD-12 | SDP Opus optimization | P1 | Modifikasi SDP untuk stereo+bitrate optimal di music mode |

**Spesifikasi AUD-03 (VAD):**
- RMS threshold: `0.01` (nilai di bawah ini = silence)
- Silence timeout: `1.500ms` sebelum mute mic track
- Mute dengan `track.enabled = false` — jangan stop track (reconnect WebRTC mahal)
- Unmute otomatis saat RMS kembali di atas threshold

**Spesifikasi AUD-01 (WebRTC):**
- ICE servers: STUN + TURN (wajib untuk produksi)
- Role offer/answer ditentukan oleh UUID lexicographic sort (user dengan UUID lebih kecil = offerer)
- ICE candidate queue: kandidat yang datang sebelum `setRemoteDescription` di-queue dan diproses setelah remote description diset
- Cleanup peer connection saat user keluar channel atau power off

---

### Modul 5: Tampilan & LCD Panel

| ID | Fitur | Prioritas | Deskripsi |
|---|---|---|---|
| LCD-01 | Channel number display | P0 | 3 digit dengan leading zero, font DSEG7 Classic Mini |
| LCD-02 | Signal strength indicator | P0 | 4 bar sinyal (1=merah, 2=kuning, 3-4=hijau) |
| LCD-03 | Username display | P0 | Nama pengguna di LCD panel |
| LCD-04 | User count | P0 | Jumlah user aktif di channel (klikable) |
| LCD-05 | Offline badge | P0 | Badge merah "OFFLINE" saat tidak terhubung |
| LCD-06 | Busy badge | P0 | Badge oranye berkedip saat ada yang transmit |
| LCD-07 | User photo thumbnail | P1 | Foto kecil user di LCD panel |
| LCD-08 | Marquee text | P1 | Teks berjalan dengan info channel + user |
| LCD-09 | Progress bar modulator | P1 | Visualisasi level audio real-time |
| LCD-10 | Latensi tooltip | P2 | Klik signal bar = tampilkan ms latensi koneksi |

---

### Modul 6: Pengaturan (Settings Panel)

| ID | Fitur | Prioritas | Deskripsi |
|---|---|---|---|
| SET-01 | Info & Lokasi edit | P0 | Edit nama tampilan dan teks lokasi |
| SET-02 | Manajemen foto profil | P1 | Pilih foto Google atau unggah dari galeri |
| SET-03 | Toggle modulator | P1 | Tampilkan/sembunyikan progress bar |
| SET-04 | Toggle PTT button | P1 | Tampilkan/sembunyikan tombol PTT |
| SET-05 | Fast Click toggle | P1 | Mode switch channel instan atau debounce |
| SET-06 | Audio mode selector | P1 | Discussion vs Music/Karaoke |
| SET-07 | Volume slider | P0 | Kontrol volume speaker |
| SET-08 | Full-duplex toggle | P2 | Aktifkan/nonaktifkan full-duplex |
| SET-09 | Vibrate on start toggle | P1 | Toggle haptic feedback |
| SET-10 | Tone on start/end toggle | P1 | Toggle sound feedback PTT |
| SET-11 | Built-in echo toggle | P1 | Toggle efek echo karaoke |
| SET-12 | Echo feedback slider | P2 | Intensitas echo (0–100%) |
| SET-13 | PTT size slider | P1 | Ukuran tombol PTT (30–100%) |
| SET-14 | PTT position slider | P1 | Posisi vertikal tombol PTT |
| SET-15 | Toggle PTT mode | P1 | Push-hold vs Toggle click |
| SET-16 | Pilih tema | P1 | 8 pilihan tema visual |
| SET-17 | Max queue setting | P2 | Batas buffer antrian audio |
| SET-18 | Show/hide foto user lain | P2 | Toggle tampilkan foto user lain di daftar |

---

### Modul 7: Fitur Karaoke (Music Mode)

| ID | Fitur | Prioritas | Deskripsi |
|---|---|---|---|
| KAR-01 | Floating karaoke player | P2 | Player musik mengambang yang bisa dipindah |
| KAR-02 | Music mode transmit | P1 | Transmisi audio berkualitas tinggi untuk musik |
| KAR-03 | Built-in echo/reverb | P1 | Efek echo delay 250ms untuk vokal karaoke |
| KAR-04 | Stereo channel transmit | P1 | Dukungan stereo via WebRTC |

---

### Modul 8: Power & Koneksi

| ID | Fitur | Prioritas | Deskripsi |
|---|---|---|---|
| PWR-01 | Toggle power on/off | P0 | Matikan/nyalakan "perangkat" walkie-talkie |
| PWR-02 | Auto-disconnect saat off | P0 | Unsubscribe Supabase + stop audio saat power off |
| PWR-03 | Auto-reconnect saat on | P0 | Reinitialize koneksi saat power on |
| PWR-04 | Offline recovery | P0 | Restore settings dari localStorage saat startup |
| PWR-05 | Indikator koneksi | P0 | Visual terhubung/terputus di signal bar |

---

## 6. Persyaratan Non-Fungsional

### 6.1 Performa

| Metrik | Target |
|---|---|
| Audio latency end-to-end | < 300ms di jaringan 4G stabil |
| App startup time (cold) | < 3 detik |
| App startup time (warm) | < 1 detik |
| Channel switch time | < 1 detik |
| Memory usage (steady state) | < 150MB RAM |
| Battery drain | < 5% per jam saat aktif monitoring, < 15% saat transmit |
| Bundle size (initial) | < 500KB gzipped |

### 6.2 Keandalan

| Metrik | Target |
|---|---|
| Uptime layanan | ≥ 99.5% (Supabase SLA) |
| Crash rate per sesi | < 0.5% |
| Audio packet loss recovery | Graceful degradation ke fallback base64 |
| Reconnect setelah koneksi terputus | Otomatis dalam ≤ 5 detik |

### 6.3 Keamanan

| Persyaratan | Implementasi |
|---|---|
| Autentikasi | Supabase Auth + Google OAuth 2.0 |
| Transport encryption | TLS 1.3 (Supabase) + DTLS-SRTP (WebRTC) |
| TLS Certificate Pinning | SHA-256 pin di Android network_security_config.xml |
| Credential management | Tidak ada credential di source code atau git |
| Row Level Security | Semua tabel Supabase wajib RLS aktif |
| Rate limiting | Max transmisi per user per menit |
| Audit log | Semua event PTT ter-log di Supabase untuk forensik |

### 6.4 Kompatibilitas

| Platform | Persyaratan |
|---|---|
| Android | Min SDK 21 (Android 5.0), Target SDK 34 |
| Browser (Web) | Chrome 90+, Firefox 88+, Safari 14+ |
| Koneksi minimum | 3G (1 Mbps) untuk discussion mode, 4G (5 Mbps) untuk music mode |
| Resolusi | 360×640 minimum, optimal 390×844 (modern smartphone) |

### 6.5 Aksesibilitas

- Tombol PTT minimum ukuran touch target 48×48dp (WCAG 2.1)
- Semua status komunikasi dalam teks (tidak hanya warna)
- Haptic feedback sebagai alternatif visual indicator

---

## 7. Arsitektur Sistem

### 7.1 Diagram Komponen Tingkat Tinggi

```
┌─────────────────────────────────────────────────────┐
│                   Client (React App)                  │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │LoginGate │  │RadioLayou│  │   SettingsPanel    │  │
│  └────┬─────┘  └────┬─────┘  └────────────────────┘  │
│       │             │                                  │
│  ┌────▼─────────────▼───────────────────────────────┐ │
│  │              usePTTStore (Zustand)                │ │
│  │  State: isPowerOn, channel, user, settings...    │ │
│  │  Actions: setPower, setChannel, setTransmitting  │ │
│  └────┬──────────────────────────┬──────────────────┘ │
│       │                          │                     │
│  ┌────▼────────┐         ┌───────▼──────────────────┐ │
│  │  Supabase   │         │     useAudioStreamer      │ │
│  │  Realtime   │         │  ┌──────────────────────┐│ │
│  │  Channel    │         │  │ RTCPeerConnection (N) ││ │
│  │             │         │  │ MediaRecorder         ││ │
│  │  - presence │         │  │ VAD AnalyserNode      ││ │
│  │  - ptt_state│         │  │ AudioContext playback ││ │
│  │  - voice_ch │◄────────│  └──────────────────────┘│ │
│  │  - webrtc_sg│─────────►                           │ │
│  └─────────────┘         └──────────────────────────┘ │
└─────────────────────────────────────────────────────┘
         │                          │
         ▼                          ▼
┌──────────────────┐      ┌──────────────────────────┐
│  Supabase Cloud  │      │   WebRTC P2P Connection  │
│  - Auth          │      │   (via STUN/TURN server) │
│  - Realtime      │      │   Peer A ←──────► Peer B │
│  - Database      │      └──────────────────────────┘
│  - Edge Functions│
└──────────────────┘
```

### 7.2 Keputusan Arsitektur Audio (Diambil Alih Arsitek — 2026-07-20)

Audio real-time NextVWT akan bertransisi dari **WebRTC mesh** ke **LiveKit SFU**
(selepas fase prototipe). Keputusan berikut bersifat final dan diambil alih oleh arsitek
atas delegasi product owner:

| # | Keputusan | Rasional |
|---|---|---|
| AD-1 | **SFU self-host di VPS** (bukan LiveKit Cloud) | Konsisten strategi deploy VPS; gratis; region SG dekat Indonesia; kontrol biaya di skala 5000 tenant |
| AD-2 | **Moderasi tetap di Supabase Realtime** (tidak pindah ke LiveKit Data API) | Sudah berjalan, lebih murah, log moderasi sudah tersimpan di DB (`channel_moderation_logs`) |
| AD-3 | **Rollout phase via dual-mode flag `VITE_LIVEKIT_URL`** | Kosong = mesh (fallback/dev, behavior lama utuh); terisi = SFU. Mesh menjadi safety net saat UAT |
| AD-4 | **Channel 100 (echo) tetap loopback lokal** | Tidak publish ke SFU; mencegah mic sendiri terdengar ke user lain (`BRAND.isolatedChannels=[100]`) |

### 7.3 Topology: Mesh → SFU

**Mesh (saat ini — prototipe):**
- Setiap user yang transmit membuka `RTCPeerConnection` ke semua user lain.
- Voice dikirim sebagai base64 chunk via Supabase broadcast (`voice_chunk`), di-replay
  via `AudioContext.decodeAudioData`.
- **Batasan skala:** mesh tidak layak untuk >~8 peer secara bersamaan
  (referensi: `david-spies/ptt-radio` membatasi `MAX_PEERS=8`). Target PRD
  (Persona Pebe: koordinasi 10–50 orang) akan saturasi CPU/bandwidth di sisi transmitter.

**SFU (rencana produksi — LiveKit):**
- Client hanya punya **1 koneksi** ke server media (LiveKit). Client publish 1 audio
  track, subscribe track semua user lain. Offload bandwidth ke server.
- LiveKit menyertakan **TURN bawaan** → memenuhi AUD-11 tanpa server TURN terpisah.
- Presence diisi dari `Room.participants` (override Supabase saat SFU mode).
- Migrasi dijalankan tanpa breaking change via flag `VITE_LIVEKIT_URL` (lihat AD-3).
- Detail implementasi: `.hermes/plans/2026-07-20_162000-nextvwt-mesh-to-livekit-sfu.md`.

### 7.4 Mapping Fitur ke SFU

| Fitur | Implementasi di SFU |
|---|---|
| PTT broadcast | `setMicEnabled(true/false)` + broadcast `activeTransmitter` (presence Supabase tetap untuk indikator TX/RX) |
| Moderasi (hang-up/kick/ban/role/status) | Tetap Supabase Realtime broadcast + `channel_moderation_logs` (AD-2) |
| Presence | LiveKit `Room.participants` → `usePTTStore.activeUsers` |
| Channel 100 echo | Loopback lokal, tidak publish SFU (AD-4) |

---

## 8. Desain UI/UX

### 8.1 Prinsip Desain

1. **Skeuomorfik Imersif:** Tampilan walkie-talkie fisik 3D — bezel emas, LCD amber, tombol taktil
2. **Glassmorfisme Premium:** Tema-tema kaca dengan efek blur, transparansi, dan cahaya ambient
3. **Operasi Satu Tangan:** Tombol PTT di bagian bawah, mudah dijangkau jempol
4. **Feedback Segera:** Setiap interaksi mendapat respons visual + haptic + audio dalam < 100ms
5. **Status Selalu Jelas:** Pengguna selalu tahu apakah online/offline, siapa yang transmit, berapa user aktif

### 8.2 Hierarki Visual

```
Layer 1 (Tertinggi): Status badges (OFFLINE, BUSY, TX indicator)
Layer 2: Modal/panel (Channel list, User list, Settings)
Layer 3: PTT Button + Floating karaoke player
Layer 4: LCD Panel + Progress bar + Control buttons
Layer 5: Device chassis + Header bar
Layer 6: Background (#1a1c23 dengan device shadow)
```

### 8.3 Delapan Tema Visual

| Tema | Target Persona | Warna Khas |
|---|---|---|
| **Classic** | Penghobi radio, semua segmen | Abu metalik + LCD amber |
| **Glass V1** | Pengguna muda, casual | Biru muda glassmorfik |
| **Glass V2 (Goldfish)** | Premium users | Emas diamond-cut + ikan mas |
| **Glass V3 (Betta Blue)** | Pecinta alam | Cyan soft + ikan cupang biru |
| **Glass V4 (Smoked)** | Komunitas taktis, SAR | Dark charcoal + neon hijau |
| **Glass V5 (Aurora)** | Pengguna perempuan | Purple/magenta + betta pink |
| **Glass V6 (Ocean)** | Nautical, pecinta laut | Ocean navy + ikan campuran |
| **Monokrom** | Profesional, minimalis | Slate gray retro |

### 8.4 Spesifikasi Ukuran Target

- **Device frame:** 360px × 800px (simulasi smartphone)
- **Touch target minimum:** 48×48dp
- **Font LCD channel number:** DSEG7 Classic Mini Bold, 96sp
- **Tombol PTT default:** 326px × 96px, border-radius 48px

---

## 11. Roadmap Rilis

| Fase | Fokus | Target |
|---|---|---|
| **Fase 0** | Fondasi: React+Vite+Zustand, Supabase Auth/Realtime, WebRTC mesh PTT, UI walkie-talkie 8 tema, moderasi, Capacitor Android | ✅ Selesai |
| **Fase 1** | Hardening & audit (lint/type/test/build hijau, no secrets, no `any`), eksekusi poin 1–5 refactor | ✅ Berjalan/Selesai |
| **Fase 2** | **Migrasi Mesh → LiveKit SFU** (lihat §7.2–7.4, AD-1…AD-4). Dual-mode flag `VITE_LIVEKIT_URL`, token via Supabase Edge Function, presence dari LiveKit participants | 📋 Rencana (`.hermes/plans/2026-07-20_162000-nextvwt-mesh-to-livekit-sfu.md`) |
| **Fase 3** | Skala & multi-tenant (white-label 5000 tenant), SFU region Indonesia | 🔭 Visi |
| **Fase 4** | iOS, background PTT service, ROIP gateway | 🔭 Visi |

## 12. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| **Mesh tidak skalabilitas** (>8 peer, target PRD 10–50 user/channel) | Audio putus/CPU tinggi di transmitter | Migrasi ke LiveKit SFU (Fase 2, AD-1) |
| TURN tidak tersedia di NAT/firewall ketat | P2P gagal total | TURN wajib produksi (AUD-11); SFU pakai TURN bawaan LiveKit |
| Role spoofing via displayName/client | Akses moderasi ilegal | Role server-authoritative dari `channel_roles` (getGlobalRole dihapus) |
| Secret bocor di client | Compromise akun | LiveKit token di-generate server-side; tidak ada API key di bundle |
| Rollout SFU gagal saat UAT | Regresi audio | Dual-mode flag (AD-3): mesh tetap sebagai fallback |

---

*Dokumen ini adalah living document. Versi terbaru selalu di repository proyek.*
*NextVWT PTT App PRD v1.1 — Juli 2026*
