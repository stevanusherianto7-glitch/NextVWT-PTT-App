# TURN Credentials Edge Function

## Environment Variables (set via Supabase Dashboard → Project Settings → Edge Functions)

| Variable | Description | Example |
|---|---|---|
| `TURN_PROVIDER` | Provider: `static`, `metered`, atau `twilio` | `static` |
| `COTURN_URL` | TURN server URL (Biznet Gio VPS) | `turn:123.456.789.0:3478` |
| `COTURN_USERNAME` | TURN username dari /etc/turnserver.conf | `nextvwt` |
| `COTURN_CREDENTIAL` | TURN password dari /etc/turnserver.conf | `your-secret-password` |
| `SUPABASE_URL` | Auto-injected by Supabase | — |
| `SUPABASE_ANON_KEY` | Auto-injected by Supabase | — |
| `SUPABASE_SERVICE_ROLE_KEY` | Set manually, needed for rate limiting | — |

## Testing TURN server dari browser

1. Buka https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
2. Hapus server default, tambahkan:
   - TURN URL: `turn:YOUR_BIZNET_GIO_IP:3478`
   - Username dan password dari turnserver.conf
3. Klik "Gather candidates" — pastikan muncul kandidat type `relay`
