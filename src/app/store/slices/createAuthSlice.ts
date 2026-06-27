import { StateCreator } from 'zustand';
import { PTTState } from '../types';
import { getSupabase } from '../../utils/supabase';

import { RealtimeChannel } from '@supabase/supabase-js';

let coinsSubscription: RealtimeChannel | null = null;

export const createAuthSlice: StateCreator<
  PTTState,
  [],
  [],
  Pick<
    PTTState,
    | 'user'
    | 'activeTransmitter'
    | 'activeUsers'
    | 'coins'
    | 'setUser'
    | 'signInWithGoogle'
    | 'signOut'
    | 'fetchCoins'
  >
> = (set, _get) => ({
  user: null,
  activeTransmitter: null,
  activeUsers: [],
  coins: 0,

  setUser: (user) => {
    const state = _get() as PTTState;
    const oldUserId = state.userId;
    const newUserId = user ? user.id : oldUserId;

    set({ user, userId: newUserId });

    // If userId changed and we are connected, re-subscribe to update presence
    if (newUserId !== oldUserId && state.isConnected) {
      setTimeout(() => {
        const s = _get() as PTTState;
        s.subscribeToChannel(s.channelNumber);
      }, 0);
    }

    if (coinsSubscription) {
      coinsSubscription.unsubscribe();
      coinsSubscription = null;
    }

    if (user) {
      // Fetch coins and subscribe to real-time updates
      setTimeout(() => {
        const state = _get() as PTTState;
        state.fetchCoins();

        getSupabase()
          .then((supabase) => {
            coinsSubscription = supabase
              .channel(`coins-sync:${user.id}`)
              .on(
                'postgres_changes',
                {
                  event: 'UPDATE',
                  schema: 'public',
                  table: 'user_profiles_extended',
                  filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                  if (payload.new && typeof payload.new.coins === 'number') {
                    set({ coins: payload.new.coins });
                  }
                }
              )
              .subscribe();
          })
          .catch((err) => console.warn('Failed to subscribe to realtime coins:', err));
      }, 0);
    } else {
      set({ coins: 0 });
    }
  },

  signInWithGoogle: async () => {
    try {
      const supabase = await getSupabase();
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
    } catch (err) {
      console.error('Google Sign In Error', err);
      set({ error: 'Failed to initialize Google Sign In' });
    }
  },

  signOut: async () => {
    try {
      // [F-08] Step 1: Unsubscribe from active channel to stop receiving broadcasts
      // This MUST happen before auth.signOut() to prevent spurious state updates
      // from arriving after the user session is cleared.
      const { activeChannelSubscription, setActiveChannelSubscription } =
        await import('../subscription');
      if (activeChannelSubscription) {
        try {
          activeChannelSubscription.unsubscribe();
        } catch {
          // Ignore — channel may already be closed
        }
        setActiveChannelSubscription(null);
      }

      // [F-08] Step 2: Unsubscribe coins realtime listener
      if (coinsSubscription) {
        try {
          coinsSubscription.unsubscribe();
        } catch {
          // Ignore
        }
        coinsSubscription = null;
      }

      // [F-08] Step 3: Sign out from Supabase Auth
      const supabase = await getSupabase();
      await supabase.auth.signOut();

      // [F-08] Step 4: Reset all user-related state atomically
      const { generateUUID } = await import('../storeUtils');
      set({
        user: null,
        userId: generateUUID(),
        coins: 0,
        activeUsers: [],
        activeTransmitter: null,
        isTransmitting: false,
        isConnected: false,
        progress: 0,
      });
    } catch (err) {
      console.error('Sign Out Error', err);
    }
  },

  fetchCoins: async () => {
    const user = _get().user;
    if (!user) return;
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('user_profiles_extended')
        .select('coins')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        set({ coins: data.coins });
      } else {
        // Create default profile if not exists
        await supabase.from('user_profiles_extended').upsert({
          user_id: user.id,
          display_name: user.user_metadata?.full_name || 'User',
          avatar_url: user.user_metadata?.avatar_url || '',
          coins: 0,
        });
        set({ coins: 0 });
      }
    } catch (err) {
      console.warn('Failed to fetch coins balance:', err);
    }
  },
});
