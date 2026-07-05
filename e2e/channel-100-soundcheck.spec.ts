import { test, expect } from '@playwright/test';

test.describe('Channel 100 Sound Check (Parrot Echo Test)', () => {
  test('should record audio and play it back locally when on Channel 100', async ({
    page,
    context,
  }) => {
    // 1. Grant microphone permission
    await context.grantPermissions(['microphone']);

    // 2. Add Init Script to mock Supabase Auth session in localStorage (bypassing LoginGate)
    await page.addInitScript(() => {
      const fakeSession = {
        access_token: 'mock-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        user: {
          id: 'e2e-test-user-id',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'e2e@nextvwt.local',
          email_confirmed_at: '2026-06-10T12:00:00Z',
          phone: '',
          confirmed_at: '2026-06-10T12:00:00Z',
          last_sign_in_at: '2026-06-10T12:00:00Z',
          app_metadata: {
            provider: 'google',
            providers: ['google'],
          },
          user_metadata: {
            full_name: 'E2E Tester',
            avatar_url: '',
          },
          identities: [],
          created_at: '2026-06-10T12:00:00Z',
          updated_at: '2026-06-10T12:00:00Z',
        },
        expires_at: 9999999999,
      };

      const originalGetItem = window.localStorage.getItem;
      window.localStorage.getItem = function (key) {
        if (key && key.includes('auth-token')) {
          return JSON.stringify(fakeSession);
        }
        return originalGetItem.call(window.localStorage, key);
      };
    });

    // 3. Open application page
    await page.goto('/');

    // 4. Wait for D-pad control buttons/SET to appear (ensuring application is booted and login is bypassed)
    await page.waitForSelector('button:has-text("SET")', { timeout: 15000 });

    // 5. Disable toggle PTT (enable hold-to-talk) via store and set coins + channel to 100
    await page.evaluate(() => {
      const store = (window as any).__store__;
      store.setState({ coins: 1000 });
      store.getState().updateSettings({ togglePtt: false });
      store.getState().setChannelNumber(100);
    });

    // Verify LCD display shows Channel 100
    const channelNumberText = page.locator('[data-testid="lcd-channel-number"]').first();
    await expect(channelNumberText).toHaveText('100');

    // 6. Mock getUserMedia to supply a synthetic Web Audio stream and mock MediaRecorder
    await page.evaluate(() => {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const dest = ctx.createMediaStreamDestination();
      const osc = ctx.createOscillator();
      osc.connect(dest);
      osc.start();

      navigator.mediaDevices.getUserMedia = async () => {
        return dest.stream;
      };

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
    });

    // 7. Inject spy on AudioContext.prototype.decodeAudioData to detect playbacks
    await page.evaluate(() => {
      (window as any).decodedChunks = [];
      const originalDecode = AudioContext.prototype.decodeAudioData;
      AudioContext.prototype.decodeAudioData = function (arrayBuffer: ArrayBuffer) {
        (window as any).decodedChunks.push(arrayBuffer);
        return originalDecode.call(this, arrayBuffer);
      };
    });

    // 8. Start transmitting (PTT down)
    const pttButton = page.locator('button:has-text("PTT")');
    await pttButton.hover();
    await pttButton.dispatchEvent('mousedown');

    // Wait 1.5 seconds for recording to capture chunk(s)
    await page.waitForTimeout(1500);

    // 9. Stop transmitting (PTT up)
    await pttButton.dispatchEvent('mouseup');

    // 10. Wait up to 3 seconds for the 350ms playback delay and check if decodeAudioData was called
    await expect
      .poll(
        async () => {
          return await page.evaluate(() => (window as any).decodedChunks.length);
        },
        {
          intervals: [200, 500],
          timeout: 4000,
        }
      )
      .toBeGreaterThan(0);

    // Confirm that the recorded/played back array buffers exist
    const playedChunksCount = await page.evaluate(() => (window as any).decodedChunks.length);
    console.log(
      `Successfully verified parrot echo test: played back ${playedChunksCount} audio chunks.`
    );
    expect(playedChunksCount).toBeGreaterThan(0);
  });
});
