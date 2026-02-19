import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[Supabase] 🔑 URL:', supabaseUrl ? '✅ Set' : '❌ MISSING');
console.log('[Supabase] 🔑 Anon Key:', supabaseAnonKey ? '✅ Set (' + supabaseAnonKey.substring(0, 20) + '...)' : '❌ MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('[Supabase] ✅ Client initialized');
