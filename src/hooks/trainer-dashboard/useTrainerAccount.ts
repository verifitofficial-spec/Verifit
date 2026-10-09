'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import type { TrainerProfile } from '@/lib/trainer-dashboard/types';

/**
 * Lädt das Trainerprofil der angemeldeten Person und stellt sicher, dass
 * - eine Sitzung existiert,
 * - die URL-ID zur eigenen ID passt,
 * - die Rolle in `profiles` "trainer" ist.
 */
export function useTrainerAccount(routeId: string) {
  const router = useRouter();
  const [trainer, setTrainer] = useState<TrainerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/trainer/login');
        return;
      }
      if (user.id !== routeId) {
        router.replace(`/trainer/${user.id}/dashboard`);
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (profile?.role !== 'trainer') {
        router.push('/trainer/login');
        return;
      }

      const { data } = await supabase.from('trainers').select('*').eq('id', user.id).maybeSingle();
      if (!active) return;
      setTrainer((data as TrainerProfile | null) ?? null);
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [routeId, router]);

  const updateTrainer = useCallback((patch: Partial<TrainerProfile>) => {
    setTrainer((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/login');
  }, [router]);

  return { trainer, loading, updateTrainer, logout };
}
