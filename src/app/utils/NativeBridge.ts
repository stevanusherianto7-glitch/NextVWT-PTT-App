import { registerPlugin } from '@capacitor/core';

/**
 * Antarmuka Plugin Capacitor untuk modul Native NextVWT.
 * Ini menjadi jembatan antara kode React/TypeScript (Web) dengan modul native Kotlin.
 */
export interface NextVWTNativePlugin {
  // PTT Floor Control
  requestPTT(options: { userId: string; role: string }): Promise<{ granted: boolean; position?: number }>;
  releasePTT(options: { userId: string }): Promise<{ success: boolean }>;

  // Audio Codec & AI
  initCodecEngine(): Promise<{ success: boolean }>;
  setCodec(options: { codec: 'OPUS' | 'CODEC2' }): Promise<{ success: boolean }>;

  // Financial & Wallet
  createQRISInvoice(options: { amount: number; description: string }): Promise<{ invoiceId: string; qrisData: string }>;
  getWalletBalance(): Promise<{ balance: number }>;

  // ROIP Gateway
  setRadioPTTState(options: { active: boolean }): Promise<{ success: boolean; locked?: boolean }>;
}

// Inisialisasi Plugin Capacitor
// Secara otomatis akan menggunakan implementasi native di Android/iOS,
// atau melempar NotImplementedError di Web jika tidak ada implementasi web.
export const NextVWTNative = registerPlugin<NextVWTNativePlugin>('NextVWTNative');
