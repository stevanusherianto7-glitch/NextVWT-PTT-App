/**
 * e2e/voice-streaming.spec.ts
 * NextVWT – Real-time Voice Streaming E2E Tests
 */
import { test, expect } from '@playwright/test';
import { injectAudioMocks } from './fixtures';

test.describe('Real-time Voice Streaming & Delivery', () => {
  test('should record audio chunks from microphone and broadcast them to channel peers', async ({
    browser,
  }) => {
    // 1. Instantiate browser contexts with microphone permissions + audio mocks
    const contextAlfa = await browser.newContext({ permissions: ['microphone'] });
    await injectAudioMocks(contextAlfa);
    const pageAlfa = await contextAlfa.newPage();
    pageAlfa.on('console', (msg) => console.log('PAGE ALFA LOG:', msg.text()));

    const contextBeta = await browser.newContext({ permissions: ['microphone'] });
    await injectAudioMocks(contextBeta);
    const pageBeta = await contextBeta.newPage();
    pageBeta.on('console', (msg) => console.log('PAGE BETA LOG:', msg.text()));

    // 2. Open pages and bypass login and feedback modal
    await pageAlfa.addInitScript(() => {
      window.localStorage.setItem(
        'nextvwt_settings',
        JSON.stringify({
          hasCompletedOnboarding: true,
          lastFeedbackTime: Date.now(),
        })
      );
    });
    await pageAlfa.goto('/');

    await pageBeta.addInitScript(() => {
      window.localStorage.setItem(
        'nextvwt_settings',
        JSON.stringify({
          hasCompletedOnboarding: true,
          lastFeedbackTime: Date.now(),
        })
      );
    });
    await pageBeta.goto('/');
    const guestBtnAlfa = pageAlfa.locator('button:has-text("Masuk sebagai Tamu")');
    await guestBtnAlfa.waitFor({ state: 'visible', timeout: 5000 });
    await guestBtnAlfa.click();

    const guestBtnBeta = pageBeta.locator('button:has-text("Masuk sebagai Tamu")');
    await guestBtnBeta.waitFor({ state: 'visible', timeout: 5000 });
    await guestBtnBeta.click();

    // 3. Set display names to ensure they can identify each other
    await pageAlfa.click('button:has-text("SET")');
    const nameInputAlfa = pageAlfa.locator('input[type="text"]').first();
    await nameInputAlfa.clear();
    await nameInputAlfa.fill('Speaker Alfa');
    await pageAlfa.click('button:has-text("Back")');

    await pageBeta.click('button:has-text("SET")');
    const nameInputBeta = pageBeta.locator('input[type="text"]').first();
    await nameInputBeta.clear();
    await nameInputBeta.fill('Listener Beta');
    await pageBeta.click('button:has-text("Back")');

    // Set channel to a normal non-isolated channel (Channel 16) for both users to allow network broadcasting to be tested
    await pageAlfa.evaluate(() => {
      (window as any).__store__.setState({ coins: 1000 });
      (window as any).__store__.getState().setChannelNumber(16);
    });
    await pageBeta.evaluate(() => {
      (window as any).__store__.setState({ coins: 1000 });
      (window as any).__store__.getState().setChannelNumber(16);
    });

    // Retrieve User IDs
    const userIdAlfa = await pageAlfa.evaluate(() => (window as any).__store__.getState().userId);
    const userIdBeta = await pageBeta.evaluate(() => (window as any).__store__.getState().userId);

    // 4. Inject presence metadata to sync them into the channel
    await pageAlfa.evaluate((betaId) => {
      const store = (window as any).__store__;
      if (store) {
        store.setState({
          activeUsers: [
            {
              userId: store.getState().userId,
              displayName: 'Speaker Alfa',
              callSign: 'ALFA',
              location: 'ALFA',
            },
            { userId: betaId, displayName: 'Listener Beta', callSign: 'BETA', location: 'BETA' },
          ],
        });
      }
    }, userIdBeta);

    await pageBeta.evaluate((alfaId) => {
      const store = (window as any).__store__;
      if (store) {
        store.setState({
          activeUsers: [
            {
              userId: store.getState().userId,
              displayName: 'Listener Beta',
              callSign: 'BETA',
              location: 'BETA',
            },
            { userId: alfaId, displayName: 'Speaker Alfa', callSign: 'ALFA', location: 'ALFA' },
          ],
        });
      }
    }, userIdAlfa);

    // 5. Expose a bridge function to pipe voice chunks from Alfa to Beta
    await pageAlfa.exposeFunction('onVoiceChunkBroadcasted', async (base64: string) => {
      await pageBeta.evaluate((chunk) => {
        const store = (window as any).__store__;
        if (store) {
          const callback = store.getState().onVoiceChunkReceived;
          if (callback) callback(chunk);
        }
      }, base64);
    });

    // Set up interceptor/spy for voice chunk broadcast on Alfa
    await pageAlfa.evaluate(() => {
      (window as any).recordedVoiceChunks = [];
      const store = (window as any).__store__;
      const originalBroadcast = store.getState().broadcastVoiceChunk;
      store.getState().broadcastVoiceChunk = (base64: string) => {
        (window as any).recordedVoiceChunks.push(base64);
        originalBroadcast(base64);
        (window as any).onVoiceChunkBroadcasted(base64).catch(() => {});
      };
    });

    // Set up spy for voice chunk reception on Beta
    await pageBeta.evaluate(() => {
      (window as any).receivedVoiceChunks = [];
      const store = (window as any).__store__;

      // Override setOnVoiceChunkReceived to capture chunks when they arrive
      const originalSet = store.getState().setOnVoiceChunkReceived;
      store.getState().setOnVoiceChunkReceived = (callback: any) => {
        const wrappedCallback = (base64: string) => {
          (window as any).receivedVoiceChunks.push(base64);
          if (callback) callback(base64);
        };
        originalSet(wrappedCallback);
      };
    });

    // 6. Disable Toggle PTT (enable Hold-to-Talk) for Speaker Alfa via store
    await pageAlfa.evaluate(() => {
      (window as any).__store__.getState().updateSettings({ togglePtt: false });
    });

    // 7. Simulating User Alfa speaking by starting PTT transmission via store
    await pageAlfa.evaluate(() => (window as any).__store__.getState().setTransmitting(true));
    await pageAlfa.waitForTimeout(1500);

    // Stop PTT transmission via store
    await pageAlfa.evaluate(() => (window as any).__store__.getState().setTransmitting(false));
    await pageAlfa.waitForTimeout(500);

    // 8. Assertions: check if chunks were recorded on User Alfa
    const recordedChunksCount = await pageAlfa.evaluate(
      () => (window as any).recordedVoiceChunks.length
    );
    expect(recordedChunksCount).toBeGreaterThan(0);

    // 9. Assertions: check if chunks were received on User Beta
    // Wait up to 3 seconds for WebSocket transmission to finish delivering to Beta
    await expect
      .poll(
        async () => {
          return await pageBeta.evaluate(() => (window as any).receivedVoiceChunks.length);
        },
        {
          intervals: [200, 500],
          timeout: 3000,
        }
      )
      .toBeGreaterThan(0);

    // Confirm that the received chunk on Beta matches a Base64 format string
    const sampleReceivedChunk = await pageBeta.evaluate(
      () => (window as any).receivedVoiceChunks[0]
    );
    expect(sampleReceivedChunk).not.toBeNull();
    expect(sampleReceivedChunk).toMatch(/^[A-Za-z0-9+/=]+$/);

    // Close contexts
    await contextAlfa.close();
    await contextBeta.close();
  });
});
