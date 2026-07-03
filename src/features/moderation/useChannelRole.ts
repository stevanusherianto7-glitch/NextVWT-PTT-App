import { useEffect, useState } from 'react';
import { getSupabase } from '../../app/utils/supabase';
import type { ChannelRole } from './permissions';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useChannelRole(roomId: string, userId: string) {
  const localName =
    typeof window !== 'undefined'
      ? (() => {
          try {
            const raw = localStorage.getItem('nextvwt_settings');
            if (raw) {
              const parsed = JSON.parse(raw);
              return parsed.infoText || '';
            }
          } catch {
            // ignore
          }
          return '';
        })()
      : '';
  const isPebe =
    userId === 'Pebe Herianto' ||
    localName.toLowerCase() === 'pebe herianto' ||
    localName.toLowerCase() === 'pebri haryanto';

  const [role, setRole] = useState<ChannelRole>(() => {
    if (isPebe) return 'noc';
    if (!roomId || !userId) return 'guest';
    const localRole = localStorage.getItem(
      `channel-role:${roomId}:${userId}`
    ) as ChannelRole | null;
    return localRole || 'guest';
  });
  const [status, setStatus] = useState(() => {
    if (!roomId || !userId) return 'active';
    const localStatus = localStorage.getItem(`channel-status:${roomId}:${userId}`);
    return localStatus || 'active';
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId || !userId) {
      setRole(isPebe ? 'noc' : 'guest');
      setStatus('active');
      setLoading(false);
      return;
    }

    let mounted = true;
    let channel: RealtimeChannel | null = null;

    // Local override listener
    const handleLocalRoleChange = () => {
      if (!mounted) return;
      const localRole = localStorage.getItem(
        `channel-role:${roomId}:${userId}`
      ) as ChannelRole | null;
      const localStatus = localStorage.getItem(`channel-status:${roomId}:${userId}`);
      if (isPebe) {
        setRole('noc');
      } else if (localRole) {
        setRole(localRole);
      }
      if (localStatus) setStatus(localStatus);
    };

    window.addEventListener('channel-role-changed', handleLocalRoleChange);

    async function loadAndSubscribe() {
      try {
        setLoading(true);
        const supabaseInstance = await getSupabase();

        if (!mounted) return;

        // Load current role
        const { data: initialData, error } = await supabaseInstance
          .from('channel_roles')
          .select('role, status')
          .eq('room_id', roomId)
          .eq('user_id', userId)
          .maybeSingle();

        const data = initialData;

        if (error) {
          console.error('Error fetching channel role:', error);
        }

        if (!mounted) return;

        // Check local override first, if none, write db to local
        const localRole = localStorage.getItem(
          `channel-role:${roomId}:${userId}`
        ) as ChannelRole | null;
        const localStatus = localStorage.getItem(`channel-status:${roomId}:${userId}`);

        if (isPebe) {
          setRole('noc');
          localStorage.setItem(`channel-role:${roomId}:${userId}`, 'noc');
        } else if (localRole) {
          setRole(localRole);
        } else if (data?.role) {
          const dbRole = data.role as ChannelRole;
          setRole(dbRole);
          localStorage.setItem(`channel-role:${roomId}:${userId}`, dbRole);
        } else {
          setRole('guest');
        }

        if (localStatus) {
          setStatus(localStatus);
        } else if (data?.status) {
          setStatus(data.status);
          localStorage.setItem(`channel-status:${roomId}:${userId}`, data.status);
        } else {
          setStatus('active');
        }

        setLoading(false);

        // Setup realtime subscription
        channel = supabaseInstance
          .channel(`channel-role:${roomId}:${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'channel_roles',
              filter: `room_id=eq.${roomId}`,
            },
            async (payload) => {
              const newRecord = payload.new as {
                user_id?: string;
                role?: string;
                status?: string;
              } | null;
              const oldRecord = payload.old as { user_id?: string } | null;

              if (newRecord && newRecord.user_id === userId) {
                if (mounted) {
                  const r = isPebe ? 'noc' : (newRecord.role as ChannelRole) || 'guest';
                  const s = newRecord.status || 'active';
                  setRole(r);
                  setStatus(s);
                  localStorage.setItem(`channel-role:${roomId}:${userId}`, r);
                  localStorage.setItem(`channel-status:${roomId}:${userId}`, s);
                  window.dispatchEvent(new Event('channel-role-changed'));
                }
              } else if (
                payload.eventType === 'DELETE' &&
                oldRecord &&
                oldRecord.user_id === userId
              ) {
                if (mounted) {
                  const r = isPebe ? 'noc' : 'guest';
                  setRole(r);
                  setStatus('active');
                  if (isPebe) {
                    localStorage.setItem(`channel-role:${roomId}:${userId}`, 'noc');
                  } else {
                    localStorage.removeItem(`channel-role:${roomId}:${userId}`);
                  }
                  localStorage.removeItem(`channel-status:${roomId}:${userId}`);
                  window.dispatchEvent(new Event('channel-role-changed'));
                }
              } else {
                // If it affects this user or we need to be sure, do a quick refetch
                const { data: refetch } = await supabaseInstance
                  .from('channel_roles')
                  .select('role, status')
                  .eq('room_id', roomId)
                  .eq('user_id', userId)
                  .maybeSingle();
                if (mounted) {
                  const r = isPebe ? 'noc' : (refetch?.role as ChannelRole) || 'guest';
                  const s = refetch?.status || 'active';
                  setRole(r);
                  setStatus(s);
                  localStorage.setItem(`channel-role:${roomId}:${userId}`, r);
                  localStorage.setItem(`channel-status:${roomId}:${userId}`, s);
                  window.dispatchEvent(new Event('channel-role-changed'));
                }
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.error('Error loading or subscribing to channel role:', err);
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadAndSubscribe();

    return () => {
      mounted = false;
      window.removeEventListener('channel-role-changed', handleLocalRoleChange);
      if (channel) {
        getSupabase().then((sub) => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          sub.removeChannel(channel!);
        });
      }
    };
  }, [roomId, userId, isPebe]);

  return {
    role,
    status,
    loading,
  };
}
