'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import type { ClientOption } from '@/lib/trainer-dashboard/types';

/** Kunden, die der Trainer laut RLS sehen darf (Kunden mit Buchung). */
export function useClients() {
  const [clients, setClients] = useState<ClientOption[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error } = await supabase.from('clients').select('id, name, email');
      if (error) {
        console.error('Fehler beim Laden der Kunden:', error.message);
        return;
      }
      if (active && data) setClients(data as ClientOption[]);
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  return clients;
}
