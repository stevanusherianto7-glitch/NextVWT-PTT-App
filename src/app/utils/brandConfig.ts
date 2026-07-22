/**
 * Brand configuration — core identity and backend settings.
 * Edit this to white-label for a new organization.
 */

export interface BrandConfig {
  name: string;
  titlePart1: string;
  titlePart2: string;
  slogan: string;
  marqueeTextDefault: string;
  supabaseRoomPrefix: string;
  defaultTheme: string;
  defaultChannel: number;
  isolatedChannels: number[];
  simulatedUserOffset: number;
  livekitUrl: string;
  brandColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

export const BRAND: BrandConfig = {
  name: 'NextVWT',
  titlePart1: 'NEXT',
  titlePart2: 'VWT',
  slogan: 'NEXT VIRTUAL WALKIE TALKIE',
  marqueeTextDefault:
    'Selamat Datang di NextVWT PTT Walkie Talkie - Hubungkan Komunikasi Real-time Anda',
  supabaseRoomPrefix: 'ptt-room-',
  defaultTheme: 'theme-classic',
  defaultChannel: 1,
  isolatedChannels: [100],
  simulatedUserOffset: import.meta.env.PROD ? 0 : 125,
  livekitUrl: import.meta.env.VITE_LIVEKIT_URL || '',
};
/**
 * Dual-mode switch: true bila LiveKit SFU terkonfigurasi.
 * `typeof` guard agar unit test (vitest transform terkadang tidak menyuntikkan
 * global __E2E_DISABLE_SFU__) tidak throw ReferenceError. Di build/dev,
 * Vite menyuntikkan global ini via `define`.
 */
declare const __E2E_DISABLE_SFU__: boolean | undefined;
const E2E_DISABLE_SFU = typeof __E2E_DISABLE_SFU__ !== 'undefined' ? __E2E_DISABLE_SFU__ : false;
export const USE_SFU = !E2E_DISABLE_SFU && Boolean(BRAND.livekitUrl);

/** Channels that do not show the reaction dock. */
export const NO_REACTION_CHANNELS: ReadonlySet<number> = new Set([0, 100]);
