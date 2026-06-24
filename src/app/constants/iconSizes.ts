/**
 * ICON SIZES — Source of Truth
 *
 * Ukuran piksel aktual (width x height) dari setiap file ikon moderasi
 * setelah melalui proses tight-crop via Python (Pillow).
 *
 * JANGAN ubah nilai-nilai ini sembarangan. Jika file PNG diproses ulang
 * (re-extract / re-crop), jalankan `check_all_sizes.py` dan perbarui
 * konstanta di sini agar tetap sinkron.
 *
 * Ukuran render CSS yang dipakai di UI (LCDPanel, UserListModal, dll.)
 * harus SELALU mengacu pada konstanta ICON_RENDER_SIZE_* di bawah,
 * bukan dikodekan langsung sebagai angka ad-hoc di komponen.
 */

// ─── Ukuran Piksel Aktual File PNG ────────────────────────────────────────────
export const ICON_PIXEL_SIZES = {
  voice:          { w: 49, h: 46 },   // icon_voice.png          — single user / voice
  username:       { w: 49, h: 46 },   // icon_username.png       — alias dari voice
  moderator:      { w: 43, h: 41 },   // icon_moderator.png
  operator:       { w: 41, h: 39 },   // icon_operator.png
  noc:            { w: 41, h: 39 },   // icon_noc.png
  silent:         { w: 38, h: 37 },   // icon_silent.png
  controlled:     { w: 42, h: 42 },   // icon_controlled.png
  wait:           { w: 47, h: 44 },   // icon_wait.png
  waitControlled: { w: 52, h: 52 },   // icon_wait_controlled.png
} as const;

// ─── Ukuran Render CSS ────────────────────────────────────────────────────────

/**
 * Ukuran ikon di LCD Panel (pojok kiri atas — single user icon).
 * Harus sama dengan ICON_LCD_TWIN_SIZE agar proporsional.
 */
export const ICON_LCD_SINGLE_SIZE = 38; // px — setara dengan twin user icon

/**
 * Ukuran ikon twin user (icon_operator_otomatis) di LCD Panel (pojok kanan bawah).
 */
export const ICON_LCD_TWIN_SIZE = 40;   // px — h-[40px] w-[38px] di LCDPanel.tsx

/**
 * Ukuran badge ikon moderasi di UserListModal (overlay sudut kanan bawah avatar).
 */
export const ICON_BADGE_SIZE = 20;      // px — w-[20px] h-[20px] di UserListModal.tsx
