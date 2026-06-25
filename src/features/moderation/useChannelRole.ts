import { useEffect, useState } from 'react';
import { getSupabase } from '../../app/utils/supabase';
import type { ChannelRole } from './permissions';
import { getGlobalRole } from './permissions';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { CHANNELS, BRAND } from '../../app/utils/config';
import { usePTTStore } from '../../app/store/usePTTStore';

export function useChannelRole(roomId: string, userId: string) {
  const [role, setRole] = useState<ChannelRole>(() => {
    if (!roomId || !userId) return 'guest';
    const localRole = localStorage.getItem(
      `channel-role:${roomId}:${userId}`
    ) as ChannelRole | null;

    // Check if this hook is checking for the local user
    const store = usePTTStore.getState();
    const isLocalUser = userId === store.userId;
    const localUserObj = store.user;
    const localName = localUserObj?.user_metadata?.full_name || store.infoText || 'Pebe Herianto';
    const localCallSign = store.callSign;

    const isOperatorUser =
      userId === 'Pebri Haryanto' ||
      userId === '2DYUA' ||
      (isLocalUser && (localName === 'Pebri Haryanto' || localCallSign === '2DYUA'));

    const globalRole = getGlobalRole(
      userId,
      isLocalUser ? localName : undefined,
      isLocalUser ? localCallSign : undefined
    );
    const isNocUser = globalRole === 'noc';
    const isSysAdminUser = globalRole === 'sys_admin';

    if (isOperatorUser) {
      if (!localRole || localRole === 'guest') {
        // Automatically save to localStorage
        localStorage.setItem(`channel-role:${roomId}:${userId}`, 'operator');
        return 'operator';
      }
    }

    if (isNocUser) {
      if (!localRole || localRole === 'guest') {
        localStorage.setItem(`channel-role:${roomId}:${userId}`, 'noc');
        return 'noc';
      }
    }

    if (isSysAdminUser) {
      if (!localRole || localRole === 'guest') {
        localStorage.setItem(`channel-role:${roomId}:${userId}`, 'sys_admin');
        return 'sys_admin';
      }
    }

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
      setRole('guest');
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
      if (localRole) setRole(localRole);
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

        let data = initialData;

        if (error) {
          console.error('Error fetching channel role:', error);
        }

        // Bootstrap: Jika belum ada role apa pun di room ini, angkat user pertama yang masuk sebagai PJC
        if (!data) {
          // Validasi room_id adalah channel yang terdaftar
          const prefix = BRAND.supabaseRoomPrefix || 'ptt-room-';
          if (roomId.startsWith(prefix)) {
            const chNumStr = roomId.substring(prefix.length);
            const chNum = parseInt(chNumStr, 10);
            const channelExists = CHANNELS.some((ch) => ch.number === chNum);

            if (channelExists) {
              const { count, error: countError } = await supabaseInstance
                .from('channel_roles')
                .select('id', { count: 'exact', head: true })
                .eq('room_id', roomId);

              if (!countError && count === 0) {
                const defaultRole = {
                  room_id: roomId,
                  user_id: userId,
                  role: 'pjc' as ChannelRole,
                  status: 'active',
                  assigned_by: 'system',
                  assigned_at: new Date().toISOString(),
                };

                const { data: inserted } = await supabaseInstance
                  .from('channel_roles')
                  .insert(defaultRole)
                  .select('role, status')
                  .maybeSingle();

                if (inserted) {
                  data = inserted;
                }
              }
            } else {
              console.warn(
                `[Bootstrap PJC] Room ${roomId} is not a valid registered channel number.`
              );
            }
          }
        }

        if (!mounted) return;

        // Check local override first, if none, write db to local
        const localRole = localStorage.getItem(
          `channel-role:${roomId}:${userId}`
        ) as ChannelRole | null;
        const localStatus = localStorage.getItem(`channel-status:${roomId}:${userId}`);

        const store = usePTTStore.getState();
        const isLocalUser = userId === store.userId;
        const localUserObj = store.user;
        const localName =
          localUserObj?.user_metadata?.full_name || store.infoText || 'Pebe Herianto';
        const localCallSign = store.callSign;
        const isOperatorUser =
          userId === 'Pebri Haryanto' ||
          userId === '2DYUA' ||
          (isLocalUser && (localName === 'Pebri Haryanto' || localCallSign === '2DYUA'));

        const isNocUser =
          userId === 'noc_global' ||
          userId === 'Pebe Herianto' ||
          (isLocalUser &&
            (localName === 'NOC Global' ||
              localName === 'Pebe Herianto' ||
              localCallSign === 'NOC-01'));

        const isSysAdminUser =
          userId === 'sys_admin_vwt' ||
          (isLocalUser && (localName === 'Sys Admin VWT' || localCallSign === 'SYS-01'));

        if (isOperatorUser && (!localRole || localRole === 'guest')) {
          setRole('operator');
          localStorage.setItem(`channel-role:${roomId}:${userId}`, 'operator');
        } else if (isNocUser && (!localRole || localRole === 'guest')) {
          setRole('noc');
          localStorage.setItem(`channel-role:${roomId}:${userId}`, 'noc');
        } else if (isSysAdminUser && (!localRole || localRole === 'guest')) {
          setRole('sys_admin');
          localStorage.setItem(`channel-role:${roomId}:${userId}`, 'sys_admin');
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
                  const r = (newRecord.role as ChannelRole) || 'guest';
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
                  setRole('guest');
                  setStatus('active');
                  localStorage.removeItem(`channel-role:${roomId}:${userId}`);
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
                  const r = (refetch?.role as ChannelRole) || 'guest';
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
  }, [roomId, userId]);

  return {
    role,
    status,
    loading,
  };
}
