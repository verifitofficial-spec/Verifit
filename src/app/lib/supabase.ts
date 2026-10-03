import { createClient } from '@supabase/supabase-js';

// Next.js evaluates Client Components during prerendering. These non-functional fallback
// values keep builds deterministic when only the deployment runtime receives public env vars.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
