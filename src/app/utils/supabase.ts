import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSecureConfig } from './secureConfig';

let _supabaseInstance: SupabaseClient | null = null;
export let supabase: SupabaseClient | null = null;
let _supabaseInitializationPromise: Promise<SupabaseClient> | null = null;

export async function getSupabase(): Promise<SupabaseClient> {
  if (_supabaseInstance) {
    return _supabaseInstance;
  }

  if (!_supabaseInitializationPromise) {
    _supabaseInitializationPromise = (async () => {
      const config = await getSecureConfig();
      const url = config.supabaseUrl || 'https://placeholder.supabase.co';
      const key = config.supabaseKey || 'placeholder';
      _supabaseInstance = createClient(url, key);
      supabase = _supabaseInstance;
      return _supabaseInstance;
    })();
  }

  return _supabaseInitializationPromise;
}
