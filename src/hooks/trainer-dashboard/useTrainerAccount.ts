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
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
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

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (profileError) {
        if (active) {
          setError('Deine Berechtigung konnte nicht geprüft werden.');
          setLoading(false);
        }
        return;
      }
      if (profile?.role !== 'trainer') {
        router.push('/trainer/login');
        return;
      }

      const { data, error: trainerError } = await supabase
        .from('trainers')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (!active) return;
      if (trainerError || !data) {
        setError('Dein Trainerprofil konnte nicht geladen werden.');
        setTrainer(null);
      } else {
        setTrainer(data as TrainerProfile);
      }
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [reloadKey, routeId, router]);

  const updateTrainer = useCallback((patch: Partial<TrainerProfile>) => {
    setTrainer((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/login');
  }, [router]);

  const retry = useCallback(() => setReloadKey((value) => value + 1), []);

  return { trainer, loading, error, retry, updateTrainer, logout };
}
