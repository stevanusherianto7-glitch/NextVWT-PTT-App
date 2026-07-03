-- NEXTVWT — DATABASE MIGRATION SYSTEM MODERASI SEC-04
-- Tanggal: 29 Juni 2026
-- Relaksasi kebijakan RLS untuk channel_moderation_logs agar pengisian log dari client selalu berhasil

-- 1. Hapus kebijakan RLS insert yang membatasi pengisian log
DROP POLICY IF EXISTS "Moderators can insert logs" ON public.channel_moderation_logs;
DROP POLICY IF EXISTS "Logs insert service role only" ON public.channel_moderation_logs;
DROP POLICY IF EXISTS "Only system can insert logs" ON public.channel_moderation_logs;

-- 2. Buat kebijakan baru yang memperbolehkan siapa pun menulis log
-- Hal ini penting agar pengoperasian client-side (seperti dari panel UserListModal atau PrivateChannelPanel)
-- dapat dicatat di database walaupun role user belum tersinkronisasi di sisi database.
CREATE POLICY "Anyone can insert logs" ON public.channel_moderation_logs
  FOR INSERT WITH CHECK (true);
