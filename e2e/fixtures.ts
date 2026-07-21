/**
 * e2e/fixtures.ts
 * Shared Playwright fixtures for E2E tests.
 *
 * Provides `audioContext` fixture that injects getUserMedia / MediaRecorder /
 * AudioContext mocks BEFORE page load via addInitScript, so hooks capture
 * the mocked APIs during initialization.
 */
import { test as base, type BrowserContext } from '@playwright/test';

/** The mock script injected via addInitScript before page load. */
const AUDIO_MOCK_SCRIPT = `
(() => {
  // Avoid double-patching
  if (window.__audioMocked) return;
  window.__audioMocked = true;

  // ── Mock AudioContext (headless Chromium may not support real Web Audio) ──
  const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;
  if (OriginalAudioContext) {
    const origCreateMediaStreamDestination = OriginalAudioContext.prototype.createMediaStreamDestination;
    OriginalAudioContext.prototype.createMediaStreamDestination = function () {
      try {
        return origCreateMediaStreamDestination.call(this);
      } catch {
        // Fallback: return a minimal mock
        return { stream: new MediaStream(), connect() {}, disconnect() {} };
      }
    };
  }

  // ── Mock getUserMedia ──
  // Replace directly (not wrap) so tests can override with their own stubs.
  navigator.mediaDevices.getUserMedia = async (constraints) => {
    // Create a synthetic stream via AudioContext + oscillator
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const dest = ctx.createMediaStreamDestination();
    const osc = ctx.createOscillator();
    osc.connect(dest);
    osc.start();
    ctx.resume().catch(() => {});
    return dest.stream;
  };

  // ── Mock MediaRecorder ──
  // Always replace – native MediaRecorder in headless Chromium fails with synthetic streams.
  {
    class MockMediaRecorder {
      stream;
      ondataavailable = null;
      onstart = null;
      onstop = null;
      _intervalId = null;
      state = 'inactive';

      constructor(stream) {
        this.stream = stream;
      }

      static isTypeSupported() { return true; }

      start(timeslice) {
        this.state = 'recording';
        if (this.onstart) this.onstart(new Event('start'));
        this._intervalId = setInterval(() => {
          if (this.ondataavailable && this.state === 'recording') {
            this.ondataavailable({ data: new Blob(['mock-audio'], { type: 'audio/webm' }) });
          }
        }, timeslice || 250);
      }

      stop() {
        this.state = 'inactive';
        if (this._intervalId) clearInterval(this._intervalId);
        if (this.onstop) this.onstop(new Event('stop'));
      }

      pause() { this.state = 'paused'; }
      resume() { this.state = 'recording'; }
      requestData() {}
    }
    window.MediaRecorder = MockMediaRecorder;
  }

  // ── Mock AnalyserNode for RMS visualizer ──
  if (window.AnalyserNode) {
    const origGetFloatTimeDomainData = AnalyserNode.prototype.getFloatTimeDomainData;
    AnalyserNode.prototype.getFloatTimeDomainData = function (array) {
      try {
        origGetFloatTimeDomainData.call(this, array);
      } catch {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.sin(i * 0.1) * 0.1;
        }
      }
    };
  }
})();
`;

export async function injectAudioMocks(context: BrowserContext) {
  await context.addInitScript(AUDIO_MOCK_SCRIPT);
}

/**
 * Extended test fixture that automatically injects audio mocks into every
 * new browser context. Use `test` from this file instead of @playwright/test.
 */
export const test = base.extend<{ audioContext: BrowserContext }>({
  audioContext: async ({ browser }, use) => {
    const context = await browser.newContext({ permissions: ['microphone'] });
    await injectAudioMocks(context);
    await use(context);
    await context.close();
  },
});

export { expect } from '@playwright/test';
