#!/usr/bin/env bash
# dev-livekit.sh — One-command dev stack untuk NextVWT SFU (LiveKit + Supabase Edge Function)
#
# Yang dijalankan:
#   1. Docker: LiveKit SFU lokal  (ws://localhost:7880)  -> docker-compose.livekit.yml
#   2. Supabase: local stack      (DB + Auth + Functions) -> npx supabase start
#   3. Supabase: serve livekit-token (token generator)   -> npx supabase functions serve
#
# Prasyarat:
#   - Docker Desktop running (Engine up)
#   - npx supabase CLI tersedia
#   - .env sudah copy dari .env.example DAN VITE_LIVEKIT_URL=ws://localhost:7880
#
# Cara: bash scripts/dev-livekit.sh   (atau: ./scripts/dev-livekit.sh)

set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> [1/3] Start LiveKit SFU container..."
docker compose -f docker-compose.livekit.yml up -d
docker ps --filter name=nextvwt-livekit --format "    -> {{.Names}} {{.Status}}"

echo "==> [2/3] Start Supabase local stack (DB + Auth)..."
# 'supabase start' hanya perlu sekali; jika sudah jalan, lewati.
if npx supabase status >/dev/null 2>&1; then
  echo "    Supabase sudah jalan, lewati start."
else
  npx supabase start
fi

echo "==> [3/3] Serve Edge Function livekit-token (token generator)..."
echo "    Buka terminal lain untuk menjalankan app: pnpm dev"
echo "    Tekan Ctrl+C untuk menghentikan serve (Supabase stack tetap jalan)."
npx supabase functions serve livekit-token --no-verify-jwt
