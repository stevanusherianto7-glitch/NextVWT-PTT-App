import { useEffect, useState } from 'react';
import { getSupabase } from '../../app/utils/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { usePTTStore } from '../../app/store/usePTTStore';

export interface ChannelSettings {
  room_id: string;
  channel_name: string;
  channel_description: string;
  channel_mode: 'public' | 'private' | 'password' | 'locked' | 'hidden';
  channel_password_hash?: string;
  pjc_user_id?: string;
  theme_key: string;
  allow_guest_ptt: boolean;
  allow_guest_chat: boolean;
  allow_guest_reaction: boolean;
  allow_guest_queue: boolean;
  allow_guest_song_request: boolean;
  chat_enabled: boolean;
  reaction_enabled: boolean;
  karaoke_queue_enabled: boolean;
  song_request_enabled: boolean;
  ptt_cooldown_seconds: number;
  guest_max_ptt_seconds: number;
  member_max_ptt_seconds: number;
  slow_mode_seconds: number;
}

export function useChannelSettings(roomId: string, initialChannelName = 'Channel') {
  const [settings, setSettings] = useState<ChannelSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) {
      setSettings(null);
      setLoading(false);
      return;
    }

    let mounted = true;
    let channel: RealtimeChannel | null = null;

    async function loadAndSubscribe() {
      try {
        setLoading(true);
        const supabaseInstance = await getSupabase();

        if (!mounted) return;

        // Fetch settings
        const { data, error } = await supabaseInstance
          .from('channel_settings')
          .select('*')
          .eq('room_id', roomId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching channel settings:', error);
        }

        if (!mounted) return;

        if (data) {
          setSettings(data as ChannelSettings);
          setLoading(false);
        } else {
          // Create default settings if they do not exist
          const defaults = {
            room_id: roomId,
            channel_name: initialChannelName,
            channel_description: '',
            channel_mode: 'public',
            theme_key: 'green-crystal',
            allow_guest_ptt: true,
            allow_guest_chat: true,
            allow_guest_reaction: true,
            allow_guest_queue: false,
            allow_guest_song_request: true,
            chat_enabled: true,
            reaction_enabled: true,
            karaoke_queue_enabled: true,
            song_request_enabled: true,
            ptt_cooldown_seconds: 2,
            guest_max_ptt_seconds: 15,
            member_max_ptt_seconds: 60,
            slow_mode_seconds: 0,
          };

          const actorId = usePTTStore.getState().userId;
          const { data: edgeResponse, error: insertError } =
            await supabaseInstance.functions.invoke('moderate-channel', {
              body: {
                action: 'UPDATE_SETTINGS',
                room_id: roomId,
                actor_user_id: actorId,
                payload: {
                  settings: defaults,
                },
              },
            });

          if (insertError || edgeResponse?.error) {
            console.error(
              'Error creating default settings via Edge Function:',
              insertError || edgeResponse?.error
            );
          }

          const inserted = edgeResponse?.result;

          if (mounted) {
            setSettings((inserted || defaults) as ChannelSettings);
            setLoading(false);
          }
        }

        // Subscribe to changes
        channel = supabaseInstance
          .channel(`channel-settings:${roomId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'channel_settings',
              filter: `room_id=eq.${roomId}`,
            },
            (payload) => {
              if (payload.eventType === 'DELETE') {
                if (mounted) setSettings(null);
              } else if (payload.new) {
                if (mounted) setSettings(payload.new as ChannelSettings);
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.error('Error loadAndSubscribe channel settings:', err);
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadAndSubscribe();

    return () => {
      mounted = false;
      if (channel) {
        getSupabase().then((sub) => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          sub.removeChannel(channel!);
        });
      }
    };
  }, [roomId, initialChannelName]);

  async function updateSettings(newSettings: Partial<ChannelSettings>) {
    if (!roomId) return;
    try {
      const supabaseInstance = await getSupabase();

      const mergedSettings = settings ? { ...settings, ...newSettings } : newSettings;

      // Optimistic Update
      setSettings(mergedSettings as ChannelSettings);

      const actorId = usePTTStore.getState().userId;
      const { data: edgeResponse, error } = await supabaseInstance.functions.invoke(
        'moderate-channel',
        {
          body: {
            action: 'UPDATE_SETTINGS',
            room_id: roomId,
            actor_user_id: actorId,
            payload: {
              settings: mergedSettings,
            },
          },
        }
      );

      if (error || edgeResponse?.error) {
        console.error(
          'Error updating channel settings via Edge Function:',
          error || edgeResponse?.error
        );
        throw error || new Error(edgeResponse?.error || 'Gagal menyimpan pengaturan.');
      }
    } catch (err) {
      console.warn(
        'Prototype Mode: Edge Function failed, but keeping local optimistic update.',
        err
      );
      // Di mode prototype (tanpa login Supabase), kita biarkan saja perubahan
      // bertahan secara lokal di state (optimistic update) dan tidak dilempar (throw).
      // Jangan melakukan revert ke DB.
    }
  }

  return {
    settings,
    loading,
    updateSettings,
  };
}
