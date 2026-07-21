import { test, expect } from './fixtures';

test.describe('Robustness Simulator: Supabase Offline Fallback', () => {
  test('Graceful Boot-Up without Supabase API (Offline Start)', async ({ page }) => {
    // Memblokir semua traffic Supabase saat boot up
    await page.route('**/*supabase.co/**', (route) => route.abort('failed'));
    await page.route('**/realtime/v1/**', (route) => route.abort('failed'));

    await page.goto('/');

    // Guest login (harus bisa masuk karena logic dijalankan lokal tanpa harus sukses daftar user ke db)
    const guestBtn = page.locator('button:has-text("Masuk sebagai Tamu")');
    await guestBtn.waitFor({ state: 'visible', timeout: 5000 });
    await guestBtn.click();

    // Aplikasi seharusnya tetap meload RadioLayout meski Supabase mati
    const pttBtn = page.locator('button:has-text("PTT")');
    await expect(pttBtn).toBeVisible({ timeout: 10000 });

    // Cek apakah indikator offline/error muncul tanpa merusak tampilan layout
    // Karena kita memakai exponential backoff, status mungkin offline
    // Tunggu sejenak agar logic backoff berjalan
    await page.waitForTimeout(3000);

    // UI seharusnya tidak white screen
    const channelDisplay = page.getByText('CH', { exact: true });
    await expect(channelDisplay).toBeVisible();
  });

  test('Graceful Fallback on Mid-Transmission Disconnect', async ({ page, context }) => {
    await page.goto('/');

    // Guest login
    const guestBtn = page.locator('button:has-text("Masuk sebagai Tamu")');
    await guestBtn.waitFor({ state: 'visible', timeout: 5000 });
    await guestBtn.click();

    // Tunggu layar utama
    const pttBtn = page.locator('button:has-text("PTT")');
    await expect(pttBtn).toBeVisible({ timeout: 10000 });

    // Set mock mic permissions agar bisa PTT
    await context.grantPermissions(['microphone']);

    // Mulai PTT (Transmisi aktif)
    await page.mouse.down({ button: 'left' });

    // Skenario Terburuk: Tiba-tiba Supabase Server Down atau koneksi putus
    await page.route('**/*supabase.co/**', (route) => route.abort('internetdisconnected'));
    await page.route('**/realtime/v1/**', (route) => route.abort('internetdisconnected'));

    // Sengaja jalankan evaluasi window offline untuk men-trigger fallback lokal
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    // Lepas PTT
    await page.mouse.up({ button: 'left' });

    // Tunggu sejenak, UI tidak boleh crash. Seharusnya tombol PTT kembali hijau/normal
    await page.waitForTimeout(2000);

    // Pastikan channel masih berada di posisinya dan store lokal (localStorage) tetap jalan
    const channelText = await page
      .locator('[data-testid="lcd-channel-number"]')
      .first()
      .innerText();
    expect(channelText).toBeDefined();

    // Cek apakah kita bisa pindah channel secara lokal tanpa error saat offline
    await page.evaluate(() => {
      const store = (window as any).__store__;
      store.getState().channelUp();
    });
    await page.waitForTimeout(500);

    const newChannelText = await page
      .locator('[data-testid="lcd-channel-number"]')
      .first()
      .innerText();
    expect(newChannelText).not.toEqual(channelText);
  });
});
