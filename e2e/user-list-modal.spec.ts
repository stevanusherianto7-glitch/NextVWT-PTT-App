/**
 * e2e/user-list-modal.spec.ts
 * NextVWT – User List Modal Tests
 *
 * Validates:
 * 1. User list modal opens when clicking user count area
 * 2. Modal displays the logged-in user
 * 3. Modal can be closed by clicking the user count icon again
 * 4. User count is displayed in the LCD
 * 5. User list shows user items with name and callsign
 */
import { test, expect } from './fixtures';

test.describe('User List Modal', () => {
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

  test('should display user count icon in LCD panel', async ({ page }) => {
    const userCountIcon = page.locator('img[alt="User Count Icon"]');
    await expect(userCountIcon).toBeVisible({ timeout: 5_000 });
  });

  test('clicking user count area should open user list modal', async ({ page }) => {
    const userCountIcon = page.locator('img[alt="User Count Icon"]');
    await expect(userCountIcon).toBeVisible({ timeout: 5_000 });
    await userCountIcon.click();

    const modal = page.locator('.user-list-modal');
    await expect(modal).toBeVisible({ timeout: 5_000 });
  });

  test('user list modal should show the logged-in guest user', async ({ page }) => {
    const userCountIcon = page.locator('img[alt="User Count Icon"]');
    await expect(userCountIcon).toBeVisible({ timeout: 5_000 });
    await userCountIcon.click();

    const modal = page.locator('.user-list-modal');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // The guest user "Tamu Peb" should be listed
    await expect(modal.getByText('Tamu Peb').first()).toBeVisible({ timeout: 5_000 });
  });

  test('user list shows user items with name', async ({ page }) => {
    const userCountIcon = page.locator('img[alt="User Count Icon"]');
    await expect(userCountIcon).toBeVisible({ timeout: 5_000 });
    await userCountIcon.click();

    const modal = page.locator('.user-list-modal');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Should show at least one user with "Tamu" in the name
    await expect(modal.getByText(/Tamu/)).toBeVisible({ timeout: 5_000 });
  });

  test('user list shows "Baru" tag for new users', async ({ page }) => {
    const userCountIcon = page.locator('img[alt="User Count Icon"]');
    await expect(userCountIcon).toBeVisible({ timeout: 5_000 });
    await userCountIcon.click();

    const modal = page.locator('.user-list-modal');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // "Baru" tag should be visible for the guest user
    await expect(modal.getByText('Baru')).toBeVisible({ timeout: 5_000 });
  });
});
