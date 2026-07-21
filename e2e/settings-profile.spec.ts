/**
 * e2e/settings-profile.spec.ts
 * NextVWT – Settings Profile Section Tests
 *
 * Validates:
 * 1. Profile tab shows display name input
 * 2. Changing display name updates LCD
 * 3. Location input is present and editable
 * 4. Photo source buttons are present
 * 5. Sign out button is present
 */
import { test, expect } from '@playwright/test';

test.describe('Settings Profile Section', () => {
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

  test('should open settings with profile tab active by default', async ({ page }) => {
    await page.click('button:has-text("SET")');
    await expect(page.locator('span:has-text("Pengaturan")').first()).toBeVisible({ timeout: 5_000 });

    // Profile tab should be active (Profil button visible)
    await expect(page.locator('button:has-text("Profil")')).toBeVisible();
  });

  test('should display display name input field', async ({ page }) => {
    await page.click('button:has-text("SET")');

    // Display name input with placeholder
    const nameInput = page.locator('input[placeholder="Username / Display name..."]');
    await expect(nameInput).toBeVisible({ timeout: 5_000 });
  });

  test('should display location input field', async ({ page }) => {
    await page.click('button:has-text("SET")');

    // Location input
    const locationInput = page.locator('#locationTextInput');
    await expect(locationInput).toBeVisible({ timeout: 5_000 });

    // Default location should be "BANDUNG, JABAR"
    await expect(locationInput).toHaveValue('BANDUNG, JABAR');
  });

  test('changing display name should update LCD username', async ({ page }) => {
    await page.click('button:has-text("SET")');

    const nameInput = page.locator('input[placeholder="Username / Display name..."]');
    await expect(nameInput).toBeVisible({ timeout: 5_000 });

    // Clear and type new name
    await nameInput.clear();
    await nameInput.fill('Radio Operator');

    // Close settings
    await page.click('button:has-text("Back")');
    await page.waitForTimeout(500);

    // LCD should show new name
    await expect(page.getByTestId('lcd-username')).toHaveText('Radio Operator', { timeout: 3_000 });
  });

  test('should show photo source buttons', async ({ page }) => {
    await page.click('button:has-text("SET")');

    // Photo source buttons
    await expect(page.locator('button:has-text("Foto Google")')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('button:has-text("Unggah Galeri")')).toBeVisible();
  });

  test('should show sign out button', async ({ page }) => {
    await page.click('button:has-text("SET")');

    await expect(page.locator('button:has-text("Keluar dari Akun Google")')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('should have "Daftar kata" button for predefined phrases', async ({ page }) => {
    await page.click('button:has-text("SET")');

    const phraseBtn = page.locator('button[aria-label="Daftar kata"]');
    await expect(phraseBtn).toBeVisible({ timeout: 5_000 });
  });

  test('clicking "Daftar kata" should open phrase picker modal', async ({ page }) => {
    await page.click('button:has-text("SET")');

    const phraseBtn = page.locator('button[aria-label="Daftar kata"]');
    await expect(phraseBtn).toBeVisible({ timeout: 5_000 });
    await phraseBtn.click();

    // Phrase modal should open
    await expect(page.getByText('Daftar kata/kalimat')).toBeVisible({ timeout: 5_000 });
  });

  test('should have "Pilih lokasi" button for province/city picker', async ({ page }) => {
    await page.click('button:has-text("SET")');

    const locationBtn = page.locator('button[aria-label="Pilih lokasi"]');
    await expect(locationBtn).toBeVisible({ timeout: 5_000 });
  });

  test('clicking "Pilih lokasi" should open province picker', async ({ page }) => {
    await page.click('button:has-text("SET")');

    const locationBtn = page.locator('button[aria-label="Pilih lokasi"]');
    await expect(locationBtn).toBeVisible({ timeout: 5_000 });
    await locationBtn.click();

    // Province modal should open
    await expect(page.getByText('Pilih provinsi')).toBeVisible({ timeout: 5_000 });
  });
});
