'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { todayDateStr } from '@/lib/trainer-dashboard/utils';
import type { Booking, OfferDraft, OfferTemplate, TrainerSlot } from '@/lib/trainer-dashboard/types';

interface OfferRow {
  id: string;
  title: string;
  type: 'discovery' | 'paid';
  duration_minutes: number;
  price: number | string;
  description: string | null;
}

/** Alle Aktionen liefern `null` bei Erfolg oder eine deutsche Fehlermeldung. */
export function useTrainerSchedule(trainerId: string) {
  const [slots, setSlots] = useState<TrainerSlot[]>([]);
  const [offers, setOffers] = useState<OfferTemplate[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const loadSlots = useCallback(async () => {
    const { data } = await supabase
      .from('trainer_slots')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('slot_date', { ascending: true });
    if (data) setSlots(data as TrainerSlot[]);
  }, [trainerId]);

  const loadOffers = useCallback(async () => {
    const { data, error } = await supabase
      .from('trainer_offers')
      .select('*')
      .eq('trainer_id', trainerId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Fehler beim Laden der Pakete:', error.message);
      return;
    }
    setOffers(
      ((data ?? []) as OfferRow[]).map((o) => ({
        id: o.id,
        title: o.title,
        type: o.type,
        duration: o.duration_minutes,
        price: Number(o.price),
        description: o.description ?? '',
      }))
    );
  }, [trainerId]);

  const loadBookings = useCallback(async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('slot_date', { ascending: true })
      .order('slot_time', { ascending: true });
    if (error) {
      console.error('Fehler beim Laden der Anfragen:', error.message);
      return;
    }
    setBookings(((data ?? []) as Booking[]).map((b) => ({ ...b, price: Number(b.price) })));
  }, [trainerId]);

  useEffect(() => {
    void Promise.resolve().then(() => {
      void loadSlots();
      void loadOffers();
      void loadBookings();
    });
  }, [loadSlots, loadOffers, loadBookings]);

  // Neue Anfragen erscheinen ohne manuelles Neuladen.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        void loadBookings();
        void loadSlots();
      }
    };
    const interval = setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [loadBookings, loadSlots]);

  const respondToBooking = useCallback(
    async (bookingId: string, accept: boolean): Promise<string | null> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.';

      const response = await fetch('/api/respond-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ bookingId, accept }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) return data.error || 'Buchungsantwort konnte nicht gespeichert werden.';

      await Promise.all([loadBookings(), loadSlots()]);
      return null;
    },
    [loadBookings, loadSlots]
  );

  const toggleSlot = useCallback(
    async (date: string, hour: string): Promise<string | null> => {
      const existing = slots.find((s) => s.slot_date === date && s.slot_time.startsWith(hour));

      if (existing) {
        if (existing.status !== 'free') return 'Dieser Slot hat eine Anfrage bzw. Buchung und kann nicht entfernt werden.';
        const { error } = await supabase.from('trainer_slots').delete().eq('id', existing.id);
        if (error) return 'Fehler beim Löschen des Slots: ' + error.message;
      } else {
        if (date < todayDateStr()) return 'Termine in der Vergangenheit können nicht angelegt werden.';
        const { error } = await supabase
          .from('trainer_slots')
          .insert({ trainer_id: trainerId, slot_date: date, slot_time: `${hour}:00`, status: 'free' });
        if (error) return 'Fehler beim Erstellen des Slots: ' + error.message;
      }

      await loadSlots();
      return null;
    },
    [slots, trainerId, loadSlots]
  );

  const saveOffer = useCallback(
    async (draft: OfferDraft, editingId: string | null): Promise<string | null> => {
      if (!draft.title.trim()) return 'Bitte gib einen Titel ein.';
      const price = draft.type === 'discovery' ? 0 : Number(draft.price) || 0;
      if (draft.type === 'paid' && price <= 0) return 'Bezahlte Angebote brauchen einen Preis größer 0.';

      const payload = {
        trainer_id: trainerId,
        title: draft.title.trim(),
        type: draft.type,
        duration_minutes: Number(draft.duration) || 60,
        price,
        description: draft.description.trim() || null,
      };

      const { error } = editingId
        ? await supabase.from('trainer_offers').update(payload).eq('id', editingId)
        : await supabase.from('trainer_offers').insert(payload);
      if (error) return 'Fehler beim Speichern: ' + error.message;

      await loadOffers();
      return null;
    },
    [trainerId, loadOffers]
  );

  /** Soft-Delete: Buchungen behalten ihre Kopie der Paketdaten. */
  const deleteOffer = useCallback(
    async (id: string): Promise<string | null> => {
      const { error } = await supabase.from('trainer_offers').update({ is_active: false }).eq('id', id);
      if (error) return 'Fehler beim Löschen: ' + error.message;
      await loadOffers();
      return null;
    },
    [loadOffers]
  );

  const activeBookings = useMemo(
    () =>
      bookings
        .filter((b) => ['pending', 'accepted', 'confirmed'].includes(b.status))
        .sort(
          (a, b) =>
            (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1) ||
            `${a.slot_date}${a.slot_time}`.localeCompare(`${b.slot_date}${b.slot_time}`)
        ),
    [bookings]
  );

  const pendingCount = useMemo(() => bookings.filter((b) => b.status === 'pending').length, [bookings]);

  const bookingBySlot = useMemo(() => {
    const map: Record<string, Booking> = {};
    for (const booking of activeBookings) {
      if (booking.slot_id) map[booking.slot_id] = booking;
    }
    return map;
  }, [activeBookings]);

  return {
    slots,
    offers,
    activeBookings,
    pendingCount,
    bookingBySlot,
    respondToBooking,
    toggleSlot,
    saveOffer,
    deleteOffer,
  };
}
