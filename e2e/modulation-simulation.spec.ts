/**
 * e2e/modulation-simulation.spec.ts
 * NextVWT – User Modulation Activity & Network Failure Simulation Tests
 */
import { test, expect } from './fixtures';

test.describe('User Modulation Activity Simulation', () => {
  test.beforeEach(async ({ page }) => {
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

    // Mock getUserMedia for simulated microphone stream to support PTT recording
    await page.evaluate(() => {
      if (navigator.mediaDevices) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        const dest = ctx.createMediaStreamDestination();
        const osc = ctx.createOscillator();
        osc.connect(dest);
        osc.start();

        navigator.mediaDevices.getUserMedia = async () => {
          return dest.stream;
        };
      }

      if (window.AnalyserNode) {
        window.AnalyserNode.prototype.getFloatTimeDomainData = function (array: Float32Array) {
          for (let i = 0; i < array.length; i++) {
            array[i] = Math.sin(i * 0.1) * 0.1;
          }
        };
      }
    });
  });

  test('user can scan, change channel, and confirm selection', async ({ page }) => {
    // 1. Click SCAN button
    await page.click('button:has-text("SCAN")');
    await expect(page.locator('input[placeholder="Cari channel..."]')).toBeVisible();

    // 2. Select KOPDAR NASIONAL UTAMA channel
    await page.locator('button').filter({ hasText: 'KOPDAR NASIONAL UTAMA' }).click();

    // 3. Confirm selection by clicking "Menuju Channel"
    await page.locator('button:has-text("Menuju Channel")').click();

    // 4. Modal should close and the channel should be loaded
    await expect(page.locator('input[placeholder="Cari channel..."]')).not.toBeVisible();
    await expect(page.locator('text=KOPDAR NASIONAL UTAMA')).toBeVisible({ timeout: 5_000 });
  });

  test('user can press-and-hold PTT to modulate voice transmission', async ({ page }) => {
    // 1. Turn off Toggle PTT and set coins balance directly via store to enable Hold-to-Talk mode
    await page.evaluate(() => {
      (window as any).__store__.setState({ coins: 1000 });
      (window as any).__store__.getState().updateSettings({ togglePtt: false });
    });

    const pttButton = page.locator('button:has-text("PTT")');
    const progressBar = page.locator('div.h-full.transition-all.duration-75').first();

    // 2. Initially standby (0% progress)
    await expect(progressBar).toHaveCSS('width', '0px');

    // 3. Simulate mouse down on PTT button
    await pttButton.hover();
    await page.mouse.down();
    await page.waitForTimeout(1000); // Wait for active modulation simulation

    // 4. Assert active modulation is happening (width is greater than 0)
    await expect
      .poll(
        async () => {
          return await progressBar.evaluate((el) => el.style.width);
        },
        {
          message: 'Progress bar width should be greater than 0% during active modulation',
          timeout: 5000,
        }
      )
      .not.toBe('0%');

    // 5. Release mouse and return to standby
    await page.mouse.up();
    await page.waitForTimeout(500);
    await expect(progressBar).toHaveCSS('width', '0px');
  });

  test('user activity resilience under API/Network failure (Offline Robustness)', async ({
    page,
  }) => {
    // 1. Force and lock the store state to offline (isConnected = false) via exposed window.__store__
    await page.evaluate(() => {
      const store = (window as any).__store__;
      if (store) {
        const original = store.setState;
        (store as any).__originalSetState = original;
        store.setState = (partial: any) => {
          const nextPartial = typeof partial === 'function' ? partial(store.getState()) : partial;
          if (nextPartial && 'isConnected' in nextPartial) {
            nextPartial.isConnected = false;
          }
          original(nextPartial);
        };
        store.setState({ isConnected: false });
      }
    });

    // 2. Verify that the app is still functional and has "Offline" badge on LCD
    await expect(page.locator('text=Offline')).toBeVisible({ timeout: 5_000 });

    // 3. Go to settings, update info name, and save
    await page.click('button:has-text("SET")');
    await expect(page.locator('span:has-text("Pengaturan")').first()).toBeVisible();

    const nameInput = page.locator('input[type="text"]').first();
    await nameInput.clear();
    await nameInput.fill('Pebe Offline Test');
    await page.click('button:has-text("Back")');

    // 4. Verify the updated name is displayed on the LCD panel while offline
    await expect(page.getByTestId('lcd-username')).toHaveText('Pebe Offline Test');

    // 5. Restore network connection state and unlock setState in store
    await page.evaluate(() => {
      const store = (window as any).__store__;
      if (store && (store as any).__originalSetState) {
        store.setState = (store as any).__originalSetState;
        store.setState({ isConnected: true });
      }
    });
  });
});
