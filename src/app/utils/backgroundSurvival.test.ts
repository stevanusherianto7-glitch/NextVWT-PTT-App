import { describe, it, expect, vi, beforeEach } from 'vitest';

const nativePlugin = {
  startService: vi.fn(() => Promise.resolve({ status: 'started' })),
  stopService: vi.fn(() => Promise.resolve({ status: 'stopped' })),
  checkBatteryWhitelist: vi.fn(() => Promise.resolve({ isWhitelisted: true })),
  requestBatteryWhitelist: vi.fn(() => Promise.resolve({ status: 'granted' })),
};

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => 'web'),
  },
  registerPlugin: vi.fn(() => nativePlugin),
}));

// Import AFTER vi.mock so module captures our nativePlugin
const { Capacitor } = await import('@capacitor/core');
const {
  startBackgroundService,
  stopBackgroundService,
  checkBatteryWhitelist,
  requestBatteryWhitelist,
} = await import('./backgroundSurvival');

describe('backgroundSurvival – non-native (web/jsdom)', () => {
  beforeEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    nativePlugin.startService.mockClear();
    nativePlugin.stopService.mockClear();
    nativePlugin.checkBatteryWhitelist.mockClear();
    nativePlugin.requestBatteryWhitelist.mockClear();
  });

  it('startBackgroundService is a no-op on web', async () => {
    await expect(startBackgroundService('Saluran 100')).resolves.toBeUndefined();
    expect(nativePlugin.startService).not.toHaveBeenCalled();
  });

  it('stopBackgroundService is a no-op on web', async () => {
    await expect(stopBackgroundService()).resolves.toBeUndefined();
    expect(nativePlugin.stopService).not.toHaveBeenCalled();
  });

  it('checkBatteryWhitelist returns true on web', async () => {
    await expect(checkBatteryWhitelist()).resolves.toBe(true);
  });

  it('requestBatteryWhitelist returns not_native on web', async () => {
    await expect(requestBatteryWhitelist()).resolves.toBe('not_native');
  });
});

describe('backgroundSurvival – native (Android)', () => {
  beforeEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    nativePlugin.startService.mockClear();
    nativePlugin.stopService.mockClear();
    nativePlugin.checkBatteryWhitelist.mockClear();
    nativePlugin.requestBatteryWhitelist.mockClear();
  });

  it('startBackgroundService calls native plugin', async () => {
    await startBackgroundService('Saluran 100');
    expect(nativePlugin.startService).toHaveBeenCalledWith({ channelInfo: 'Saluran 100' });
  });

  it('stopBackgroundService calls native plugin', async () => {
    await stopBackgroundService();
    expect(nativePlugin.stopService).toHaveBeenCalled();
  });

  it('checkBatteryWhitelist returns whitelist status', async () => {
    await expect(checkBatteryWhitelist()).resolves.toBe(true);
    expect(nativePlugin.checkBatteryWhitelist).toHaveBeenCalled();
  });

  it('requestBatteryWhitelist returns status', async () => {
    await expect(requestBatteryWhitelist()).resolves.toBe('granted');
    expect(nativePlugin.requestBatteryWhitelist).toHaveBeenCalled();
  });
});
