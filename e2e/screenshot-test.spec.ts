import { test, expect } from '@playwright/test';

test.describe('Visual UI Review & Regression Testing', () => {
  test('Dashboard and Channel List Layout Integrity', async ({ page }) => {
    // Navigasi ke halaman utama
    await page.goto('/');

    // Handle LoginGate fallback untuk E2E (Masuk sebagai tamu)
    const guestBtn = page.locator('button:has-text("Masuk sebagai Tamu")');
    const pttBtn = page.locator('button:has-text("PTT")');
    await Promise.race([
      guestBtn.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {}),
      pttBtn.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {}),
    ]);
    if (await guestBtn.isVisible()) {
      await guestBtn.click();
    }

    // Tunggu sampai layar utama stabil (RadioLayout muncul)
    await page.waitForSelector('button:has-text("PTT")', { timeout: 10000 });

    // Mask dynamic elements like UUIDs or time if they cause visual flakiness
    // For now we assume standard static UI or stable dummy data.
    await page.waitForTimeout(1000); // Wait for micro-animations to settle

    // Visual Check 1: Layar Utama (Radio Layout) - memastikan tidak ada layout shift dan estetika premium terjaga
    await expect(page).toHaveScreenshot('main-dashboard.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.08, // Toleransi ditingkatkan untuk mengatasi perbedaan rendering font cross-platform (Windows vs Linux CI)
    });

    // Buka Modal SCAN
    await page.click('button:has-text("SCAN")');

    // Tunggu modal stabil
    await page.waitForSelector('input[placeholder="Cari channel..."]', { timeout: 5000 });
    await page.waitForTimeout(500); // settle modal animations

    // Visual Check 2: Modal Channel List
    await expect(page).toHaveScreenshot('channel-list-modal.png', {
      mask: [page.locator('.lucide-users')], // Mask icon numbers if they vary based on active users
      maxDiffPixelRatio: 0.08, // Toleransi ditingkatkan untuk CI
    });
  });
});
