/**
 * ─── MASTER ULTIMATE WALKIE-TALKIE TEMPLATE CONFIGURATION ──────────────────────
 * This file is the single source of truth for all branding, visual, and audio
 * settings for the PTT application. For white-labeling, modify this file only.
 *
 * To create a new branded variant (e.g., BrandA-PTT, BrandB-PTT):
 * 1. Update BRAND object with new company/brand names and settings
 * 2. Update CHANNELS array with new operational channels
 * 3. Optionally update VISUAL_CONFIG and AUDIO_CONFIG for brand aesthetics
 * 4. Run: npm run build && npx cap sync android
 * 5. Distribute APK with new branding
 * ─────────────────────────────────────────────────────────────────────────────── */
import { getSupabase } from './supabase';

export interface BrandConfig {
  // Core branding
  name: string;
  titlePart1: string;
  titlePart2: string;
  slogan: string;
  marqueeTextDefault: string;

  // Backend configuration
  supabaseRoomPrefix: string;
  defaultTheme: string;
  defaultChannel: number;
  isolatedChannels: number[];

  // Visual branding (optional overrides; uses VISUAL_CONFIG defaults if not set)
  brandColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

export interface ChannelConfigItem {
  number: number;
  name: string;
  type: 'green' | 'red' | 'gray' | 'violet';
  users: string[];
}

/**
 * ─── BRAND CONFIGURATION ──────────────────────────────────────────────────────
 * Core identity and backend settings for this PTT application instance.
 * Edit this to white-label for a new organization.
 */
export const BRAND: BrandConfig = {
  // ─── Core Identity ─────────────────────────────────────────────────────────
  name: 'NextVWT',
  titlePart1: 'NEXT',
  titlePart2: 'VWT',
  slogan: 'NEXT VIRTUAL WALKIE TALKIE',
  marqueeTextDefault:
    'Selamat Datang di NextVWT PTT Walkie Talkie - Hubungkan Komunikasi Real-time Anda',

  // ─── Backend & Runtime ──────────────────────────────────────────────────────
  // Used in Supabase channel subscription: `${supabaseRoomPrefix}${channelNumber}`
  supabaseRoomPrefix: 'ptt-room-',

  // Default theme loaded on app startup
  defaultTheme: 'theme-classic',

  // Default channel on app startup (typically main announcement channel)
  defaultChannel: 1,

  // Channels that disable WebRTC (e.g. for purely server-side processing or privacy)
  isolatedChannels: [100],

  // ─── Optional Visual Overrides ──────────────────────────────────────────────
  // If not set, defaults from VISUAL_CONFIG below are used
  // brandColor: '#00C853',        // Override primary green
  // secondaryColor: '#FF9800',    // Override secondary orange
  // accentColor: '#FF3D00',       // Override accent red
};

/**
 * Channel yang TIDAK menampilkan dock reaksi (Animasi / Suara / Gift).
 * - CH 000: DUKUNGAN & BANTUAN — channel resmi, tidak ada fitur sosial
 * - CH 100: LANDING/ECHO TEST — channel solo untuk test modulasi
 */
export const NO_REACTION_CHANNELS: ReadonlySet<number> = new Set([0, 100]);

const BASE_CHANNELS: ChannelConfigItem[] = [
  { number: 0, name: 'DUKUNGAN & BANTUAN', type: 'green', users: [] },
  {
    number: 99,
    name: 'AI OPERATOR COMPANION',
    type: 'violet',
    users: ['AI Operator'],
  },
  {
    number: 100,
    name: 'LANDING-ECHO CHANNEL',
    type: 'violet',
    users: [
      'Pebri Haryanto',
      'antoni_99',
      'budi_salatiga',
      'rudi_bandung',
      'medan_dx',
      'palembang_line',
      'touring_rider',
      'ninja_club',
      'pak_rudi_rt',
      'siskamling_1',
      'lalin_update',
      'anto_bekasi',
      'doni_depok',
      'makassar_boy',
      'sar_team_1',
      'mount_hiker',
      'support_admin',
      'eko_pratama',
      'dewi_sari',
      'siti_aminah',
      'joko_susilo',
      'hendra_w',
      'yudi_antara',
      'agus_setiawan',
      'roni_h',
      'irma_p',
      'pebri_fans',
      'noc_global',
      'sys_admin_vwt',
      'pjc_room_manager',
      'operator_otomatis',
      'mario_teguh',
      'nina_marlina',
      'oscar_lawalata',
    ],
  },
  {
    number: 101,
    name: 'MOCK USERS / MODERATION TEST',
    type: 'green',
    users: [
      'agus_santika',
      'budi_santoso',
      'citra_kirana',
      'dedi_pratama',
      'euis_cahyani',
      'fajar_nugraha',
      'gilang_ramadhan',
      'hendra_gunawan',
      'indah_permatasari',
      'joko_susanto',
      'kiki_amalia',
    ],
  },
  {
    number: 1,
    name: 'KOPDAR NASIONAL UTAMA',
    type: 'green',
    users: [
      'antoni_99',
      'budi_salatiga',
      'rudi_bandung',
      'noc_global',
      'sys_admin_vwt',
      'pjc_room_manager',
      'mario_teguh',
      'agus_santika',
      'budi_santoso',
      'citra_kirana',
      'dedi_pratama',
      'euis_cahyani',
      'fajar_nugraha',
    ],
  },
  { number: 2, name: 'LINTAS SUMATERA DX', type: 'green', users: ['medan_dx', 'palembang_line'] },
  { number: 3, name: 'LINTAS JAWA DX LINE', type: 'green', users: [] },
  { number: 4, name: 'LINTAS BALI & NTT DX', type: 'green', users: [] },
  {
    number: 5,
    name: 'KOMUNITAS MOTOR INDO',
    type: 'green',
    users: ['touring_rider', 'ninja_club'],
  },
  {
    number: 6,
    name: 'PATROLI KEAMANAN WARGA',
    type: 'red',
    users: ['pak_rudi_rt', 'siskamling_1'],
  },
  { number: 7, name: 'INFO MUDIK & LALIN', type: 'red', users: ['lalin_update'] },
  { number: 8, name: 'CH-KEDALUWARSA', type: 'gray', users: [] },
  { number: 9, name: 'STANDBY CHANNEL 09', type: 'gray', users: [] },
  { number: 10, name: 'STANDBY CHANNEL 10', type: 'gray', users: [] },
  {
    number: 11,
    name: 'PAGUYUBAN JABODETABEK',
    type: 'green',
    users: ['anto_bekasi', 'doni_depok'],
  },
  { number: 12, name: 'DX SULAWESI & MALUKU', type: 'green', users: ['makassar_boy'] },
  { number: 13, name: 'RELAWAN KEMANUSIAAN', type: 'red', users: ['sar_team_1'] },
  { number: 14, name: 'STANDBY CHANNEL 14', type: 'gray', users: [] },
  { number: 15, name: 'STANDBY CHANNEL 15', type: 'gray', users: [] },
  { number: 16, name: 'STANDBY CHANNEL 16', type: 'gray', users: [] },
  { number: 17, name: 'STANDBY CHANNEL 17', type: 'gray', users: [] },
  { number: 18, name: 'STANDBY CHANNEL 18', type: 'gray', users: [] },
  { number: 19, name: 'STANDBY CHANNEL 19', type: 'gray', users: [] },
  { number: 20, name: 'PECINTA ALAM INDO', type: 'green', users: ['mount_hiker'] },
  { number: 21, name: 'STANDBY CHANNEL 21', type: 'gray', users: [] },
  { number: 22, name: 'STANDBY CHANNEL 22', type: 'gray', users: [] },
  { number: 23, name: 'STANDBY CHANNEL 23', type: 'gray', users: [] },
  { number: 24, name: 'STANDBY CHANNEL 24', type: 'gray', users: [] },
  { number: 25, name: 'STANDBY CHANNEL 25', type: 'gray', users: [] },
  { number: 26, name: 'STANDBY CHANNEL 26', type: 'gray', users: [] },
  { number: 27, name: 'STANDBY CHANNEL 27', type: 'gray', users: [] },
  { number: 28, name: 'STANDBY CHANNEL 28', type: 'gray', users: [] },
  { number: 29, name: 'STANDBY CHANNEL 29', type: 'gray', users: [] },
  { number: 30, name: 'BANTUAN TEKNIS ADMIN', type: 'red', users: ['support_admin'] },
];

// Generate 300 channels (0-299)
export const CHANNELS: ChannelConfigItem[] = Array.from({ length: 300 })
  .map((_, i) => {
    const existing = BASE_CHANNELS.find((c) => c.number === i);
    if (existing) return existing;
    return {
      number: i,
      name: `STANDBY CHANNEL ${i.toString().padStart(3, '0')}`,
      type: 'gray',
      users: [],
    } as ChannelConfigItem;
  })
  .sort((a, b) => {
    const getSortOrder = (n: number) => (n === 100 ? 0.5 : n);
    return getSortOrder(a.number) - getSortOrder(b.number);
  });

/**
 * ─── VISUAL CONFIGURATION ──────────────────────────────────────────────────────
 * Design tokens, colors, shadows, and animation settings used across the UI.
 * These can be referenced in components and CSS themes.
 */
export const VISUAL_CONFIG = {
  // Primary color palette
  colors: {
    primary: '#00C853', // Primary green (PTT button, highlights)
    secondary: '#FF9800', // Secondary orange (LCD panel default)
    accent: '#FF3D00', // Accent red (danger, TX indicator)
    success: '#22C55E', // Success green (progress bar)
    warning: '#FFA500', // Warning orange
    error: '#FF3D00', // Error red
    muted: '#999999', // Muted gray
  },

  // Shadow definitions for 3D effects
  shadows: {
    small: '0 2px 4px rgba(0,0,0,0.2)',
    medium: '0 6px 12px rgba(0,0,0,0.3)',
    large: '0 8px 16px rgba(0,0,0,0.4)',
    inner: 'inset 0 4px 8px rgba(0,0,0,0.2)',
    button3D: '0 6px 0 #000000', // 3D button effect
  },

  // Border radius values
  radius: {
    small: '8dp',
    medium: '12dp',
    large: '16dp',
    extraLarge: '24dp',
    pill: '999dp', // Fully rounded (buttons, toggles)
  },

  // Animation/transition timings
  animation: {
    fast: '100ms',
    normal: '300ms',
    slow: '500ms',
    springStiffness: 500,
    springDamping: 30,
  },

  // LCD panel styling
  lcdPanel: {
    width: '280dp',
    height: '160dp',
    gradient: {
      from: '#FFC966', // Light amber
      to: '#FFA500', // Dark amber
    },
  },

  // PTT button styling
  pttButton: {
    width: '280dp',
    height: '100dp',
    gradientIdle: ['#76FF03', '#00C853'], // Light green to dark green
    gradientActive: ['#00E676', '#00C853'], // Bright green when active
    cornerRadius: '50dp',
  },
};

/**
 * ─── AUDIO CONFIGURATION ──────────────────────────────────────────────────────
 * Audio codec settings, tone frequencies, and playback preferences.
 */
export const AUDIO_CONFIG = {
  // Audio codec and quality settings
  codec: {
    type: 'opus', // WebRTC audio codec
    bitrate: '128kbps', // High-quality stereo
    sampleRate: 48000, // Hz
    channels: 2, // Stereo
  },

  // Fallback Base64 chunking when WebRTC unavailable
  fallback: {
    chunkDurationMs: 255, // 255ms audio chunks
    base64Encoding: true, // Use base64 for transport
  },

  // Alert tones (Motorola-style)
  tones: {
    clickStart: { frequency: 1380, duration: 50 }, // Physical click sound
    rogerBeep: { frequency: 1380, duration: 100 }, // Roger confirmation
  },

  // Default volume settings (0-100)
  volume: {
    default: 70,
    max: 100,
    min: 0,
  },

  // Vibration settings (Android Capacitor)
  vibration: {
    onPressStart: 15, // 15ms vibration
    onPressEnd: 10, // 10ms vibration
    enabled: true,
  },

  // Echo and feedback settings
  echo: {
    builtInEcho: true,
    echoFeedbackDefault: 35, // 0-100 scale
    fullDuplexDefault: false,
  },

  // Audio mode preferences
  modes: {
    discussion: 'discussion', // Half-duplex mode (only transmit)
    music: 'music', // Full-duplex mode (simultaneous RX/TX)
  },
};

/**
 * ─── LOCALIZATION & MESSAGES (Optional for future i18n expansion) ───────────────
 * UI text and messages. Currently hardcoded in components, but can be
 * centralized here for multi-language support.
 */
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

interface DBChannelItem {
  number: number;
  name: string;
  type: string;
  is_restricted: boolean;
  info: string | null;
}

/**
 * Fetch channels dari Supabase (online mode) dengan fallback statis (TINGGI-03)
 */
export async function fetchChannels(): Promise<ChannelConfigItem[]> {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('channels')
      .select('number, name, type, is_restricted, info')
      .order('number', { ascending: true });

    if (error || !data || data.length === 0) return CHANNELS;

    const dbData = data as unknown as DBChannelItem[];

    // Start with 300 default channels, override with Supabase DB data
    const mergedChannels = [...CHANNELS];
    dbData.forEach((ch) => {
      const idx = mergedChannels.findIndex((mc) => mc.number === ch.number);
      const mapped = {
        number: ch.number,
        name: ch.name,
        type: (ch.type === 'red' ||
        ch.type === 'green' ||
        ch.type === 'gray' ||
        ch.type === 'violet'
          ? ch.type
          : 'gray') as 'green' | 'red' | 'gray' | 'violet',
        users: [],
      };
      if (idx !== -1) {
        mergedChannels[idx] = mapped;
      } else {
        mergedChannels.push(mapped);
      }
    });

    mergedChannels.sort((a, b) => {
      const getSortOrder = (n: number) => (n === 100 ? 0.5 : n);
      return getSortOrder(a.number) - getSortOrder(b.number);
    });
    return mergedChannels;
  } catch (err) {
    console.warn(
      'Failed to fetch channels from Supabase, falling back to static configurations:',
      err
    );
    return CHANNELS;
  }
}
