import 'server-only';

import { createClient, type User } from '@supabase/supabase-js';

export type ProfileRole = 'client' | 'trainer' | 'admin';

export type RequestAuthentication = {
  user: User;
  role: ProfileRole | null;
};

export function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export function getAccessTokenFromRequest(req: Request): string | null {
  return req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || null;
}

export function getUserClient(accessToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    }
  );
}

export async function getUserFromRequest(req: Request): Promise<User | null> {
  const token = getAccessTokenFromRequest(req);
  if (!token) return null;

  const { data, error } = await getAdminClient().auth.getUser(token);
  return error ? null : data.user;
}

export async function getUserRole(userId: string): Promise<ProfileRole | null> {
  const { data, error } = await getAdminClient()
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;

  return data.role === 'client' || data.role === 'trainer' || data.role === 'admin'
    ? data.role
    : null;
}

export async function getRequestAuthentication(
  req: Request
): Promise<RequestAuthentication | null> {
  const user = await getUserFromRequest(req);
  if (!user) return null;

  return {
    user,
    role: await getUserRole(user.id),
  };
}
