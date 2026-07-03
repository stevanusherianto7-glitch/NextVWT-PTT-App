// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://nextvwt.vercel.app',
  'https://nextvwt.id',
  'https://www.nextvwt.id',
  'https://app.nextvwt.id',
  'capacitor://localhost',
  'http://localhost',
];

function handleCors(req: Request): Response | { headers: Record<string, string> } {
  const origin = req.headers.get('Origin');
  
  if (!origin) {
    return {
      headers: {
        'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0],
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Vary': 'Origin',
    }
  };
}

// Peran moderasi hirarki
type ChannelRole = 'noc' | 'sys_admin' | 'pjc' | 'operator' | 'guest';

const roleRank: Record<ChannelRole, number> = {
  guest: 1,
  operator: 2,
  pjc: 3,
  sys_admin: 4,
  noc: 5,
};

function canModerateRole(actor: ChannelRole, target: ChannelRole): boolean {
  if (actor === 'noc') return target !== 'noc';
  if (actor === 'sys_admin') return target !== 'noc' && target !== 'sys_admin';
  if (actor === 'pjc') return target === 'operator' || target === 'guest';
  return false;
}

type ModerationAction =
  | 'SET_USER_ROLE'
  | 'MUTE_USER'
  | 'UNMUTE_USER'
  | 'BLOCK_PTT'
  | 'UNBLOCK_PTT'
  | 'BLOCK_CHAT'
  | 'UNBLOCK_CHAT'
  | 'KICK_USER'
  | 'BAN_USER'
  | 'UNBAN_USER'
  | 'UPDATE_SETTINGS';

function canPerformAction(role: ChannelRole, action: string): boolean {
  const permissions: Record<ChannelRole, string[]> = {
    noc: [
      'SET_USER_ROLE', 'MUTE_USER', 'UNMUTE_USER', 'BLOCK_PTT', 'UNBLOCK_PTT',
      'BLOCK_CHAT', 'UNBLOCK_CHAT', 'KICK_USER', 'BAN_USER', 'UNBAN_USER', 'UPDATE_SETTINGS'
    ],
    sys_admin: [
      'SET_USER_ROLE', 'MUTE_USER', 'UNMUTE_USER', 'BLOCK_PTT', 'UNBLOCK_PTT',
      'BLOCK_CHAT', 'UNBLOCK_CHAT', 'KICK_USER', 'BAN_USER', 'UNBAN_USER', 'UPDATE_SETTINGS'
    ],
    pjc: [
      'SET_USER_ROLE', 'MUTE_USER', 'UNMUTE_USER', 'BLOCK_PTT', 'UNBLOCK_PTT',
      'BLOCK_CHAT', 'UNBLOCK_CHAT', 'KICK_USER', 'BAN_USER', 'UNBAN_USER', 'UPDATE_SETTINGS'
    ],
    operator: ['KICK_USER'], // Operator can only kick
    guest: [],
  };

  return permissions[role]?.includes(action) || false;
}

serve(async (req: Request) => {
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body = await req.json();
    const { action, room_id, target_user_id, actor_user_id, payload } = body as {
      action: ModerationAction;
      room_id: string;
      target_user_id?: string;
      actor_user_id: string;
      payload?: Record<string, any>;
    };

    if (!action || !room_id || !actor_user_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Authenticate / Verify Actor
    let verifiedActorId = actor_user_id;
    const authHeader = req.headers.get('Authorization');
    if (authHeader && !actor_user_id.startsWith('guest-')) {
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
      const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized JWT verification failed' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      verifiedActorId = user.id;
    }

    // 2. Fetch actor role in the specific room
    const { data: actorRoleData, error: actorRoleError } = await supabaseAdmin
      .from('channel_roles')
      .select('role')
      .eq('room_id', room_id)
      .eq('user_id', verifiedActorId)
      .maybeSingle();

    if (actorRoleError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch actor role', details: actorRoleError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const actorRole = (actorRoleData?.role as ChannelRole) || 'guest';

    // 3. Verify general action permission for actor's role
    if (!canPerformAction(actorRole, action)) {
      return new Response(JSON.stringify({ error: `Forbidden: role '${actorRole}' cannot perform action '${action}'` }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. If target_user_id is provided, verify target role hierarchy
    let targetCurrentRole: ChannelRole = 'guest';
    if (target_user_id) {
      const { data: targetRoleData, error: targetRoleError } = await supabaseAdmin
        .from('channel_roles')
        .select('role')
        .eq('room_id', room_id)
        .eq('user_id', target_user_id)
        .maybeSingle();

      if (targetRoleError) {
        return new Response(JSON.stringify({ error: 'Failed to fetch target role' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      targetCurrentRole = (targetRoleData?.role as ChannelRole) || 'guest';

      // Verify hierarchy (Actor must be able to moderate Target)
      if (!canModerateRole(actorRole, targetCurrentRole)) {
        return new Response(JSON.stringify({ error: 'Forbidden: Insufficient role hierarchy to moderate this user' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 5. Execute Action using admin client
    let result: unknown = null;

    if (action === 'SET_USER_ROLE') {
      const nextRole = payload?.nextRole as ChannelRole;
      if (!nextRole || roleRank[nextRole] >= roleRank[actorRole]) {
        return new Response(JSON.stringify({ error: 'Forbidden: Cannot promote user to a role equal or higher than yours' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: upsertData, error: upsertError } = await supabaseAdmin
        .from('channel_roles')
        .upsert({
          room_id: room_id,
          user_id: target_user_id,
          role: nextRole,
          status: 'active',
          assigned_by: verifiedActorId,
          assigned_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (upsertError) throw upsertError;
      result = upsertData;

    } else if (action === 'MUTE_USER') {
      const minutes = payload?.minutes || 15;
      const expiresAt = minutes > 0 ? new Date(Date.now() + minutes * 60_000).toISOString() : null;

      const { data: upsertData, error: upsertError } = await supabaseAdmin
        .from('channel_roles')
        .upsert({
          room_id: room_id,
          user_id: target_user_id,
          status: 'muted',
          expires_at: expiresAt,
          assigned_by: verifiedActorId,
          assigned_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (upsertError) throw upsertError;
      result = upsertData;

    } else if (action === 'UNMUTE_USER') {
      const { data: upsertData, error: upsertError } = await supabaseAdmin
        .from('channel_roles')
        .upsert({
          room_id: room_id,
          user_id: target_user_id,
          status: 'active',
          expires_at: null,
          assigned_by: verifiedActorId,
          assigned_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (upsertError) throw upsertError;
      result = upsertData;

    } else if (action === 'BLOCK_PTT') {
      const minutes = payload?.minutes || 15;
      const expiresAt = minutes > 0 ? new Date(Date.now() + minutes * 60_000).toISOString() : null;

      const { data: upsertData, error: upsertError } = await supabaseAdmin
        .from('channel_roles')
        .upsert({
          room_id: room_id,
          user_id: target_user_id,
          status: 'ptt_blocked',
          expires_at: expiresAt,
          assigned_by: verifiedActorId,
          assigned_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (upsertError) throw upsertError;
      result = upsertData;

    } else if (action === 'UNBLOCK_PTT') {
      const { data: upsertData, error: upsertError } = await supabaseAdmin
        .from('channel_roles')
        .upsert({
          room_id: room_id,
          user_id: target_user_id,
          status: 'active',
          expires_at: null,
          assigned_by: verifiedActorId,
          assigned_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (upsertError) throw upsertError;
      result = upsertData;

    } else if (action === 'BLOCK_CHAT') {
      const minutes = payload?.minutes || 15;
      const expiresAt = minutes > 0 ? new Date(Date.now() + minutes * 60_000).toISOString() : null;

      const { data: upsertData, error: upsertError } = await supabaseAdmin
        .from('channel_roles')
        .upsert({
          room_id: room_id,
          user_id: target_user_id,
          status: 'chat_blocked',
          expires_at: expiresAt,
          assigned_by: verifiedActorId,
          assigned_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (upsertError) throw upsertError;
      result = upsertData;

    } else if (action === 'UNBLOCK_CHAT') {
      const { data: upsertData, error: upsertError } = await supabaseAdmin
        .from('channel_roles')
        .upsert({
          room_id: room_id,
          user_id: target_user_id,
          status: 'active',
          expires_at: null,
          assigned_by: verifiedActorId,
          assigned_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (upsertError) throw upsertError;
      result = upsertData;

    } else if (action === 'BAN_USER') {
      const reason = payload?.reason || 'Pelanggaran aturan';
      const minutes = payload?.minutes || 0;
      const expiresAt = minutes > 0 ? new Date(Date.now() + minutes * 60_000).toISOString() : null;

      // 1. Insert ke channel_bans
      const { error: banError } = await supabaseAdmin
        .from('channel_bans')
        .upsert({
          room_id: room_id,
          user_id: target_user_id,
          reason,
          banned_by: verifiedActorId,
          expires_at: expiresAt,
          banned_at: new Date().toISOString(),
        }, { onConflict: 'room_id,user_id' });

      if (banError) throw banError;

      // 2. Set status di channel_roles agar sinkron
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from('channel_roles')
        .upsert({
          room_id: room_id,
          user_id: target_user_id,
          status: 'banned',
          expires_at: expiresAt,
          assigned_by: verifiedActorId,
          assigned_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (roleError) throw roleError;
      result = roleData;

    } else if (action === 'UNBAN_USER') {
      // 1. Delete dari channel_bans
      const { error: unbanError } = await supabaseAdmin
        .from('channel_bans')
        .delete()
        .eq('room_id', room_id)
        .eq('user_id', target_user_id);

      if (unbanError) throw unbanError;

      // 2. Ubah status di channel_roles kembali ke active
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from('channel_roles')
        .upsert({
          room_id: room_id,
          user_id: target_user_id,
          status: 'active',
          expires_at: null,
          assigned_by: verifiedActorId,
          assigned_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (roleError) throw roleError;
      result = roleData;

    } else if (action === 'KICK_USER') {
      result = { kicked: true };

    } else if (action === 'UPDATE_SETTINGS') {
      const settings = payload?.settings;
      if (!settings) throw new Error('Missing settings in payload');

      const { data: settingsData, error: settingsError } = await supabaseAdmin
        .from('channel_settings')
        .upsert({
          room_id: room_id,
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (settingsError) throw settingsError;
      result = settingsData;
    }

    // 6. Tulis log moderasi ke channel_moderation_logs
    await supabaseAdmin.from('channel_moderation_logs').insert({
      room_id,
      actor_id: verifiedActorId,
      actor_role: actorRole,
      target_user_id: target_user_id || null,
      action,
      detail: payload || {},
    });

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err: unknown) {
    console.error('Error executing moderate-channel:', err);
    const message = err instanceof Error ? err.message : 'Server Error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
