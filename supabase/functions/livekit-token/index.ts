// Supabase Edge Function: livekit-token
// Meng-generate LiveKit access token di SERVER (API secret TIDAK pernah ke client).
//
// Deploy:  npx supabase functions deploy livekit-token
// Local:   npx supabase functions serve livekit-token --no-verify-jwt
//
// App memanggil via supabase.functions.invoke('livekit-token', { body: { channel } })
// yang ditangani SDK (bukan raw fetch) → CORS ditangani Supabase.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AccessToken } from 'https://esm.sh/livekit-server-sdk@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TokenRequest {
  channel?: number;
}

Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth: hanya user terautentikasi yang boleh minta token ──
    const authHeader = req.headers.get('authorization') ?? '';
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { authorization: authHeader } } }
    );
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
    if (!apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({ error: 'LiveKit env belum diset di Supabase' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = (await req.json()) as TokenRequest;
    const channel = body.channel ?? 1;
    const room = `ptt-room-${channel}`;
    // identity diambil dari user terautentikasi (tidak bisa di-spoof dari client)
    const identity = user.id;
    const displayName =
      (user.user_metadata?.full_name as string) || user.email || user.id;

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: displayName,
      ttl: '2h',
    });
    at.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return new Response(JSON.stringify({ token, room, identity }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
