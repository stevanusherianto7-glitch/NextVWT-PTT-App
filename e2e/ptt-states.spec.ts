/**
 * e2e/ptt-states.spec.ts
 * NextVWT – PTT Button Visual States Tests
 *
 * Validates:
 * 1. PTT button shows "PTT" text in idle state
 * 2. PTT button is enabled and clickable
 * 3. PTT button still shows text when power is off
 * 4. PTT button toggles isTransmitting in store
 * 5. PTT button depressed state on mouse hold
 */
import { test, expect } from './fixtures';

test.describe('PTT Button Visual States', () => {
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

  test('PTT button should display "PTT" text in idle state', async ({ page }) => {
    const pttButton = page.getByTestId('ptt-button');
    await expect(pttButton).toBeVisible({ timeout: 5_000 });
    await expect(pttButton).toContainText('PTT');
  });

  test('PTT button should be enabled and clickable in idle state', async ({ page }) => {
    const pttButton = page.getByTestId('ptt-button');
    await expect(pttButton).toBeVisible({ timeout: 5_000 });
    await expect(pttButton).toBeEnabled();
  });

  test('PTT button should still show text when power is off', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).__store__.setState({ isPowerOn: false });
    });

    const pttButton = page.getByTestId('ptt-button');
    await expect(pttButton).toBeVisible({ timeout: 5_000 });
    await expect(pttButton).toContainText('PTT');

    // Restore
    await page.evaluate(() => {
      (window as any).__store__.setState({ isPowerOn: true });
    });
  });

  test('PTT button should toggle isTransmitting in store on click', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).__store__.setState({ coins: 1000, isConnected: true });
      (window as any).__store__.getState().updateSettings({ togglePtt: true });
    });

    const pttButton = page.getByTestId('ptt-button');
    await expect(pttButton).toBeVisible({ timeout: 5_000 });

    // Click to start transmitting
    await pttButton.click();

    const isTransmitting = await page.evaluate(() => {
      return (window as any).__store__.getState().isTransmitting;
    });
    expect(isTransmitting).toBe(true);

    // Click again to stop
    await pttButton.click();

    const isTransmittingAfter = await page.evaluate(() => {
      return (window as any).__store__.getState().isTransmitting;
    });
    expect(isTransmittingAfter).toBe(false);
  });

  test('PTT button depressed state on mouse hold', async ({ page }) => {
    const pttButton = page.getByTestId('ptt-button');
    await expect(pttButton).toBeVisible({ timeout: 5_000 });

    const initialTransform = await pttButton.evaluate((el) => (el as HTMLElement).style.transform);

    await pttButton.hover();
    await page.mouse.down();

    await expect
      .poll(
        async () => {
          return await pttButton.evaluate((el) => (el as HTMLElement).style.transform);
        },
        { timeout: 2_000 }
      )
      .toContain('translateY(4px)');

    await page.mouse.up();

    await expect
      .poll(
        async () => {
          return await pttButton.evaluate((el) => (el as HTMLElement).style.transform);
        },
        { timeout: 2_000 }
      )
      .toBe(initialTransform);
  });
});
