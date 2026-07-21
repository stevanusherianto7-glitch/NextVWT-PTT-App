/**
 * Visual and audio design tokens for the PTT UI.
 */

export const VISUAL_CONFIG = {
  colors: {
    primary: '#00C853',
    secondary: '#FF9800',
    accent: '#FF3D00',
    success: '#22C55E',
    warning: '#FFA500',
    error: '#FF3D00',
    muted: '#999999',
  },
  shadows: {
    small: '0 2px 4px rgba(0,0,0,0.2)',
    medium: '0 6px 12px rgba(0,0,0,0.3)',
    large: '0 8px 16px rgba(0,0,0,0.4)',
    inner: 'inset 0 4px 8px rgba(0,0,0,0.2)',
    button3D: '0 6px 0 #000000',
  },
  radius: {
    small: '8dp',
    medium: '12dp',
    large: '16dp',
    extraLarge: '24dp',
    pill: '999dp',
  },
  animation: {
    fast: '100ms',
    normal: '300ms',
    slow: '500ms',
    springStiffness: 500,
    springDamping: 30,
  },
  lcdPanel: {
    width: '280dp',
    height: '160dp',
    gradient: {
      from: '#FFC966',
      to: '#FFA500',
    },
  },
  pttButton: {
    width: '280dp',
    height: '100dp',
    gradientIdle: ['#76FF03', '#00C853'],
    gradientActive: ['#00E676', '#00C853'],
    cornerRadius: '50dp',
  },
};

export const AUDIO_CONFIG = {
  codec: {
    type: 'opus',
    bitrate: '128kbps',
    sampleRate: 48000,
    channels: 2,
  },
  fallback: {
    chunkDurationMs: 255,
    base64Encoding: true,
  },
  tones: {
    clickStart: { frequency: 1380, duration: 50 },
    rogerBeep: { frequency: 1380, duration: 100 },
  },
  volume: {
    default: 70,
    max: 100,
    min: 0,
  },
  vibration: {
    onPressStart: 15,
    onPressEnd: 10,
    enabled: true,
  },
  echo: {
    builtInEcho: true,
    echoFeedbackDefault: 35,
    fullDuplexDefault: false,
  },
  modes: {
    discussion: 'discussion',
    music: 'music',
  },
};

export const UI_MESSAGES = {
  errors: {
    microphoneAccessDenied: 'Akses mikrofon ditolak. Silakan aktifkan izin mikrofon Anda.',
    microphoneNotFound: 'Perangkat mikrofon tidak ditemukan. Hubungkan mikrofon terlebih dahulu.',
    microphoneGeneric: 'Gagal mengakses mikrofon',
  },
  labels: {
    channelListTitle: 'DAFTAR SALURAN',
    channelSearch: 'Cari saluran...',
    close: 'Tutup',
    settings: 'Pengaturan',
    users: 'Pengguna',
  },
};
