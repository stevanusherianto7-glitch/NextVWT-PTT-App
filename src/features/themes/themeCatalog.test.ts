import { describe, it, expect } from 'vitest';
import { THEME_CATALOG } from './themeCatalog';

describe('themes/themeCatalog', () => {
  it('THEME_CATALOG is a non-empty array of themes', () => {
    expect(Array.isArray(THEME_CATALOG)).toBe(true);
    expect(THEME_CATALOG.length).toBeGreaterThan(0);
    for (const t of THEME_CATALOG) {
      expect(t).toHaveProperty('key');
      expect(t).toHaveProperty('label');
      expect(t).toHaveProperty('accentColor');
    }
  });

  it('includes theme-classic as default', () => {
    expect(THEME_CATALOG.some((t) => t.key === 'theme-classic')).toBe(true);
  });
});
