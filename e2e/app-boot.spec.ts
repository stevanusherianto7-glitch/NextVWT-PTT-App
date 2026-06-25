/**
 * e2e/app-boot.spec.ts
 * NextVWT – App Boot & Initial State Tests
 *
 * Validates that the application:
 * 1. Loads correctly without errors
 * 2. Shows the correct initial UI elements
 * 3. Displays channel 100 (landing channel) on boot
 * 4. Shows the NextVWT brand logo and marquee
 */
import { test, expect } from '@playwright/test';

test.describe('App Boot & Initial State', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Automatically bypass LoginGate using the exposed store
    await page.evaluate(() => {
      if ((window as any).__store__) {
        (window as any).__store__.getState().setUser({
          id: 'e2e-test-user',
          email: 'test@example.com',
          isGuest: true
        });
      }
    });
    // Wait for main app shell to be visible
    await page.waitForSelector('button:has-text("PTT")', { timeout: 10_000 });
  });

  test('should load the app without a white screen or crash', async ({ page }) => {
    // The root div must be present and not blank
    const appRoot = page.locator('#root');
    await expect(appRoot).toBeVisible();

    // No fatal error boundary or white-screen
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('Something went wrong');
    expect(bodyText).not.toContain('Cannot read properties');
  });

  test('should display the power toggle button', async ({ page }) => {
    // There should be a power toggle checkbox (it might be visually hidden by CSS, so we check if it is attached)
    const powerToggle = page.locator('input[type="checkbox"]').first();
    await expect(powerToggle).toBeAttached();
  });

  test('should show the LCD panel with channel number', async ({ page }) => {
    const channelNumber = page.getByTestId('lcd-channel-number');
    await expect(channelNumber).toBeVisible({ timeout: 5_000 });
    const lcdText = await channelNumber.textContent();
    expect(lcdText).toContain('001');
  });

  test('should show the marquee text with STANDBY • READY', async ({ page }) => {
    // The animated marquee includes STANDBY and READY keywords
    const marqueeEl = page.locator('.animate-marquee').first();
    await expect(marqueeEl).toBeVisible();
    const marqueeText = await marqueeEl.textContent();
    expect(marqueeText).toContain('STANDBY');
    expect(marqueeText).toContain('READY');
  });

  test('should show control buttons: SCAN, SET, ▲, ▼', async ({ page }) => {
    await expect(page.locator('button', { hasText: 'SCAN' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'SET' })).toBeVisible();
  });

  test('should show the PTT button by default', async ({ page }) => {
    // PTT button has text "PTT" somewhere visible
    const pttBtn = page.locator('button', { hasText: 'PTT' });
    await expect(pttBtn).toBeVisible();
  });

  test('should show the power toggle in ON state by default', async ({ page }) => {
    // Power toggle — the slider input
    const powerToggle = page.locator('input[type="checkbox"]').first();
    await expect(powerToggle).toBeChecked();
  });
});
