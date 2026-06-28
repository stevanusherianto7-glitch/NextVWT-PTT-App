// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { MeteredProvider } from "./providers/metered.ts";
import { TwilioProvider } from "./providers/twilio.ts";
import { StaticProvider } from "./providers/static.ts";

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://nextvwt.vercel.app',
  'https://nextvwt.id',
  'https://www.nextvwt.id',
  'https://app.nextvwt.id',
  'https://YOUR_BIZNET_GIO_DOMAIN_OR_IP',
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
];

function handleCors(req: Request): Response | { headers: Record<string, string> } {
  const origin = req.headers.get('Origin');
  
  if (!origin) {
    return {
      headers: {
        'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0],
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Vary': 'Origin',
      }
    };
  }

  if (!ALLOWED_ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return {
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Vary': 'Origin',
    }
  };
}

serve(async (req: Request) => {
  const startTime = Date.now();
  const corsResult = handleCors(req);
  
  if (corsResult instanceof Response) {
    return corsResult;
  }
  const corsHeaders = corsResult.headers;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verify User Session (Auth Required)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Rate Limiting (10 requests / 10 minutes per user - Persistent in Database)
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch current rate limit record
    const { data: rateData, error: rateError } = await supabaseAdmin
      .from('turn_rate_limits')
      .select('count, reset_time')
      .eq('user_id', user.id)
      .maybeSingle();

    if (rateError) {
      console.error('[TURN_LIMIT_ERROR] Failed to query turn_rate_limits:', rateError.message);
    }

    let count = 1;
    let resetTime = now + tenMinutes;
    let limitExceeded = false;

    if (rateData) {
      const dbResetTime = Number(rateData.reset_time);
      if (now < dbResetTime) {
        count = rateData.count + 1;
        resetTime = dbResetTime;
        if (rateData.count >= 10) {
          limitExceeded = true;
        }
      }
    }

    if (limitExceeded) {
      console.warn(JSON.stringify({
        event: 'TURN_CREDENTIALS_RATELIMIT',
        user_id: user.id,
        status: 'failed',
        reason: 'Too many requests'
      }));
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upsert rate limit record (fails gracefully if DB has issues)
    const { error: upsertError } = await supabaseAdmin
      .from('turn_rate_limits')
      .upsert({ user_id: user.id, count, reset_time: resetTime });

    if (upsertError) {
      console.error('[TURN_LIMIT_ERROR] Failed to upsert turn_rate_limits:', upsertError.message);
    }

    // 3. Determine Provider
    const providerName = Deno.env.get('TURN_PROVIDER')?.toLowerCase() || 'metered';
    let provider;

    switch (providerName) {
      case 'twilio':
        provider = new TwilioProvider();
        break;
      case 'static':
        provider = new StaticProvider();
        break;
      case 'metered':
      default:
        provider = new MeteredProvider();
        break;
    }

    // 4. Fetch Credentials
    let iceServers;
    try {
      iceServers = await provider.getIceServers();
    } catch (providerError) {
      const errMsg = providerError instanceof Error ? providerError.message : String(providerError);
      console.error(`[TURN_ERROR] Provider ${providerName} failed:`, errMsg);
      // Fallback to static if main provider fails
      const staticProvider = new StaticProvider();
      iceServers = await staticProvider.getIceServers();
    }

    const latency = Date.now() - startTime;
    
    // 5. Observability Logging
    console.log(JSON.stringify({
      event: 'TURN_CREDENTIALS_REQUEST',
      user_id: user.id,
      provider: providerName,
      status: 'success',
      latency_ms: latency
    }));

    return new Response(JSON.stringify({ iceServers }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    console.error(JSON.stringify({
      event: 'TURN_CREDENTIALS_REQUEST',
      status: 'failed',
      latency_ms: latency,
      error: error instanceof Error ? error.message : 'Unknown error'
    }));

    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
