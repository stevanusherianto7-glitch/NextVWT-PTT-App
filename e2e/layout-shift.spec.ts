/**
 * e2e/layout-shift.spec.ts
 * NextVWT – Cumulative Layout Shift (CLS) E2E Verification
 */
import { test, expect } from '@playwright/test';

interface LayoutShiftEntry extends PerformanceEntry {
  hadRecentInput: boolean;
  value: number;
}

interface CustomWindow extends Window {
  accumulatedCLS?: number;
}

test.describe('Cumulative Layout Shift (CLS) Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Inject observer before page loads so it captures initial rendering layout shifts
    await page.addInitScript(() => {
      const customWindow = window as unknown as CustomWindow;
      customWindow.accumulatedCLS = 0;
      try {
        const observer = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            const layoutEntry = entry as unknown as LayoutShiftEntry;
            // Only count shifts that occurred without recent user input (to isolate layout instability)
            if (!layoutEntry.hadRecentInput) {
              customWindow.accumulatedCLS = (customWindow.accumulatedCLS || 0) + layoutEntry.value;
            }
          }
        });
        observer.observe({ type: 'layout-shift', buffered: true });
      } catch (e) {
        console.warn('PerformanceObserver layout-shift not supported:', e);
      }
    });
  });

  test('should maintain Cumulative Layout Shift (CLS) < 0.1 during boot, modals, power toggle, and settings flow', async ({
    page,
  }) => {
    // 1. Go to page and trigger boot
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
    await page.waitForSelector('button:has-text("PTT")', { timeout: 10_000 });

    // 2. Perform rapid UI interactions to verify stability

    // Action A: Open settings panel (SET)
    await page.click('button:has-text("SET")');
    await page.waitForSelector('text=Pengaturan', { timeout: 3_000 });

    // Action B: Switch source selection tabs (from Google Photo to Gallery Upload)
    const galleryTab = page.locator('button:has-text("Unggah Galeri")');
    if (await galleryTab.isVisible()) {
      await galleryTab.click();
    }

    // Action C: Open user guide from settings
    const guideBtn = page.locator('button', { hasText: 'Panduan Pengguna' });
    if (await guideBtn.isVisible()) {
      await guideBtn.click();
      await page.waitForSelector('text=PENDAHULUAN', { timeout: 3_000 });
      // Go back to settings
      const backBtn = page.locator('button').filter({ hasText: /^$/ }).first();
      await backBtn.click({ force: true });
      await page.waitForSelector('text=Pengaturan', { timeout: 3_000 });
    }

    // Action D: Close Settings
    await page.click('button:has-text("Simpan")');
    await page.waitForSelector('button:has-text("PTT")', { timeout: 3_000 });

    // Action E: Open Channel List Modal (SCAN)
    await page.click('button:has-text("SCAN")');
    await page.waitForSelector('input[placeholder="Cari channel..."]', { timeout: 3_000 });

    // Action F: Close Channel List Modal using aria-label="Tutup"
    const closeChannelBtn = page.locator('button[aria-label="Tutup"]');
    await closeChannelBtn.click();
    await expect(page.locator('input[placeholder="Cari channel..."]')).not.toBeVisible({
      timeout: 3_000,
    });

    // Action G: Open User List Modal (Click User Count Icon on LCD)
    const userCountIcon = page.locator('img[alt="User Count Icon"]');
    await userCountIcon.click();
    await page.waitForSelector('.user-list-modal', { timeout: 3_000 });

    // Action H: Close User List Modal using backdrop click or click outside
    const backdrop = page.getByTestId('modal-backdrop');
    if (await backdrop.isVisible()) {
      await backdrop.click({ position: { x: 5, y: 5 }, force: true });
    } else {
      // Click somewhere else or escape
      await page.keyboard.press('Escape');
    }

    // Action I: Toggle Power switch (OFF and back ON)
    const powerToggle = page.locator('label.toggle-switch').first();
    await powerToggle.click();
    await page.waitForTimeout(200);
    await powerToggle.click();
    await page.waitForTimeout(200);

    // 3. Extract the accumulated CLS score from the window object
    const clsScore = await page.evaluate(() => {
      const customWindow = window as unknown as CustomWindow;
      return customWindow.accumulatedCLS || 0;
    });

    console.log(`[CLS Audit] Accumulated Cumulative Layout Shift: ${clsScore}`);

    // Assert that the CLS score is well under the 0.1 threshold (standard of premium visual experience)
    expect(clsScore).toBeLessThan(0.1);
  });
});
