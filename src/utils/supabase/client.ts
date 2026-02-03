import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, publicAnonKey } from './info';

// Initialize Supabase client - SINGLETON (lokal oder über Env)
export const supabase = createClient(supabaseUrl, publicAnonKey);

// Validate and log client initialization
if (typeof window !== 'undefined') {
  if (!supabase) {
    console.error('[Supabase Client] ❌ FATAL: Client is undefined!');
  } else if (typeof supabase.from !== 'function') {
    console.error('[Supabase Client] ❌ FATAL: Client missing .from() method!', supabase);
  } else {
    console.log('[Supabase Client] ✅ Initialized successfully', {
      url: supabaseUrl,
      hasAuth: !!supabase.auth,
      hasFrom: typeof supabase.from === 'function',
    });
  }
}

// Ensure client is exported correctly
if (!supabase) {
  throw new Error('[Supabase Client] FATAL: Failed to create Supabase client');
}
