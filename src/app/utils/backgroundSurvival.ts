import { Capacitor, registerPlugin } from '@capacitor/core';

interface BackgroundSurvivalPlugin {
  startService(options: { channelInfo: string }): Promise<{ status: string }>;
  stopService(): Promise<{ status: string }>;
  checkBatteryWhitelist(): Promise<{ isWhitelisted: boolean }>;
  requestBatteryWhitelist(): Promise<{ status: string }>;
}

const BackgroundSurvival = registerPlugin<BackgroundSurvivalPlugin>('BackgroundSurvival');

/**
 * Memulai Foreground Service pada platform Android native.
 */
export async function startBackgroundService(channelInfo: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await BackgroundSurvival.startService({ channelInfo });
    console.warn('[BackgroundService] Service started successfully.');
  } catch (err) {
    console.error('[BackgroundService] Failed to start service:', err);
  }
}

/**
 * Mematikan Foreground Service pada platform Android native.
 */
export async function stopBackgroundService(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await BackgroundSurvival.stopService();
    console.warn('[BackgroundService] Service stopped successfully.');
  } catch (err) {
    console.error('[BackgroundService] Failed to stop service:', err);
  }
}

/**
 * Memeriksa apakah aplikasi terdaftar dalam pengecualian optimasi baterai.
 */
export async function checkBatteryWhitelist(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const res = await BackgroundSurvival.checkBatteryWhitelist();
    return res.isWhitelisted;
  } catch (err) {
    console.error('[BackgroundService] Failed to check battery whitelist:', err);
    return false;
  }
}

/**
 * Meminta pengguna menonaktifkan optimasi baterai untuk NextVWT.
 */
export async function requestBatteryWhitelist(): Promise<string> {
  if (!Capacitor.isNativePlatform()) return 'not_native';
  try {
    const res = await BackgroundSurvival.requestBatteryWhitelist();
    console.warn('[BackgroundService] Battery whitelist requested:', res.status);
    return res.status;
  } catch (err) {
    console.error('[BackgroundService] Failed to request battery whitelist:', err);
    return 'error';
  }
}
