/**
 * e2e/power-toggle.spec.ts
 * NextVWT – Power Toggle & Graceful Degradation Tests
 *
 * The power toggle uses a CSS-hidden checkbox (.toggle-switch-input).
 * Playwright's click() doesn't work even with force:true on hidden elements.
 * Solution: click the visible <label class="toggle-switch"> wrapper instead,
 * and use evaluate() + isChecked() to read checkbox state.
 */
import { test, expect, type Page } from './fixtures';

// Click the visible toggle label (parent of the hidden input)
async function clickPowerToggle(page: Page) {
  await page.locator('label.toggle-switch').first().click();
}

// Read the underlying checkbox state via evaluate (bypasses visibility)
async function isPowerOn(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const el = document.querySelector('.toggle-switch-input') as HTMLInputElement | null;
    return el ? el.checked : true;
  });
}

test.describe('Power Toggle & Graceful Degradation', () => {
  test.beforeEach(async ({ page }) => {
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
    // Wait for the visible toggle label to appear
    await page.waitForSelector('label.toggle-switch', { timeout: 10_000 });
  });

  test('power toggle is ON by default', async ({ page }) => {
    const on = await isPowerOn(page);
    expect(on).toBe(true);
  });

  test('toggling power OFF does not crash the app', async ({ page }) => {
    await clickPowerToggle(page);
    expect(await isPowerOn(page)).toBe(false);

    // App must still render content — no crash
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('Something went wrong');
    expect(bodyText).not.toContain('Cannot read properties');

    // NextVWT brand still visible after power off
    await expect(page.locator('text=NextVWT').first()).toBeVisible();
  });

  test('power can be toggled back ON after being turned OFF', async ({ page }) => {
    await clickPowerToggle(page);
    expect(await isPowerOn(page)).toBe(false);

    await clickPowerToggle(page);
    expect(await isPowerOn(page)).toBe(true);
  });

  test('after power restored, SET button opens settings', async ({ page }) => {
    await clickPowerToggle(page); // OFF
    await clickPowerToggle(page); // ON
    expect(await isPowerOn(page)).toBe(true);

    await page.click('button:has-text("SET")');
    await expect(page.locator('text=Pengaturan').first()).toBeVisible({ timeout: 5_000 });
  });

  test('multiple rapid power toggles do not crash the app', async ({ page }) => {
    // 6 rapid clicks → ends ON (even number)
    for (let i = 0; i < 6; i++) {
      await clickPowerToggle(page);
      await page.waitForTimeout(80);
    }

    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('Something went wrong');
    await expect(page.locator('text=NextVWT').first()).toBeVisible();
    expect(await isPowerOn(page)).toBe(true);
  });

  test('power toggle cycles ON → OFF → ON correctly', async ({ page }) => {
    expect(await isPowerOn(page)).toBe(true);

    await clickPowerToggle(page);
    expect(await isPowerOn(page)).toBe(false);

    await clickPowerToggle(page);
    expect(await isPowerOn(page)).toBe(true);
  });
});
