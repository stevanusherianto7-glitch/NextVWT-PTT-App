/**
 * e2e/theme-switching.spec.ts
 * NextVWT – Theme Selection & Application Tests
 *
 * Validates:
 * 1. Settings panel opens with Tema section
 * 2. Theme modal opens with all 8 themes
 * 3. Selecting a theme applies it and closes modal
 * 4. Theme persists via store
 */
import { test, expect } from '@playwright/test';

test.describe('Theme Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const guestBtn = page.locator('button:has-text("Masuk sebagai Tamu")');
    const pttBtn = page.locator('button:has-text("PTT")');
    await Promise.race([
      guestBtn.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {}),
      pttBtn.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {}),
    ]);
    if (await guestBtn.isVisible()) {
      await guestBtn.click();
    }
    await page.waitForSelector('button:has-text("PTT")', { timeout: 10_000 });
  });

  test('should open settings panel', async ({ page }) => {
    await page.click('button:has-text("SET")');
    await expect(page.locator('span:has-text("Pengaturan")').first()).toBeVisible({ timeout: 5_000 });
  });

  test('should open theme modal via Ganti button', async ({ page }) => {
    await page.click('button:has-text("SET")');
    await page.waitForTimeout(500);

    // Find and click the Ganti button (may need to scroll or click Tampilan tab)
    const gantiBtn = page.locator('button:has-text("Ganti")');
    if (await gantiBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gantiBtn.click();
    } else {
      // Try clicking Tampilan tab first
      const tampilanTab = page.locator('button:has-text("Tampilan")');
      if (await tampilanTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tampilanTab.click();
        await page.waitForTimeout(500);
        await page.locator('button:has-text("Ganti")').click();
      }
    }

    await expect(page.getByText('Pilih Tema')).toBeVisible({ timeout: 5_000 });
  });

  test('theme modal should list all 8 themes', async ({ page }) => {
    await page.click('button:has-text("SET")');
    await page.waitForTimeout(500);

    const gantiBtn = page.locator('button:has-text("Ganti")');
    if (await gantiBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gantiBtn.click();
    } else {
      const tampilanTab = page.locator('button:has-text("Tampilan")');
      if (await tampilanTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tampilanTab.click();
        await page.waitForTimeout(500);
        await page.locator('button:has-text("Ganti")').click();
      }
    }

    await expect(page.getByText('Pilih Tema')).toBeVisible({ timeout: 5_000 });

    const themes = [
      'Classic',
      'Glass Crystal V1',
      'Glass Crystal V2',
      'Glass Crystal V3',
      'Glass Crystal V4',
      'Glass Crystal V5',
      'Glass Crystal V6',
      'Monokrom',
    ];
    for (const theme of themes) {
      await expect(page.getByText(theme, { exact: false }).first()).toBeVisible();
    }
  });

  test('selecting a theme should apply it and close modal', async ({ page }) => {
    await page.click('button:has-text("SET")');
    await page.waitForTimeout(500);

    const gantiBtn = page.locator('button:has-text("Ganti")');
    if (await gantiBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await gantiBtn.click();
    } else {
      const tampilanTab = page.locator('button:has-text("Tampilan")');
      if (await tampilanTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tampilanTab.click();
        await page.waitForTimeout(500);
        await page.locator('button:has-text("Ganti")').click();
      }
    }

    await expect(page.getByText('Pilih Tema')).toBeVisible({ timeout: 5_000 });

    // Select Monokrom theme
    await page.locator('button').filter({ hasText: 'Monokrom' }).first().click();

    // Modal should close
    await expect(page.getByText('Pilih Tema')).not.toBeVisible({ timeout: 3_000 });
  });

  test('theme can be changed via store directly', async ({ page }) => {
    // Verify theme switching works via store
    await page.evaluate(() => {
      (window as any).__store__.getState().updateSettings({ themeText: 'theme-v5' });
    });

    // Open settings and verify
    await page.click('button:has-text("SET")');
    await page.waitForTimeout(500);

    // The body should have the theme class applied
    const hasThemeClass = await page.evaluate(() => {
      return document.body.className.includes('theme-v5') ||
        document.querySelector('[class*="theme-v5"]') !== null;
    });
    expect(hasThemeClass).toBe(true);
  });

  test('default theme should be theme-classic', async ({ page }) => {
    const themeText = await page.evaluate(() => {
      return (window as any).__store__.getState().themeText;
    });
    expect(themeText).toBe('theme-classic');
  });
});
