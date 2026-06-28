/**
 * e2e/ptt-safeguards.spec.ts
 * NextVWT – PTT Robustness Safeguards E2E Tests
 */
import { test, expect } from '@playwright/test';

test.describe('PTT Robustness & Safeguards', () => {
  test('Collision Avoidance – should disable PTT button and display BUSY when channel is occupied', async ({
    page,
  }) => {
    await page.goto('/');

    // Bypass login modal
    const guestBtn = page.locator('button:has-text("Masuk sebagai Tamu")');
    await guestBtn.waitFor({ state: 'visible', timeout: 3000 });
    await guestBtn.click();
    await page.waitForSelector('button:has-text("PTT")', { timeout: 10_000 });
    // Allow connection and presence sync to settle down
    await page.waitForTimeout(1500);

    // 1. Mock that another user (User A) is currently transmitting and set Half-Duplex state
    await page.evaluate(() => {
      const store = (window as any).__store__;
      if (store) {
        // Override setState to ensure user-alfa-uuid is always preserved in activeUsers
        const originalSetState = store.setState;
        store.setState = (newVal: any) => {
          const updated = typeof newVal === 'function' ? newVal(store.getState()) : newVal;
          if (updated.activeUsers) {
            const hasAlfa = updated.activeUsers.some((u: any) => u.userId === 'user-alfa-uuid');
            if (!hasAlfa) {
              updated.activeUsers = [
                ...updated.activeUsers,
                { userId: 'user-alfa-uuid', displayName: 'User Alfa', callSign: 'ALFA', location: 'BANDUNG' }
              ];
            }
          }
          originalSetState(updated);
        };

        const currentUsers = store.getState().activeUsers || [];
        store.setState({
          coins: 1000,
          audioMode: 'discussion',
          fullDuplex: false,
          activeUsers: [
            ...currentUsers,
            {
              userId: 'user-alfa-uuid',
              displayName: 'User Alfa',
              callSign: 'ALFA',
              location: 'BANDUNG',
            }
          ],
          activeTransmitter: {
            userId: 'user-alfa-uuid',
            displayName: 'User Alfa',
            callSign: 'ALFA',
          },
        });
      }
    });

    // 2. Verify PTT button shows "BUSY"
    const pttButton = page.locator('button:has-text("BUSY")');
    await expect(pttButton).toBeVisible();

    // 3. Verify LCD Panel shows "Busy" badge
    const busyBadge = page.getByTestId('lcd-busy-badge');
    await expect(busyBadge).toBeVisible();

    // 4. Try to click PTT button while busy and verify it does not trigger local transmission
    await pttButton.dispatchEvent('mousedown');
    await page.waitForTimeout(200);

    const isTransmitting = await page.evaluate(
      () => (window as any).__store__.getState().isTransmitting
    );
    expect(isTransmitting).toBe(false);

    await pttButton.dispatchEvent('mouseup');
  });

  test('Watchdog Timeout – should auto-revert receiver to standby if active transmitter is silent/dead', async ({
    page,
  }) => {
    await page.goto('/');

    // Bypass login modal
    const guestBtn = page.locator('button:has-text("Masuk sebagai Tamu")');
    await guestBtn.waitFor({ state: 'visible', timeout: 3000 });
    await guestBtn.click();
    await page.waitForSelector('button:has-text("PTT")', { timeout: 10_000 });
    // Allow connection and presence sync to settle down
    await page.waitForTimeout(1500);

    // 1. Mock that another user (User A) starts transmitting and set Half-Duplex state
    await page.evaluate(() => {
      const store = (window as any).__store__;
      if (store) {
        // Override setState to ensure user-alfa-uuid is always preserved in activeUsers
        const originalSetState = store.setState;
        store.setState = (newVal: any) => {
          const updated = typeof newVal === 'function' ? newVal(store.getState()) : newVal;
          if (updated.activeUsers) {
            const hasAlfa = updated.activeUsers.some((u: any) => u.userId === 'user-alfa-uuid');
            if (!hasAlfa) {
              updated.activeUsers = [
                ...updated.activeUsers,
                { userId: 'user-alfa-uuid', displayName: 'User Alfa', callSign: 'ALFA', location: 'BANDUNG' }
              ];
            }
          }
          originalSetState(updated);
        };

        const currentUsers = store.getState().activeUsers || [];
        store.setState({
          coins: 1000,
          audioMode: 'discussion',
          fullDuplex: false,
          activeUsers: [
            ...currentUsers,
            {
              userId: 'user-alfa-uuid',
              displayName: 'User Alfa',
              callSign: 'ALFA',
              location: 'BANDUNG',
            }
          ],
          activeTransmitter: {
            userId: 'user-alfa-uuid',
            displayName: 'User Alfa',
            callSign: 'ALFA',
          },
        });
      }
    });

    // Verify User Alfa is initially active transmitter
    const activeTxBefore = await page.evaluate(
      () => (window as any).__store__.getState().activeTransmitter
    );
    expect(activeTxBefore).not.toBeNull();
    expect(activeTxBefore.displayName).toBe('User Alfa');

    // 2. Wait 1.8 seconds (watchdog timeout is 1.5 seconds) without any voice chunk events
    await page.waitForTimeout(1800);

    // 3. Verify receiver auto-reverted active transmitter to null (standby)
    const activeTxAfter = await page.evaluate(
      () => (window as any).__store__.getState().activeTransmitter
    );
    expect(activeTxAfter).toBeNull();
  });

  test('Mic Permission Denial – should show toast error and reset PTT state gracefully', async ({
    page,
  }) => {
    await page.goto('/');

    // Bypass login modal
    const guestBtn = page.locator('button:has-text("Masuk sebagai Tamu")');
    await guestBtn.waitFor({ state: 'visible', timeout: 3000 });
    await guestBtn.click();
    await page.waitForSelector('button:has-text("PTT")', { timeout: 10_000 });

    // 1. Stub getUserMedia to throw NotAllowedError (simulate mic blocked)
    await page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const err = new DOMException('Permission denied', 'NotAllowedError');
        throw err;
      };
    });

    // 2. Start transmitting (this should trigger recording and fail)
    await page.evaluate(() => {
      (window as any).__store__.getState().setTransmitting(true);
    });

    // 3. Verify toast message is shown and state reverts to false
    const toastMessage = page.locator(
      'text=Akses mikrofon ditolak. Silakan aktifkan izin mikrofon Anda.'
    );
    await expect(toastMessage).toBeVisible({ timeout: 5000 });

    const isTransmitting = await page.evaluate(
      () => (window as any).__store__.getState().isTransmitting
    );
    expect(isTransmitting).toBe(false);
  });
});
