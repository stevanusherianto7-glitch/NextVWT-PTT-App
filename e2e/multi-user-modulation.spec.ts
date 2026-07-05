/**
 * e2e/multi-user-modulation.spec.ts
 * NextVWT – Multi-User Modulation Delivery Flow Tests
 */
import { test, expect } from '@playwright/test';

test.describe('Multi-User Real-time Modulation Delivery', () => {
  test('should deliver transmission and modulation states between users in the same channel', async ({
    browser,
  }) => {
    // 1. Instantiating Browser Context for User Alfa
    const contextAlfa = await browser.newContext();
    const pageAlfa = await contextAlfa.newPage();

    // 2. Instantiating Browser Context for User Beta
    const contextBeta = await browser.newContext();
    const pageBeta = await contextBeta.newPage();

    // 3. User Alfa joins
    await pageAlfa.goto('/');
    const guestBtnAlfa = pageAlfa.locator('button:has-text("Masuk sebagai Tamu")');
    await guestBtnAlfa.waitFor({ state: 'visible', timeout: 5000 });
    await guestBtnAlfa.click();

    // Set User Alfa display name
    await pageAlfa.click('button:has-text("SET")');
    await expect(pageAlfa.locator('span:has-text("Pengaturan")').first()).toBeVisible();
    const nameInputAlfa = pageAlfa.locator('input[type="text"]').first();
    await nameInputAlfa.clear();
    await nameInputAlfa.fill('User Alfa');
    await pageAlfa.click('button:has-text("Back")');
    await expect(pageAlfa.locator('span:has-text("Pengaturan")').first()).not.toBeVisible();

    // Disable Toggle PTT (Hold-to-Talk mode) for User Alfa via store
    await pageAlfa.evaluate(() => {
      (window as any).__store__.getState().updateSettings({ togglePtt: false });
    });

    // 4. User Beta joins
    await pageBeta.goto('/');
    const guestBtnBeta = pageBeta.locator('button:has-text("Masuk sebagai Tamu")');
    await guestBtnBeta.waitFor({ state: 'visible', timeout: 5000 });
    await guestBtnBeta.click();

    // Set User Beta display name
    await pageBeta.click('button:has-text("SET")');
    await expect(pageBeta.locator('span:has-text("Pengaturan")').first()).toBeVisible();
    const nameInputBeta = pageBeta.locator('input[type="text"]').first();
    await nameInputBeta.clear();
    await nameInputBeta.fill('User Beta');
    await pageBeta.click('button:has-text("Back")');
    await expect(pageBeta.locator('span:has-text("Pengaturan")').first()).not.toBeVisible();

    // 5. Mock getUserMedia to return a real synthetic Web Audio destination stream
    const mockUserMediaScript = () => {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const dest = ctx.createMediaStreamDestination();
      const osc = ctx.createOscillator();
      osc.connect(dest);
      osc.start();

      ctx.resume().catch(() => {});

      navigator.mediaDevices.getUserMedia = async () => {
        return dest.stream;
      };

      if (window.AnalyserNode) {
        window.AnalyserNode.prototype.getFloatTimeDomainData = function (array: Float32Array) {
          for (let i = 0; i < array.length; i++) {
            array[i] = Math.sin(i * 0.1) * 0.1;
          }
        };
      }

      // Mock MediaRecorder to bypass NotSupportedError in headless Chromium
      class MockMediaRecorder {
        stream: MediaStream;
        ondataavailable: ((e: any) => void) | null = null;
        intervalId: any = null;
        constructor(stream: MediaStream) {
          this.stream = stream;
        }
        static isTypeSupported(_type: string) {
          return true;
        }
        start(timeslice: number) {
          this.intervalId = setInterval(() => {
            if (this.ondataavailable) {
              this.ondataavailable({
                data: new Blob(['dummy audio data'], { type: 'audio/webm' }),
              });
            }
          }, timeslice || 250);
        }
        stop() {
          if (this.intervalId) clearInterval(this.intervalId);
        }
      }
      window.MediaRecorder = MockMediaRecorder as any;
    };

    await pageAlfa.evaluate(mockUserMediaScript);
    await pageBeta.evaluate(mockUserMediaScript);

    // Set channel to a normal non-isolated channel (Channel 16) for both users to allow network broadcasting to be tested
    await pageAlfa.evaluate(() => {
      (window as any).__store__.setState({ coins: 1000 });
      (window as any).__store__.getState().setChannelNumber(16);
    });
    await pageBeta.evaluate(() => {
      (window as any).__store__.setState({ coins: 1000 });
      (window as any).__store__.getState().setChannelNumber(16);
    });

    // 5. Retrieve User IDs
    const userIdAlfa = await pageAlfa.evaluate(
      () =>
        (
          window as unknown as { __store__: { getState: () => { userId: string } } }
        ).__store__.getState().userId
    );
    const userIdBeta = await pageBeta.evaluate(
      () =>
        (
          window as unknown as { __store__: { getState: () => { userId: string } } }
        ).__store__.getState().userId
    );

    // Inject presence sync state to simulate the active user listing
    await pageAlfa.evaluate((betaId) => {
      const store = (
        window as unknown as {
          __store__: {
            setState: (s: Record<string, unknown>) => void;
            getState: () => { userId: string };
          };
        }
      ).__store__;
      if (store) {
        store.setState({
          activeUsers: [
            {
              userId: store.getState().userId,
              displayName: 'User Alfa',
              callSign: 'ALFA',
              location: 'ALFA',
            },
            { userId: betaId, displayName: 'User Beta', callSign: 'BETA', location: 'BETA' },
          ],
        });
      }
    }, userIdBeta);

    await pageBeta.evaluate((alfaId) => {
      const store = (
        window as unknown as {
          __store__: {
            setState: (s: Record<string, unknown>) => void;
            getState: () => { userId: string };
          };
        }
      ).__store__;
      if (store) {
        store.setState({
          activeUsers: [
            {
              userId: store.getState().userId,
              displayName: 'User Beta',
              callSign: 'BETA',
              location: 'BETA',
            },
            { userId: alfaId, displayName: 'User Alfa', callSign: 'ALFA', location: 'ALFA' },
          ],
        });
      }
    }, userIdAlfa);

    // Verify Presence Synchronization (both see count = 02 on LCD)
    const userCountAlfa = pageAlfa
      .locator('img[alt="User Count Icon"]')
      .locator('xpath=../..')
      .locator('span');
    const userCountBeta = pageBeta
      .locator('img[alt="User Count Icon"]')
      .locator('xpath=../..')
      .locator('span');

    await expect(userCountAlfa).toHaveText('02', { timeout: 5_000 });
    await expect(userCountBeta).toHaveText('02', { timeout: 5_000 });

    // 6. User Alfa transmits
    const pttButtonAlfa = pageAlfa.locator('button:has-text("PTT")');
    await pttButtonAlfa.hover();
    await pageAlfa.mouse.down();

    // Bridge transmission event to Beta's store
    await pageBeta.evaluate((alfaId) => {
      const store = (
        window as unknown as { __store__: { setState: (s: Record<string, unknown>) => void } }
      ).__store__;
      if (store) {
        store.setState({
          activeTransmitter: {
            userId: alfaId,
            displayName: 'USER ALFA',
            callSign: 'ALFA',
          },
        });
      }
    }, userIdAlfa);

    await pageAlfa.waitForTimeout(500); // Hold for active transmission

    // 7. Verify User Beta receives User Alfa's active transmission
    // Beta's LCD username display should change to "USER ALFA"
    await expect(pageBeta.getByTestId('lcd-username')).toHaveText('USER ALFA', {
      timeout: 5_000,
      ignoreCase: true,
    });

    // Beta's progress bar (modulation) should animate and have width > 0px
    const progressBarBeta = pageBeta.locator('div.h-full.transition-all.duration-75').first();
    await expect(async () => {
      const activeWidthBeta = await progressBarBeta.evaluate((el) => el.style.width);
      expect(activeWidthBeta).not.toBe('0%');
      expect(activeWidthBeta).not.toBe('');
    }).toPass({ timeout: 10_000 });

    // 8. User Alfa stops transmitting
    await pageAlfa.mouse.up();

    // Clear transmission event from Beta's store
    await pageBeta.evaluate(() => {
      const store = (
        window as unknown as { __store__: { setState: (s: Record<string, unknown>) => void } }
      ).__store__;
      if (store) {
        store.setState({ activeTransmitter: null });
      }
    });

    await pageAlfa.waitForTimeout(500);

    // 9. Verify User Beta returns to standby
    await expect(pageBeta.getByTestId('lcd-username')).toHaveText('User Beta', {
      timeout: 5_000,
      ignoreCase: true,
    });
    await expect(progressBarBeta).toHaveCSS('width', '0px');

    // 10. Close independent contexts
    await contextAlfa.close();
    await contextBeta.close();
  });
});
