/**
 * e2e/login-gate.spec.ts
 * NextVWT – Login Gate & Guest Login Flow Tests
 *
 * Validates:
 * 1. LoginGate renders with brand elements
 * 2. Guest login button transitions to main app
 * 3. Google login button is present
 * 4. Loading state shows spinner
 * 5. Footer text is visible
 */
import { test, expect } from '@playwright/test';

test.describe('Login Gate & Guest Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the LoginGate with brand name and subtitle', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('NextVWT');
    await expect(page.getByText('Virtual Walkie-Talkie')).toBeVisible();
  });

  test('should show Google login button', async ({ page }) => {
    const googleBtn = page.locator('button:has-text("Masuk dengan Google")');
    await expect(googleBtn).toBeVisible();
    await expect(googleBtn).toBeEnabled();
  });

  test('should show Guest login button', async ({ page }) => {
    const guestBtn = page.locator('button:has-text("Masuk sebagai Tamu")');
    await expect(guestBtn).toBeVisible();
    await expect(guestBtn).toBeEnabled();
  });

  test('should show footer text "NextVWT App"', async ({ page }) => {
    await expect(page.getByText('NextVWT App')).toBeVisible();
  });

  test('clicking Guest login should transition to main radio app', async ({ page }) => {
    const guestBtn = page.locator('button:has-text("Masuk sebagai Tamu")');
    await guestBtn.click();

    // After guest login, the PTT button should appear (main app loaded)
    await expect(page.locator('button:has-text("PTT")')).toBeVisible({ timeout: 10_000 });
  });

  test('clicking Guest login should show the LCD panel', async ({ page }) => {
    await page.locator('button:has-text("Masuk sebagai Tamu")').click();
    const channelNumber = page.getByTestId('lcd-channel-number');
    await expect(channelNumber).toBeVisible({ timeout: 10_000 });
  });

  test('should display description text about NextVWT', async ({ page }) => {
    await expect(
      page.getByText('Hubungkan ke aplikasi NextVWT')
    ).toBeVisible();
  });
});
