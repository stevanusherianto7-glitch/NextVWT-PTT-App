/**
 * e2e/settings-toggles.spec.ts
 * NextVWT – Settings Panel Toggle Interactions Tests
 *
 * The actual <input> checkboxes are visually hidden via CSS class "settings-checkbox-input".
 * The visible toggle is the <label> element. We use `force: true` to interact with hidden inputs.
 */
import { test, expect } from './fixtures';

test.describe('Settings Panel Toggles', () => {
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

  test('should open settings panel on Profil tab by default', async ({ page }) => {
    await page.click('button:has-text("SET")');
    await expect(page.locator('span:has-text("Pengaturan")').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('button:has-text("Profil")')).toBeVisible();
  });

  test('should navigate to Audio tab and show audio toggles', async ({ page }) => {
    await page.click('button:has-text("SET")');
    await page.locator('button:has-text("Audio")').click();
    await page.waitForTimeout(300);

    await expect(page.getByText('Getar Mulai')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Nada Mulai dan Akhir')).toBeVisible();
    await expect(page.getByText('Dapat Aktif di Latar Belakang')).toBeVisible();
    await expect(page.getByText('Mode Untuk Channel Full-Duplex')).toBeVisible();
  });

  test('should toggle vibrateOnStart off and on via store', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).__store__.getState().updateSettings({ vibrateOnStart: false });
    });
    const val1 = await page.evaluate(() => (window as any).__store__.getState().vibrateOnStart);
    expect(val1).toBe(false);

    await page.evaluate(() => {
      (window as any).__store__.getState().updateSettings({ vibrateOnStart: true });
    });
    const val2 = await page.evaluate(() => (window as any).__store__.getState().vibrateOnStart);
    expect(val2).toBe(true);
  });

  test('should toggle toneOnStartEnd off and on via store', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).__store__.getState().updateSettings({ toneOnStartEnd: false });
    });
    const val1 = await page.evaluate(() => (window as any).__store__.getState().toneOnStartEnd);
    expect(val1).toBe(false);

    await page.evaluate(() => {
      (window as any).__store__.getState().updateSettings({ toneOnStartEnd: true });
    });
    const val2 = await page.evaluate(() => (window as any).__store__.getState().toneOnStartEnd);
    expect(val2).toBe(true);
  });

  test('should toggle bgActive via store', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).__store__.getState().updateSettings({ bgActive: false });
    });
    const val1 = await page.evaluate(() => (window as any).__store__.getState().bgActive);
    expect(val1).toBe(false);
  });

  test('should toggle fullDuplex via store', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).__store__.getState().updateSettings({ fullDuplex: true });
    });
    const val1 = await page.evaluate(() => (window as any).__store__.getState().fullDuplex);
    expect(val1).toBe(true);

    await page.evaluate(() => {
      (window as any).__store__.getState().updateSettings({ fullDuplex: false });
    });
    const val2 = await page.evaluate(() => (window as any).__store__.getState().fullDuplex);
    expect(val2).toBe(false);
  });

  test('should navigate to Tampilan tab and show appearance toggles', async ({ page }) => {
    await page.click('button:has-text("SET")');
    await page.locator('button:has-text("Tampilan")').click();
    await page.waitForTimeout(300);

    await expect(page.getByText('Tampilkan Foto')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Klik Cepat')).toBeVisible();
    await expect(page.getByText('Tampilkan Modulator')).toBeVisible();
    await expect(page.getByText('Tampilkan PTT')).toBeVisible();
  });

  test('should toggle showPTT off to hide PTT button', async ({ page }) => {
    // Toggle showPTT off via store
    await page.evaluate(() => {
      (window as any).__store__.getState().updateSettings({ showPTT: false });
    });

    await page.waitForTimeout(500);
    const pttBtn = page.locator('button:has-text("PTT")');
    await expect(pttBtn).not.toBeVisible({ timeout: 3_000 });

    // Restore
    await page.evaluate(() => {
      (window as any).__store__.getState().updateSettings({ showPTT: true });
    });
  });

  test('should toggle togglePtt mode via store', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).__store__.getState().updateSettings({ togglePtt: false });
    });
    const val1 = await page.evaluate(() => (window as any).__store__.getState().togglePtt);
    expect(val1).toBe(false);

    await page.evaluate(() => {
      (window as any).__store__.getState().updateSettings({ togglePtt: true });
    });
    const val2 = await page.evaluate(() => (window as any).__store__.getState().togglePtt);
    expect(val2).toBe(true);
  });

  test('settings panel has all 4 tabs', async ({ page }) => {
    await page.click('button:has-text("SET")');
    await expect(page.locator('button:has-text("Profil")')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('button:has-text("Audio")')).toBeVisible();
    await expect(page.locator('button:has-text("Tampilan")')).toBeVisible();
    await expect(page.locator('button:has-text("Lainnya")')).toBeVisible();
  });

  test('clicking each tab switches content', async ({ page }) => {
    await page.click('button:has-text("SET")');

    // Audio tab
    await page.locator('button:has-text("Audio")').click();
    await expect(page.getByText('Getar Mulai')).toBeVisible({ timeout: 5_000 });

    // Tampilan tab
    await page.locator('button:has-text("Tampilan")').click();
    await expect(page.getByText('Tampilkan Foto')).toBeVisible({ timeout: 5_000 });

    // Profil tab
    await page.locator('button:has-text("Profil")').click();
    await expect(page.locator('input[placeholder="Username / Display name..."]')).toBeVisible({ timeout: 5_000 });
  });
});
