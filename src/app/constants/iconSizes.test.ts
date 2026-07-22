import { describe, it, expect } from 'vitest';
import {
  ICON_PIXEL_SIZES,
  ICON_LCD_SINGLE_SIZE,
  ICON_LCD_TWIN_SIZE,
  ICON_BADGE_SIZE,
} from './iconSizes';

describe('iconSizes', () => {
  it('ICON_PIXEL_SIZES maps names to {w,h} with positive dims', () => {
    expect(typeof ICON_PIXEL_SIZES).toBe('object');
    const vals = Object.values(ICON_PIXEL_SIZES);
    expect(vals.length).toBeGreaterThan(0);
    for (const v of vals) {
      expect(typeof v).toBe('object');
      expect(v.w).toBeGreaterThan(0);
      expect(v.h).toBeGreaterThan(0);
    }
  });

  it('LCD/badge constants are positive numbers', () => {
    expect(ICON_LCD_SINGLE_SIZE).toBeGreaterThan(0);
    expect(ICON_LCD_TWIN_SIZE).toBeGreaterThan(0);
    expect(ICON_BADGE_SIZE).toBeGreaterThan(0);
  });
});
