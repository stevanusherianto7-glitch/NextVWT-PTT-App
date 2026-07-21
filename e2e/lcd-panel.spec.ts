/**
 * e2e/lcd-panel.spec.ts
 * NextVWT – LCD Panel Information Elements Tests
 *
 * Validates:
 * 1. LCD displays username
 * 2. LCD displays channel number (CH + 3 digits)
 * 3. LCD displays user count
 * 4. LCD displays connection status (ONLINE)
 * 5. Signal bars are visible
 * 6. Signal click shows latency tooltip
 */
import { test, expect } from '@playwright/test';

test.describe('LCD Panel Information', () => {
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

  test('LCD should display username', async ({ page }) => {
    const username = page.getByTestId('lcd-username');
    await expect(username).toBeVisible({ timeout: 5_000 });
    // Default guest name is "Tamu Peb"
    await expect(username).toContainText('Tamu Peb');
  });

  test('LCD should display channel number with CH prefix', async ({ page }) => {
    const channelNumber = page.getByTestId('lcd-channel-number');
    await expect(channelNumber).toBeVisible({ timeout: 5_000 });

    // Channel should be 3 digits
    const text = await channelNumber.textContent();
    expect(text?.trim()).toMatch(/^\d{3}$/);
  });

  test('LCD should display "CH" label next to channel number', async ({ page }) => {
    // CH text should be visible near the channel number
    await expect(page.getByText('CH', { exact: true })).toBeVisible({ timeout: 5_000 });
  });

  test('LCD should display user count', async ({ page }) => {
    // User count area should be visible
    const userCountIcon = page.locator('img[alt="User Count Icon"]');
    await expect(userCountIcon).toBeVisible({ timeout: 5_000 });

    // User count number should be visible (3 digits, zero-padded)
    const userCountArea = userCountIcon.locator('..').locator('..');
    const countText = await userCountArea.textContent();
    expect(countText).toMatch(/\d{3}/);
  });

  test('LCD should show ONLINE status when connected', async ({ page }) => {
    // connection-status should contain "ONLINE" (sr-only)
    const status = page.getByTestId('connection-status');
    await expect(status).toBeVisible({ timeout: 5_000 });
    await expect(status).toContainText('ONLINE');
  });

  test('LCD should show signal bars', async ({ page }) => {
    // Signal bars are rendered as div elements with specific heights
    // Check that the signal bar container exists (right side of LCD)
    const signalBars = page.locator('.flex.items-end.gap-0.h-full');
    await expect(signalBars.first()).toBeVisible({ timeout: 5_000 });
  });

  test('clicking signal bars should show latency tooltip', async ({ page }) => {
    // Click the signal bar area
    const signalBars = page.locator('.flex.items-end.gap-0.h-full');
    await expect(signalBars.first()).toBeVisible({ timeout: 5_000 });
    await signalBars.first().click();

    // Latency tooltip should appear
    await expect(page.getByText(/Latency:/)).toBeVisible({ timeout: 3_000 });
  });

  test('latency tooltip should disappear after 3 seconds', async ({ page }) => {
    const signalBars = page.locator('.flex.items-end.gap-0.h-full');
    await expect(signalBars.first()).toBeVisible({ timeout: 5_000 });
    await signalBars.first().click();

    // Tooltip should appear
    await expect(page.getByText(/Latency:/)).toBeVisible({ timeout: 3_000 });

    // Wait for it to disappear
    await page.waitForTimeout(3500);
    await expect(page.getByText(/Latency:/)).not.toBeVisible();
  });

  test('LCD should display Role Icon', async ({ page }) => {
    const roleIcon = page.locator('img[alt="Role Icon"]');
    await expect(roleIcon).toBeVisible({ timeout: 5_000 });
  });
});
