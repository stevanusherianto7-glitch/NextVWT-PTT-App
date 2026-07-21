/**
 * e2e/channel-navigation.spec.ts
 * NextVWT – Channel Up/Down Navigation Tests
 *
 * Validates:
 * 1. Channel Up button increments channel number
 * 2. Channel Down button decrements channel number
 * 3. LCD updates reflect navigation changes
 * 4. Multiple rapid presses work correctly
 */
import { test, expect } from './fixtures';

test.describe('Channel Up/Down Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Bypass LoginGate
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

  test('should start on channel 001', async ({ page }) => {
    const channelNumber = page.getByTestId('lcd-channel-number');
    await expect(channelNumber).toBeVisible({ timeout: 5_000 });
    await expect(channelNumber).toContainText('001');
  });

  test('Channel Up button should increment channel number', async ({ page }) => {
    const channelNumber = page.getByTestId('lcd-channel-number');
    await expect(channelNumber).toContainText('001');

    // Click Channel Up
    await page.locator('button[aria-label="Channel Up"]').click();

    // Channel should increment to 002
    await expect(channelNumber).toContainText('002', { timeout: 3_000 });
  });

  test('Channel Down button should decrement channel number', async ({ page }) => {
    const channelNumber = page.getByTestId('lcd-channel-number');
    await expect(channelNumber).toContainText('001');

    // Click Channel Down (wraps around)
    await page.locator('button[aria-label="Channel Down"]').click();

    // Channel should change (wraps to a higher number)
    const newChannel = await channelNumber.textContent();
    expect(newChannel).not.toBe('001');
  });

  test('multiple Channel Up presses should increment correctly', async ({ page }) => {
    const channelNumber = page.getByTestId('lcd-channel-number');
    await expect(channelNumber).toContainText('001');

    // Press Up 3 times
    await page.locator('button[aria-label="Channel Up"]').click();
    await page.locator('button[aria-label="Channel Up"]').click();
    await page.locator('button[aria-label="Channel Up"]').click();

    // Channel should be 004
    await expect(channelNumber).toContainText('004', { timeout: 3_000 });
  });

  test('Channel Up then Down should return to original channel', async ({ page }) => {
    const channelNumber = page.getByTestId('lcd-channel-number');
    await expect(channelNumber).toContainText('001');

    await page.locator('button[aria-label="Channel Up"]').click();
    await expect(channelNumber).toContainText('002', { timeout: 3_000 });

    await page.locator('button[aria-label="Channel Down"]').click();
    await expect(channelNumber).toContainText('001', { timeout: 3_000 });
  });

  test('LCD channel number is zero-padded to 3 digits', async ({ page }) => {
    const channelNumber = page.getByTestId('lcd-channel-number');
    const text = await channelNumber.textContent();
    // Should match 3-digit pattern
    expect(text?.trim()).toMatch(/^\d{3}$/);
  });
});
