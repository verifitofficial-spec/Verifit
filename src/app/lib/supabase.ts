import { createClient } from '@supabase/supabase-js';

const BUILD_SAFE_SUPABASE_URL = 'https://placeholder.supabase.co';
const BUILD_SAFE_ANON_KEY = 'placeholder-anon-key';

function getValidSupabaseUrl(value: string | undefined): string {
  const normalized = value?.trim().replace(/^['"]|['"]$/g, '');
  if (!normalized) return BUILD_SAFE_SUPABASE_URL;

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.toString().replace(/\/$/, '');
  } catch {
    // Keep the production build renderable; the deployment health check will expose the missing config.
  }
  return BUILD_SAFE_SUPABASE_URL;
}

function getSupabaseAnonKey(value: string | undefined): string {
  const normalized = value?.trim().replace(/^['"]|['"]$/g, '');
  return normalized || BUILD_SAFE_ANON_KEY;
}

export const supabase = createClient(
  getValidSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
  getSupabaseAnonKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
);
