# NextVWT Architecture Adoption & Open-Source Reference Alignment

Dokumen ini menjelaskan rancangan arsitektur dan adopsi struktur *codebase* dari repositori open-source terbaik untuk diterapkan pada aplikasi **NextVWT (Next Virtual Walkie Talkie)**.

---

## 1. Referensi Repositori Terbaik & Pola Arsitektur yang Diadopsi

| Repository Open-Source | Pola Arsitektur & Logika | Implementasi di NextVWT |
| :--- | :--- | :--- |
| **[livekit-examples / agent-starter-react](https://github.com/livekit-examples/agent-starter-react)** | **Decoupled Audio Visualizer & SFU Management**: Pemrosesan sinyal frekuensi audio (Web Audio API `AnalyserNode`) yang terpisah dari *UI render thread*. | Diadopsi dalam hook [`useAudioVisualizer.ts`](file:///C:/Users/ASUS/.gemini/antigravity-ide/scratch/NextVWT-PTT-App-Prototype/src/app/hooks/useAudioVisualizer.ts) & integrasi di `ProgressBar.tsx`. |
| **[david-spies / ptt-radio](https://github.com/david-spies/ptt-radio)** | **Pure PTT Key & Stream Lifecycle**: State machine PTT (Push-to-Talk) yang mengontrol `MediaStreamTrack.enabled` secara atomik untuk mencegah *audio leakage*. | Diintegrasikan ke dalam hook [`usePttTransmit.ts`](file:///C:/Users/ASUS/.gemini/antigravity-ide/scratch/NextVWT-PTT-App-Prototype/src/app/hooks/usePttTransmit.ts). |
| **[ramonszo / webrtc-house.ts](https://github.com/ramonszo/webrtc-house.ts)** | **Centralized Signaling & Trickle ICE**: Manajemen *peer connection* dengan *Trickle ICE* dan negosiasi SDP secara terstruktur. | Diterapkan pada layanan WebRTC [`useWebRTC.ts`](file:///C:/Users/ASUS/.gemini/antigravity-ide/scratch/NextVWT-PTT-App-Prototype/src/app/hooks/useWebRTC.ts). |
| **[sanidhyy / discord-clone](https://github.com/sanidhyy/discord-clone)** | **Channel & Role Orchestration**: Pemisahan state channel, member presence, dan kontrol izin moderator. | Diimplementasikan melalui Zustand slices (`src/app/store/slices/`). |

---

## 2. Struktur Codebase NextVWT (Layered Clean Architecture)

```
NextVWT-PTT-App-Prototype/
├── src/app/
│   ├── components/         # UI Components terisolasi (tanpa logika WebRTC langsung)
│   │   ├── radio/          # Walkie-Talkie Faceplate (LCD, ProgressBar, Footer)
│   │   └── UserListModal   # Manajemen kehadiran & daftar pengguna (Discord style)
│   ├── hooks/              # Custom React Hooks (Adopsi pola LiveKit & ptt-radio)
│   │   ├── useAudioVisualizer.ts # Web Audio API FFT visualizer
│   │   ├── usePttTransmit.ts     # PTT transmit state machine
│   │   ├── useWebRTC.ts          # WebRTC peer connection & Trickle ICE
│   │   └── index.ts              # Centralized hook exports
│   ├── services/           # Service layer untuk pensinyalan & jaringan eksternal
│   │   ├── channelSubscription.ts # Supabase Realtime signaling
│   │   └── webrtcConfig.ts        # STUN/TURN ICE configuration
│   └── store/              # Modular Zustand State Stores
│       └── slices/         # Pemisahan state (Audio, Channel, User, UI)
```

---

## 3. Alur Logika Push-To-Talk (PTT) & Audio Processing

1. **Trigger PTT (Input Event)**:
   Pengguna menekan tombol PTT (atau Spacebar). `usePttTransmit` mengaktifkan `MediaStreamTrack.enabled = true` dan mengirimkan sinyal `TALKING_START` via Supabase Realtime channel.
2. **Audio Stream Transport (Trickle ICE WebRTC)**:
   Koneksi peer-to-peer mentransmisikan paket audio berlatensi rendah (Opus codec).
3. **Audio Visualization (Decoupled FFT)**:
   `useAudioVisualizer` memindai frekuensi audio menggunakan `AnalyserNode` dan memperbarui bar visualisasi secara halus via `requestAnimationFrame` tanpa mengganggu frame rate antarmuka LCD Radio.
