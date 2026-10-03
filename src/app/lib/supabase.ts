import { createBrowserClient } from '@supabase/ssr';

// Public values are safe in the browser. The SSR client stores the session in
// cookies so Next.js Proxy can perform an optimistic route guard.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
