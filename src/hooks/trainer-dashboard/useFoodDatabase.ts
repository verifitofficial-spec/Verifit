'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { FALLBACK_FOODS } from '@/lib/trainer-dashboard/constants';
import type { Food } from '@/lib/trainer-dashboard/types';

export interface NewFoodInput {
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function useFoodDatabase() {
  const [foods, setFoods] = useState<Food[]>(FALLBACK_FOODS);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data } = await supabase.from('foods').select('*').order('name', { ascending: true });
      if (active && data && data.length > 0) setFoods(data as Food[]);
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  /** Liefert `null` bei Erfolg oder eine Fehlermeldung. */
  const addFood = useCallback(async (input: NewFoodInput): Promise<string | null> => {
    const { data, error } = await supabase.from('foods').insert(input).select().single();
    if (error) return 'Fehler beim Hinzufügen des Lebensmittels: ' + error.message;
    if (data) {
      setFoods((prev) => {
        // Beim ersten eigenen Eintrag die Platzhalter-Vorschläge nicht weiter mitführen.
        const base = prev === FALLBACK_FOODS ? [] : prev;
        return [...base, data as Food].sort((a, b) => a.name.localeCompare(b.name, 'de'));
      });
    }
    return null;
  }, []);

  return { foods, addFood };
}
