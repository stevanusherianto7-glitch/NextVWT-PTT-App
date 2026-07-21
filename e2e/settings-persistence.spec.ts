/**
 * e2e/settings-persistence.spec.ts
 * NextVWT – Settings Persistence (localStorage) Tests
 *
 * Validates:
 * 1. Settings changes persist across page reloads
 * 2. Display name persists
 * 3. Theme persists
 * 4. Toggle states persist
 */
import { test, expect, type Page } from './fixtures';

async function bypassLoginGate(page: Page) {
  const guestBtn = page.locator('button:has-text("Masuk sebagai Tamu")');
  const pttBtn = page.locator('button:has-text("PTT")');
  await Promise.race([
    guestBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
    pttBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
  ]);
  if (await guestBtn.isVisible()) {
    await guestBtn.click();
  }
  await page.waitForSelector('button:has-text("PTT")', { timeout: 10_000 });
}

test.describe('Settings Persistence', () => {
  test('display name should persist after page reload', async ({ page }) => {
    await page.goto('/');
    await bypassLoginGate(page);

    // Change display name
    await page.click('button:has-text("SET")');
    const nameInput = page.locator('input[placeholder="Username / Display name..."]');
    await expect(nameInput).toBeVisible({ timeout: 5_000 });
    await nameInput.clear();
    await nameInput.fill('Persistent User');
    await page.click('button:has-text("Back")');
    await page.waitForTimeout(500);

    // Verify name on LCD
    await expect(page.getByTestId('lcd-username')).toHaveText('Persistent User');

    // Reload page
    await page.reload();
    await bypassLoginGate(page);

    // Name should persist
    await expect(page.getByTestId('lcd-username')).toHaveText('Persistent User', { timeout: 5_000 });
  });

  test('theme selection should persist after page reload', async ({ page }) => {
    await page.goto('/');
    await bypassLoginGate(page);

    // Change theme via store
    await page.evaluate(() => {
      (window as any).__store__.getState().updateSettings({ themeText: 'theme-monokrom' });
    });
    await page.waitForTimeout(300);

    // Reload page
    await page.reload();
    await bypassLoginGate(page);

    // Theme should persist
    const themeText = await page.evaluate(() => {
      return (window as any).__store__.getState().themeText;
    });
    expect(themeText).toBe('theme-monokrom');
  });

  test('toggle states should persist after page reload', async ({ page }) => {
    await page.goto('/');
    await bypassLoginGate(page);

    // Change a toggle
    await page.evaluate(() => {
      (window as any).__store__.getState().updateSettings({ vibrateOnStart: false });
    });
    const val1 = await page.evaluate(() => (window as any).__store__.getState().vibrateOnStart);
    expect(val1).toBe(false);

    // Reload page
    await page.reload();
    await bypassLoginGate(page);

    // Toggle should persist
    const val2 = await page.evaluate(() => (window as any).__store__.getState().vibrateOnStart);
    expect(val2).toBe(false);
  });

  test('channel number should persist after page reload', async ({ page }) => {
    await page.goto('/');
    await bypassLoginGate(page);

    // Change channel
    await page.locator('button[aria-label="Channel Up"]').click();
    await page.locator('button[aria-label="Channel Up"]').click();
    await expect(page.getByTestId('lcd-channel-number')).toContainText('003', { timeout: 3_000 });

    // Reload page
    await page.reload();
    await bypassLoginGate(page);

    // Channel should persist
    await expect(page.getByTestId('lcd-channel-number')).toContainText('003', { timeout: 5_000 });
  });

  test('location should persist after page reload', async ({ page }) => {
    await page.goto('/');
    await bypassLoginGate(page);

    // Change location
    await page.evaluate(() => {
      (window as any).__store__.getState().updateSettings({ locationText: 'JAKARTA, DKI' });
    });

    // Reload page
    await page.reload();
    await bypassLoginGate(page);

    // Location should persist
    const location = await page.evaluate(() => {
      return (window as any).__store__.getState().locationText;
    });
    expect(location).toBe('JAKARTA, DKI');
  });
});
