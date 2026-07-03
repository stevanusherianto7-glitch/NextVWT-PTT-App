// @ts-ignore
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://nextvwt.vercel.app',
  'https://nextvwt.id',
  'https://www.nextvwt.id',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

async function verifySignature(
  secret: string,
  payloadString: string,
  providedSignature: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyBuf = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyBuf,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const payloadBuf = encoder.encode(payloadString);
  const sigBuf = await crypto.subtle.sign("HMAC", key, payloadBuf);
  
  const sigArray = Array.from(new Uint8Array(sigBuf));
  const calculatedSig = sigArray.map(b => b.toString(16).padStart(2, "0")).join("");
  
  return calculatedSig.toLowerCase() === providedSignature.toLowerCase();
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const webhookSecret = Deno.env.get('GATEWAY_WEBHOOK_SECRET') ?? 'dummy_webhook_secret_key_12345';

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { userId, amountKoin, amountRupiah, referenceId, signature } = body;

    if (!userId || !amountKoin || !amountRupiah || !referenceId || !signature) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Hitung signature lokal untuk memvalidasi webhook
    const payloadString = `${userId}:${amountKoin}:${amountRupiah}:${referenceId}`;
    const isValid = await verifySignature(webhookSecret, payloadString, signature);

    if (!isValid) {
      console.warn(`[SECURITY] Invalid signature received for reference ${referenceId} from user ${userId}`);
      return new Response(JSON.stringify({ error: 'Invalid signature verification failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Inisialisasi Supabase Admin Client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Cek apakah transaksi dengan referenceId sudah diproses untuk mencegah double spending
    const { data: existingTx, error: checkTxError } = await supabaseAdmin
      .from('payment_transactions')
      .select('status')
      .eq('reference_id', referenceId)
      .maybeSingle();

    if (checkTxError) {
      throw new Error(`Failed to check transaction: ${checkTxError.message}`);
    }

    if (existingTx && existingTx.status === 'success') {
      return new Response(JSON.stringify({ ok: true, message: 'Transaction already processed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Jalankan ACID Ledger Update:
    // 1. Simpan/Update data transaksi ke 'payment_transactions'
    const { error: insertError } = await supabaseAdmin
      .from('payment_transactions')
      .upsert({
        user_id: userId,
        amount_koin: amountKoin,
        amount_rupiah: amountRupiah,
        status: 'success',
        reference_id: referenceId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'reference_id' });

    if (insertError) {
      throw new Error(`Failed to log transaction ledger: ${insertError.message}`);
    }

    // 2. Ambil koin profil saat ini
    const { data: profile, error: getProfileError } = await supabaseAdmin
      .from('user_profiles_extended')
      .select('coins')
      .eq('user_id', userId)
      .maybeSingle();

    if (getProfileError) {
      throw new Error(`Failed to get user profile: ${getProfileError.message}`);
    }

    const currentCoins = profile?.coins || 0;
    const newCoins = currentCoins + Number(amountKoin);

    // 3. Update saldo koin di user_profiles_extended
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles_extended')
      .update({
        coins: newCoins,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      // Rollback status transaksi ke failed demi integritas data
      await supabaseAdmin
        .from('payment_transactions')
        .update({ status: 'failed' })
        .eq('reference_id', referenceId);
      throw new Error(`Failed to update user profile coins: ${updateError.message}`);
    }

    console.log(`[SUCCESS] Credited ${amountKoin} coins to user ${userId} for transaction ref ${referenceId}`);

    return new Response(JSON.stringify({ ok: true, message: 'Coins credited successfully' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[ERROR] Webhook error: ${message}`);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
