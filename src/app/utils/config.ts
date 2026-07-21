/**
 * ─── CONFIG BARREL ─────────────────────────────────────────────────────────────
 * Re-exports all config modules for backwards compatibility.
 * New code should import from the specific module directly:
 *   import { BRAND } from './brandConfig';
 *   import { CHANNELS } from './channelConfig';
 *   import { VISUAL_CONFIG } from './visualConfig';
 * ─────────────────────────────────────────────────────────────────────────────── */

export { BRAND, USE_SFU, NO_REACTION_CHANNELS } from './brandConfig';
export type { BrandConfig } from './brandConfig';

export { CHANNELS, fetchChannels } from './channelConfig';
export type { ChannelConfigItem } from './channelConfig';

export { VISUAL_CONFIG, AUDIO_CONFIG, UI_MESSAGES } from './visualConfig';
