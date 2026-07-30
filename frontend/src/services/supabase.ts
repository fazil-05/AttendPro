// src/services/supabase.ts
// Supabase client for frontend-only (no backend server required)
// Uses service_role_key for full access (this is an internal enterprise app)
// For public apps, switch to anon key + RLS policies

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Add VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY to .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export default supabase;
