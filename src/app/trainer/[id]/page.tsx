'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

type PublicTrainer = {
  id: string;
  name: string | null;
  bio: string | null;
  city: string | null;
  service_mode: string | null;
  specialties: string | null;
  qualifications: string | null;
  avatar_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  hourly_rate: number | null;
};

type TrainerOffer = {
  id: string;
  title: string;
  type: 'discovery' | 'paid';
  duration_minutes: number;
  price: number;
  description: string | null;
};

type TrainerSlot = {
  id: string;
  slot_date: string;
  slot_time: string | null;
};

type BookingResponse = {
  error?: string;
  mailSent?: boolean;
  success?: boolean;
};

function formatPrice(price: number) {
  return price > 0 ? `${price.toFixed(2).replace('.', ',')} €` : 'Kostenlos';
}

export default function TrainerPublicProfile() {
  const params = useParams<{ id: string }>();
  const trainerId = params.id;

  const [trainer, setTrainer] = useState<PublicTrainer | null>(null);
  const [offers, setOffers] = useState<TrainerOffer[]>([]);
  const [slots, setSlots] = useState<TrainerSlot[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<TrainerOffer | null>(null);
  const [bookingSlot, setBookingSlot] = useState<TrainerSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    async function loadPublicData() {
      if (!trainerId) return;

      const [{ data: trainerData, error: trainerError }, { data: offerData }, { data: slotData }] =
        await Promise.all([
          supabase
            .from('trainers')
            .select(
              'id, name, bio, city, service_mode, specialties, qualifications, avatar_url, instagram_url, tiktok_url, hourly_rate'
            )
            .eq('id', trainerId)
            .eq('status', 'approved')
            .maybeSingle(),
          supabase
            .from('trainer_offers')
            .select('id, title, type, duration_minutes, price, description')
            .eq('trainer_id', trainerId)
            .eq('is_active', true)
            .order('created_at', { ascending: true }),
          supabase
            .from('trainer_slots')
            .select('id, slot_date, slot_time')
            .eq('trainer_id', trainerId)
            .eq('status', 'free')
            .order('slot_date', { ascending: true })
            .order('slot_time', { ascending: true }),
        ]);

      if (!trainerError && trainerData) {
        setTrainer(trainerData);
      }
      setOffers((offerData ?? []) as TrainerOffer[]);
      setSlots((slotData ?? []) as TrainerSlot[]);
      setLoading(false);
    }

    loadPublicData();
  }, [trainerId]);

  async function reloadFreeSlots() {
    const { data } = await supabase
      .from('trainer_slots')
      .select('id, slot_date, slot_time')
      .eq('trainer_id', trainerId)
      .eq('status', 'free')
      .order('slot_date', { ascending: true })
      .order('slot_time', { ascending: true });

    setSlots((data ?? []) as TrainerSlot[]);
  }

  async function handleBooking() {
    if (!bookingSlot || !selectedOffer) return;

    setSubmitting(true);
    setMessage(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setSubmitting(false);
      setMessage({
        type: 'error',
        text: 'Bitte melde dich zuerst mit deinem Kunden-Konto an, um einen Termin anzufragen.',
      });
      return;
    }

    try {
      const response = await fetch('/api/book-slot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ slotId: bookingSlot.id, offerId: selectedOffer.id }),
      });
      const data = (await response.json().catch(() => ({}))) as BookingResponse;

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Termin konnte nicht angefragt werden.' });
        if (response.status === 409) {
          await reloadFreeSlots();
          setBookingSlot(null);
        }
        return;
      }

      setMessage({
        type: 'success',
        text:
          data.mailSent === false
            ? 'Deine Anfrage wurde gespeichert. Die Bestätigungsmail konnte nicht zugestellt werden.'
            : 'Deine Buchungsanfrage wurde erfolgreich an den Trainer gesendet.',
      });
      setBookingSlot(null);
      await reloadFreeSlots();
    } catch {
      setMessage({ type: 'error', text: 'Netzwerkfehler bei der Buchungsanfrage.' });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400 text-sm">Lade Experten-Profil...</p>
      </div>
    );
  }

  if (!trainer) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-xl font-bold mb-2">Trainer nicht gefunden</h1>
        <Link href="/trainer/list" className="text-emerald-400 text-sm hover:underline">
          Zu den verifizierten Experten
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <header className="flex justify-between items-center px-6 py-6 max-w-7xl mx-auto w-full border-b border-slate-900">
        <Link href="/" className="text-2xl font-black tracking-wider text-emerald-400">
          VERIFIT<span className="text-white">.</span>{' '}
          <span className="text-xs text-slate-400 font-normal">Expert Hub</span>
        </Link>
        <Link
          href="/client/login"
          className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-xl transition border border-slate-800"
        >
          Kunden-Login
        </Link>
      </header>

      <section className="max-w-4xl mx-auto px-6 py-12 w-full flex-1 space-y-8">
        {message && (
          <div
            className={`p-4 rounded-xl text-sm border text-center ${
              message.type === 'error'
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl font-bold text-emerald-400 overflow-hidden shrink-0 shadow-inner">
                {trainer.avatar_url ? (
                  <img src={trainer.avatar_url} alt={trainer.name || 'Trainer'} className="w-full h-full object-cover" />
                ) : (
                  <span>{trainer.name?.charAt(0) || 'T'}</span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-extrabold">{trainer.name || 'Trainer'}</h1>
                  <span className="text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full font-bold">
                    Verifiziert ✓
                  </span>
                </div>
                <p className="text-slate-400 text-sm">
                  {trainer.city || 'Standort flexibel'} &bull;{' '}
                  <span className="text-emerald-400 font-medium">{trainer.service_mode || 'Hybrid'}</span>
                </p>
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 px-5 py-3.5 rounded-xl text-right w-full md:w-auto">
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Stundensatz / Basis</span>
              <span className="text-sm font-bold text-emerald-400">
                {trainer.hourly_rate ? `${trainer.hourly_rate} € / Std.` : 'Auf Anfrage'}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 space-y-6">
            <div>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Fachgebiete & Spezialisierungen</h2>
              <div className="flex flex-wrap gap-2">
                {trainer.specialties ? (
                  trainer.specialties.split(',').map((specialty) => (
                    <span
                      key={specialty.trim()}
                      className="bg-slate-950 border border-slate-800 text-emerald-400 text-xs px-3 py-1 rounded-lg font-medium"
                    >
                      {specialty.trim()}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-slate-300">Keine Angaben hinterlegt</p>
                )}
              </div>
            </div>

            {trainer.qualifications && (
              <div>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Qualifikationen & Zertifikate</h2>
                <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800">
                  {trainer.qualifications}
                </p>
              </div>
            )}

            <div>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Über mich & Philosophie</h2>
              <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                {trainer.bio || 'Keine Biografie vorhanden.'}
              </p>
            </div>
          </div>

          {(trainer.instagram_url || trainer.tiktok_url) && (
            <div className="flex gap-3 pt-4 border-t border-slate-800">
              {trainer.instagram_url && (
                <a
                  href={trainer.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 px-4 py-2 rounded-xl transition"
                >
                  Instagram ↗
                </a>
              )}
              {trainer.tiktok_url && (
                <a
                  href={trainer.tiktok_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 px-4 py-2 rounded-xl transition"
                >
                  TikTok ↗
                </a>
              )}
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div>
            <h2 className="text-xl font-extrabold mb-1">1. Paket auswählen</h2>
            <p className="text-slate-400 text-sm">Wähle zuerst das Angebot, das du anfragen möchtest.</p>
          </div>

          {offers.length === 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-center text-slate-400 text-sm">
              Dieser Trainer hat derzeit keine buchbaren Angebote hinterlegt.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {offers.map((offer) => {
                const isSelected = selectedOffer?.id === offer.id;
                return (
                  <button
                    key={offer.id}
                    type="button"
                    onClick={() => setSelectedOffer(offer)}
                    className={`text-left bg-slate-950 border rounded-xl p-5 transition ${
                      isSelected
                        ? 'border-emerald-500 ring-1 ring-emerald-500'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">
                          {offer.type === 'discovery' ? 'Kostenloses Erstgespräch' : 'Bezahltes Angebot'}
                        </span>
                        <h3 className="mt-1 text-base font-bold text-white">{offer.title}</h3>
                      </div>
                      <span className="text-sm font-bold text-emerald-400 whitespace-nowrap">
                        {formatPrice(Number(offer.price))}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">{offer.duration_minutes} Minuten</p>
                    {offer.description && <p className="mt-3 text-xs text-slate-300">{offer.description}</p>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div>
            <h2 className="text-xl font-extrabold mb-1">2. Freien Termin auswählen</h2>
            <p className="text-slate-400 text-sm">
              {selectedOffer
                ? `Du fragst „${selectedOffer.title}“ an.`
                : 'Wähle oben ein Paket aus, bevor du einen Termin anfragst.'}
            </p>
          </div>

          {slots.length === 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-center text-slate-400 text-sm">
              Aktuell sind keine freien Termine verfügbar. Schau bald wieder vorbei!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {slots.map((slot) => (
                <div key={slot.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex justify-between items-center gap-4">
                  <div>
                    <span className="text-xs font-bold text-emerald-400 block mb-0.5">
                      {slot.slot_date} um {slot.slot_time?.slice(0, 5) || '--:--'} Uhr
                    </span>
                    <p className="text-xs text-slate-400">Anfrage wird vom Trainer bestätigt.</p>
                  </div>
                  <button
                    type="button"
                    disabled={!selectedOffer}
                    onClick={() => setBookingSlot(slot)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Anfragen
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {bookingSlot && selectedOffer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-white">Termin verbindlich anfragen</h2>
              <button
                type="button"
                onClick={() => setBookingSlot(null)}
                className="text-slate-400 hover:text-white text-lg"
                aria-label="Buchungsdialog schließen"
              >
                &times;
              </button>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
              <p className="font-bold text-white">{selectedOffer.title}</p>
              <p className="text-emerald-400">
                {bookingSlot.slot_date} um {bookingSlot.slot_time?.slice(0, 5) || '--:--'} Uhr
              </p>
              <p className="text-slate-400">{formatPrice(Number(selectedOffer.price))}</p>
            </div>
            <p className="text-xs text-slate-400">
              Der Trainer prüft deine Anfrage zuerst. Bei kostenpflichtigen Angeboten erhältst du danach eine Zahlungsaufforderung.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBookingSlot(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold"
              >
                Abbrechen
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleBooking}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-60"
              >
                {submitting ? 'Sende Anfrage...' : 'Anfrage absenden'}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600 max-w-7xl mx-auto w-full">
        &copy; {new Date().getFullYear()} VeriFit. Alle Rechte vorbehalten.
      </footer>
    </main>
  );
}
