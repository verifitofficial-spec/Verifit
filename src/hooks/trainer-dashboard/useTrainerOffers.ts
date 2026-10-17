'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import type { OfferDraft, OfferTemplate } from '@/lib/trainer-dashboard/types';
import {
  isMissingPhase3MetadataError,
  normalizePricingModel,
  normalizeServiceMode,
  offerMetadataForPersistence,
  validateOfferMetadata,
} from '@/lib/matching';
import { isAuthorizationError } from '@/lib/supabaseErrors';

interface OfferRow {
  id: string;
  title: string;
  type: 'discovery' | 'paid';
  duration_minutes: number;
  price: number | string;
  description: string | null;
  service_mode?: string | null;
  pricing_model?: string | null;
  included_sessions?: number | null;
}

/** Lädt und verwaltet ausschließlich die zum Lead-MVP gehörenden Trainerangebote. */
export function useTrainerOffers(trainerId: string) {
  const [offers, setOffers] = useState<OfferTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOffers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: loadError } = await supabase
      .from('trainer_offers')
      .select('id, title, type, duration_minutes, price, description, service_mode, pricing_model, included_sessions')
      .eq('trainer_id', trainerId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    if (loadError) {
      console.error('Angebote konnten nicht geladen werden.');
      setError('Deine Angebote konnten nicht geladen werden.');
      setLoading(false);
      return;
    }
    setOffers(
      ((data ?? []) as OfferRow[]).map((offer) => ({
        id: offer.id,
        title: offer.title,
        type: offer.type,
        duration: offer.duration_minutes,
        price: Number(offer.price),
        description: offer.description ?? '',
        serviceMode: normalizeServiceMode(offer.service_mode),
        pricingModel: normalizePricingModel(offer.pricing_model),
        includedSessions: offer.included_sessions ?? null,
      }))
    );
    setLoading(false);
  }, [trainerId]);

  useEffect(() => {
    void Promise.resolve().then(() => loadOffers());
  }, [loadOffers]);

  const saveOffer = useCallback(
    async (draft: OfferDraft, editingId: string | null): Promise<string | null> => {
      if (!draft.title.trim()) return 'Bitte gib einen Titel ein.';
      const price = draft.type === 'discovery' ? 0 : Number(draft.price) || 0;
      const validationError = validateOfferMetadata({ ...draft, price });
      if (validationError) return validationError;
      const metadata = offerMetadataForPersistence(draft);
      const offerFields = {
        title: draft.title.trim(),
        type: draft.type,
        duration_minutes: Number(draft.duration) || 60,
        price,
        description: draft.description.trim() || null,
        ...metadata,
      };

      const { data, error } = editingId
        ? await supabase
            .from('trainer_offers')
            .update(offerFields)
            .eq('id', editingId)
            .eq('trainer_id', trainerId)
            .select('id')
            .maybeSingle()
        : await supabase
            .from('trainer_offers')
            .insert({ trainer_id: trainerId, ...offerFields })
            .select('id')
            .maybeSingle();
      if (error || !data) {
        return isMissingPhase3MetadataError(error)
          ? 'Angebote können erst nach Ausführung der Phase-3-Migration klassifiziert werden.'
          : isAuthorizationError(error) || !data
            ? 'Das Angebot konnte wegen fehlender Berechtigung nicht gespeichert werden. Bitte melde dich erneut an.'
            : 'Das Angebot konnte nicht gespeichert werden.';
      }

      await loadOffers();
      return null;
    },
    [trainerId, loadOffers]
  );

  const deleteOffer = useCallback(
    async (id: string): Promise<string | null> => {
      const { data, error } = await supabase
        .from('trainer_offers')
        .update({ is_active: false })
        .eq('id', id)
        .eq('trainer_id', trainerId)
        .select('id')
        .maybeSingle();
      if (error || !data) {
        return isAuthorizationError(error) || !data
          ? 'Das Angebot konnte wegen fehlender Berechtigung nicht deaktiviert werden. Bitte melde dich erneut an.'
          : 'Das Angebot konnte nicht deaktiviert werden.';
      }
      await loadOffers();
      return null;
    },
    [trainerId, loadOffers]
  );

  return { offers, loading, error, reload: loadOffers, saveOffer, deleteOffer };
}
