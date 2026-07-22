import { describe, it, expect } from 'vitest';
import { BRAND, USE_SFU, NO_REACTION_CHANNELS } from './brandConfig';

describe('brandConfig', () => {
  it('BRAND exposes livekitUrl (string)', () => {
    expect(typeof BRAND.livekitUrl).toBe('string');
  });

  it('USE_SFU is boolean derived from livekitUrl', () => {
    expect(typeof USE_SFU).toBe('boolean');
  });

  it('NO_REACTION_CHANNELS excludes 0 and 100', () => {
    expect(NO_REACTION_CHANNELS.has(0)).toBe(true);
    expect(NO_REACTION_CHANNELS.has(100)).toBe(true);
    expect(NO_REACTION_CHANNELS.has(1)).toBe(false);
  });
});
