import { describe, it, expect } from 'vitest';
import { VISUAL_CONFIG, AUDIO_CONFIG, UI_MESSAGES } from './visualConfig';

function allStrings(obj: unknown): boolean {
  if (typeof obj === 'string') return true;
  if (Array.isArray(obj)) return obj.every(allStrings);
  if (obj && typeof obj === 'object') return Object.values(obj).every(allStrings);
  return false;
}

describe('visualConfig', () => {
  it('VISUAL_CONFIG is a non-empty object', () => {
    expect(typeof VISUAL_CONFIG).toBe('object');
    expect(Object.keys(VISUAL_CONFIG).length).toBeGreaterThan(0);
  });

  it('AUDIO_CONFIG is a non-empty object', () => {
    expect(typeof AUDIO_CONFIG).toBe('object');
    expect(Object.keys(AUDIO_CONFIG).length).toBeGreaterThan(0);
  });

  it('UI_MESSAGES values are all strings (nested)', () => {
    expect(allStrings(UI_MESSAGES)).toBe(true);
  });
});
