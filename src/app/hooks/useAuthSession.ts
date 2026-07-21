import { useEffect } from 'react';
import { usePTTStore } from '../store/usePTTStore';
import { getSupabase } from '../utils/supabase';
import type { Subscription, User } from '@supabase/supabase-js';

/**
 * Sync Supabase Auth session ke Zustand store.
 *
 * Handles both initial session load and real-time auth state changes.
 * Guest users are skipped (their state is managed client-side only).
 */
export function useAuthSession() {
  const setUser = usePTTStore((s) => s.setUser);
  const updateSettings = usePTTStore((s) => s.updateSettings);

  useEffect(() => {
    let authSubscription: Subscription | null = null;

    /** Apply user data + sync display name from metadata. */
    const applyUser = (u: User | null) => {
      const currentUser = usePTTStore.getState().user;
      if (currentUser && 'isGuest' in currentUser && currentUser.isGuest) return;

      setUser(u);
      if (u) {
        const name = u.user_metadata?.full_name || u.email?.split('@')[0] || 'User';
        const { profilePhotoOption, customPhotoUrl } = usePTTStore.getState();
        if (profilePhotoOption === 'custom' && !customPhotoUrl) {
          updateSettings({ infoText: name, profilePhotoOption: 'google' });
        } else {
          updateSettings({ infoText: name });
        }
      }
    };

    getSupabase().then((supabase) => {
      // Initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        applyUser(session?.user ?? null);
      });

      // Real-time auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        applyUser(session?.user ?? null);
      });
      authSubscription = subscription;
    });

    return () => {
      authSubscription?.unsubscribe();
    };
  }, [setUser, updateSettings]);
}
