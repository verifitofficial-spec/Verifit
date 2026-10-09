'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';

export type AuthRole = 'client' | 'trainer' | 'admin';

export type AuthProfile = {
  loading: boolean;
  userId: string | null;
  email: string | null;
  role: AuthRole | null;
  /** Zieladresse des persönlichen Dashboards, falls angemeldet. */
  homeHref: string | null;
};

const EMPTY: AuthProfile = { loading: false, userId: null, email: null, role: null, homeHref: null };

function homeFor(role: AuthRole | null, id: string): string | null {
  if (role === 'client') return `/client/${id}/dashboard`;
  if (role === 'trainer') return `/trainer/${id}/dashboard`;
  if (role === 'admin') return '/admin';
  return null;
}

export function useAuthProfile(): AuthProfile {
  const [state, setState] = useState<AuthProfile>({ ...EMPTY, loading: true });

  useEffect(() => {
    let active = true;

    async function resolve(user: { id: string; email?: string | null } | null) {
      if (!user) {
        if (active) setState(EMPTY);
        return;
      }
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (!active) return;
      const role: AuthRole | null =
        data?.role === 'client' || data?.role === 'trainer' || data?.role === 'admin' ? data.role : null;
      setState({ loading: false, userId: user.id, email: user.email ?? null, role, homeHref: homeFor(role, user.id) });
    }

    supabase.auth.getSession().then(({ data }) => resolve(data.session?.user ?? null));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Keine Supabase-Aufrufe direkt im Callback (Deadlock-Gefahr) -> nächster Tick.
      setTimeout(() => {
        void resolve(session?.user ?? null);
      }, 0);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return state;
}
