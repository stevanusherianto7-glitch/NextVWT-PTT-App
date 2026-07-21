/**
 * e2e/settings-flow.spec.ts
 * NextVWT – Settings Panel (SET Button) Flow Tests
 */
import { test, expect } from './fixtures';

test.describe('Settings Panel Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'nextvwt_settings',
        JSON.stringify({
          hasCompletedOnboarding: true,
          lastFeedbackTime: Date.now(),
        })
      );
    });
    await page.goto('/');
    // Automatically bypass LoginGate if visible
    const guestBtn = page.locator('button:has-text("Masuk sebagai Tamu")');
    const pttBtn = page.locator('button:has-text("PTT")');
    await Promise.race([
      guestBtn.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {}),
      pttBtn.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {}),
    ]);
    if (await guestBtn.isVisible()) {
      await guestBtn.click();
    }
    await page.waitForSelector('button:has-text("SET")', { timeout: 10_000 });
    await page.click('button:has-text("SET")');
    await page.waitForSelector('text=Pengaturan', { timeout: 5_000 });
  });

  test('clicking SET opens the settings panel with "Pengaturan" header', async ({ page }) => {
    await expect(page.locator('text=Pengaturan').first()).toBeVisible();
  });

  test('settings panel shows username / display name input', async ({ page }) => {
    const usernameInput = page.locator('input[type="text"]').first();
    await expect(usernameInput).toBeVisible();
  });

  test('settings panel has Back button', async ({ page }) => {
    const backBtn = page.locator('button', { hasText: 'Back' });
    await expect(backBtn).toBeVisible();
  });

  test('Tentang section shows version 2.0.0', async ({ page }) => {
    await page.click('button:has-text("Lainnya")');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const versionText = await page.textContent('body');
    expect(versionText).toContain('2.0.0');
  });

  test('Panduan Pengguna button opens the user guide', async ({ page }) => {
    await page.click('button:has-text("Lainnya")');
    const guideBtn = page.locator('button', { hasText: 'Panduan Pengguna' });
    await expect(guideBtn).toBeVisible();
    await guideBtn.click();
    await expect(page.locator('text=PENDAHULUAN')).toBeVisible({ timeout: 5_000 });
  });

  test('user guide contains NextVWT description text', async ({ page }) => {
    await page.click('button:has-text("Lainnya")');
    await page.locator('button', { hasText: 'Panduan Pengguna' }).click();
    await expect(page.locator('text=PENDAHULUAN')).toBeVisible({ timeout: 5_000 });

    // Use textContent instead of locator to avoid strict-mode multi-element violation
    const guideText = await page.textContent('body');
    expect(guideText).toContain('Virtual Walkie Talkie');
    expect(guideText).toContain('NextVWT');
  });

  test('back button in user guide returns to settings', async ({ page }) => {
    await page.click('button:has-text("Lainnya")');
    await page.locator('button', { hasText: 'Panduan Pengguna' }).click();
    await expect(page.locator('text=PENDAHULUAN')).toBeVisible({ timeout: 5_000 });

    // Click the back arrow — it's the button that contains a polyline/line SVG in the user guide header
    // Use the button that is NOT inside a modal backdrop overlay
    const backBtn = page.locator('button').filter({ hasText: /^$/ }).first();
    await backBtn.click({ force: true });

    await expect(page.locator('text=Pengaturan').first()).toBeVisible({ timeout: 5_000 });
  });

  test('settings panel has toggle switches visible', async ({ page }) => {
    const toggles = page.locator('input[type="checkbox"]');
    const count = await toggles.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
