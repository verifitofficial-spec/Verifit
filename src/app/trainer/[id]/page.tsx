'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, BadgeCheck, CalendarDays, Check, Clock, ExternalLink, MapPin, ShieldCheck, X } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import BrandMark from '@/components/BrandMark';
import Footer from '@/components/Footer';
import { SkeletonBlock } from '@/components/Skeleton';
import { parseSpecialties } from '@/lib/constants';
import { useAuthProfile } from '@/lib/useAuthProfile';
import { withNext } from '@/lib/nextParam';

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

const PENDING_KEY = 'verifit:pendingBooking';

function formatPrice(price: number) {
  return price > 0 ? `${price.toFixed(2).replace('.', ',')} €` : 'Kostenlos';
}

export default function TrainerPublicProfile() {
  const params = useParams<{ id: string }>();
  const trainerId = params.id;
  const auth = useAuthProfile();

  const [trainer, setTrainer] = useState<PublicTrainer | null>(null);
  const [offers, setOffers] = useState<TrainerOffer[]>([]);
  const [slots, setSlots] = useState<TrainerSlot[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<TrainerOffer | null>(null);
  const [bookingSlot, setBookingSlot] = useState<TrainerSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const returnPath = `/trainer/${trainerId}`;

  useEffect(() => {
    async function loadPublicData() {
      if (!trainerId) return;

      const [{ data: trainerData, error: trainerError }, { data: offerData }, { data: slotData }] = await Promise.all([
        supabase
          .from('trainers')
          .select('id, name, bio, city, service_mode, specialties, qualifications, avatar_url, instagram_url, tiktok_url, hourly_rate')
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

      if (!trainerError && trainerData) setTrainer(trainerData);
      const loadedOffers = (offerData ?? []) as TrainerOffer[];
      const loadedSlots = (slotData ?? []) as TrainerSlot[];
      setOffers(loadedOffers);
      setSlots(loadedSlots);

      // Nach Login/Registrierung: vorherige Auswahl wiederherstellen.
      try {
        const raw = sessionStorage.getItem(PENDING_KEY);
        if (raw) {
          sessionStorage.removeItem(PENDING_KEY);
          const pending = JSON.parse(raw) as { trainerId?: string; offerId?: string; slotId?: string };
          if (pending.trainerId === trainerId) {
            const offer = loadedOffers.find((o) => o.id === pending.offerId);
            const slot = loadedSlots.find((s) => s.id === pending.slotId);
            if (offer && slot) {
              setSelectedOffer(offer);
              setBookingSlot(slot);
            }
          }
        }
      } catch {
        /* sessionStorage nicht verfügbar */
      }

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

  function openBooking(slot: TrainerSlot) {
    if (!auth.userId && selectedOffer) {
      try {
        sessionStorage.setItem(PENDING_KEY, JSON.stringify({ trainerId, offerId: selectedOffer.id, slotId: slot.id }));
      } catch {
        /* sessionStorage nicht verfügbar */
      }
    }
    setBookingSlot(slot);
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
      setMessage({ type: 'error', text: 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.' });
      return;
    }

    try {
      const response = await fetch('/api/book-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
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
      <main className="min-h-screen bg-canvas text-white">
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-7xl items-center px-5 py-5 sm:px-8 lg:px-10"><BrandMark className="text-xl sm:text-2xl" /></div>
        </header>
        <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 lg:px-10" aria-label="Trainerprofil wird geladen">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="mt-8 h-16 w-full max-w-2xl" />
          <SkeletonBlock className="mt-6 h-5 w-full max-w-xl" />
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <SkeletonBlock className="h-64 w-full" />
            <SkeletonBlock className="h-64 w-full" />
          </div>
        </div>
      </main>
    );
  }

  const slotsByDate = slots.reduce<Record<string, TrainerSlot[]>>((grouped, slot) => {
    (grouped[slot.slot_date] ??= []).push(slot);
    return grouped;
  }, {});
  const calendarDates = Object.keys(slotsByDate).sort();

  if (!trainer) {
    return (
      <main className="flex min-h-screen flex-col bg-canvas text-white">
        <header className="border-b border-line"><div className="mx-auto flex w-full max-w-7xl px-5 py-5 sm:px-8 lg:px-10"><BrandMark className="text-xl sm:text-2xl" /></div></header>
        <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-5 py-16 sm:px-8 lg:px-10">
          <p className="text-sm font-semibold text-emerald-400">Profil nicht verfügbar</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Dieser Trainer wurde nicht gefunden.</h1>
          <Link href="/trainer/list" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-emerald-400 hover:text-emerald-300">
            <ArrowLeft size={16} aria-hidden /> Zu den verifizierten Trainern
          </Link>
        </section>
        <Footer />
      </main>
    );
  }

  const specialtyList = parseSpecialties(trainer.specialties);
  const isClient = auth.role === 'client';

  return (
    <main className="min-h-screen bg-canvas text-white">
      <header className="border-b border-line bg-canvas">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
          <BrandMark className="text-xl sm:text-2xl" />
          <div className="flex items-center gap-3">
            <Link href="/trainer/list" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-white">
              <ArrowLeft size={15} aria-hidden /> Alle Trainer
            </Link>
            {!auth.loading && !auth.userId && (
              <Link
                href={withNext('/client/login', returnPath)}
                className="inline-flex min-h-10 items-center rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800"
              >
                Kunden-Login
              </Link>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
        {message && (
          <div
            role={message.type === 'error' ? 'alert' : 'status'}
            className={`mb-10 space-y-1 border px-4 py-4 text-sm ${
              message.type === 'error'
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
            }`}
          >
            <p>{message.text}</p>
            {message.type === 'success' && auth.homeHref && (
              <Link href={auth.homeHref} className="inline-block pt-1 text-sm font-semibold text-emerald-300 underline">
                Anfrage im Dashboard ansehen
              </Link>
            )}
          </div>
        )}

        <div className="grid gap-10 border-b border-slate-800 pb-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
          <div>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-700 bg-slate-900 text-2xl font-bold text-emerald-400">
                {trainer.avatar_url ? (
                  <img src={trainer.avatar_url} alt={trainer.name || 'Trainer'} className="w-full h-full object-cover" />
                ) : (
                  <span>{trainer.name?.charAt(0) || 'T'}</span>
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">{trainer.name || 'Trainer'}</h1>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                    <BadgeCheck size={15} aria-hidden /> Verifiziert
                  </span>
                </div>
                <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-400">
                  <MapPin size={15} aria-hidden /> {trainer.city || 'Standort flexibel'} <span aria-hidden>·</span>{' '}
                  <span>{trainer.service_mode || 'Trainingsform im Profil'}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="border-l border-slate-700 pl-5 tabular-nums">
            <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Stundensatz / Basis</span>
            <span className="mt-2 block text-2xl font-semibold text-white">
              {trainer.hourly_rate ? `${Number(trainer.hourly_rate).toFixed(2).replace('.', ',')} € / Std.` : 'Auf Anfrage'}
            </span>
            <a href="#buchung" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-400 hover:text-emerald-300">
              Angebote und Termine <ArrowUpRight size={16} aria-hidden />
            </a>
          </div>
        </div>

        <div className="grid gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Über das Training</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">Ansatz und Philosophie</h2>
              <p className="mt-5 max-w-3xl whitespace-pre-line text-base leading-8 text-slate-300">{trainer.bio || 'Noch keine Biografie hinterlegt.'}</p>
            </div>

            {trainer.qualifications && (
              <div className="border-t border-slate-800 pt-8">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Qualifikationen und Zertifikate</p>
                <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-300">
                  {trainer.qualifications}
                </p>
              </div>
            )}
          </div>

          <aside className="border-t border-slate-800 pt-8 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Fachgebiete</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {specialtyList.length > 0 ? specialtyList.map((specialty) => (
                <span key={specialty} className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300">{specialty}</span>
              )) : <p className="text-sm text-slate-500">Noch keine Angaben</p>}
            </div>
            <div className="mt-8 flex items-start gap-3 border-t border-slate-800 pt-6">
              <ShieldCheck className="mt-0.5 shrink-0 text-emerald-400" size={20} aria-hidden />
              <p className="text-sm leading-6 text-slate-400">Trainerlizenz und Berufshaftpflicht wurden von VeriFit manuell geprüft.</p>
            </div>
            {(trainer.instagram_url || trainer.tiktok_url) && (
              <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-800 pt-6">
                {trainer.instagram_url && <a href={trainer.instagram_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-slate-300 hover:text-white">Instagram <ExternalLink size={14} aria-hidden /></a>}
                {trainer.tiktok_url && <a href={trainer.tiktok_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-slate-300 hover:text-white">TikTok <ExternalLink size={14} aria-hidden /></a>}
              </div>
            )}
          </aside>
        </div>

        <div id="buchung" className="scroll-mt-6 border-t border-slate-800 pt-12">
          <div>
            <p className="text-sm font-semibold text-emerald-400">Buchungsanfrage</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Angebot und Termin auswählen.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">Der Trainer prüft deine Anfrage. Bei kostenpflichtigen Angeboten zahlst du erst nach der Annahme.</p>
          </div>

          <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <div className="mb-5 flex items-center gap-3"><span className="font-mono text-sm text-emerald-400">01</span><h3 className="text-lg font-semibold">Angebot wählen</h3></div>
              {offers.length === 0 ? (
                <p className="border-y border-slate-800 py-6 text-sm text-slate-400">Dieser Trainer hat derzeit keine buchbaren Angebote hinterlegt.</p>
              ) : (
                <div className="border-b border-slate-800">
                  {offers.map((offer) => {
                    const isSelected = selectedOffer?.id === offer.id;
                    return (
                      <button
                        key={offer.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedOffer(offer)}
                        className={`grid min-h-20 w-full grid-cols-[1fr_auto] gap-4 border-t px-1 py-5 text-left transition-colors ${isSelected ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-800 hover:border-slate-600'}`}
                      >
                        <span>
                          <span className="block text-xs font-semibold text-emerald-400">{offer.type === 'discovery' ? 'Kostenloses Erstgespräch' : 'Kostenpflichtiges Angebot'}</span>
                          <span className="mt-1 block font-semibold text-white">{offer.title}</span>
                          <span className="mt-2 flex items-center gap-1.5 text-xs text-slate-400"><Clock size={13} aria-hidden /> {offer.duration_minutes} Minuten</span>
                          {offer.description && <span className="mt-3 block text-sm leading-6 text-slate-400">{offer.description}</span>}
                        </span>
                        <span className="flex items-start gap-2 whitespace-nowrap font-semibold text-white tabular-nums">{formatPrice(Number(offer.price))}{isSelected && <Check size={17} className="text-emerald-400" aria-hidden />}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <div className="mb-5 flex items-center gap-3"><span className="font-mono text-sm text-emerald-400">02</span><h3 className="text-lg font-semibold">Freien Termin wählen</h3></div>
              <p className="mb-5 text-sm text-slate-400">{selectedOffer ? `Ausgewählt: „${selectedOffer.title}“` : 'Wähle zuerst links ein Angebot aus.'}</p>
              {slots.length === 0 ? (
                <p className="border-y border-slate-800 py-6 text-sm text-slate-400">Aktuell sind keine freien Termine verfügbar.</p>
              ) : (
                <div className="space-y-5">
                  {calendarDates.map((date) => {
                    const dateLabel = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${date}T12:00:00`));
                    return (
                      <div key={date} className="border-t border-slate-800 pt-4">
                        <div className="mb-3 flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm font-semibold capitalize"><CalendarDays size={15} className="text-emerald-400" aria-hidden /> {dateLabel}</span><span className="text-xs text-slate-500">{slotsByDate[date].length} frei</span></div>
                        <div className="flex flex-wrap gap-2">
                          {slotsByDate[date].map((slot) => (
                            <button key={slot.id} type="button" disabled={!selectedOffer} onClick={() => openBooking(slot)} className="min-h-11 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold tabular-nums transition-colors hover:border-emerald-500 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40">
                              {slot.slot_time?.slice(0, 5) || '--:--'} Uhr
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {bookingSlot && selectedOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="booking-dialog-title" className="w-full max-w-lg space-y-5 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-sm font-semibold text-emerald-400">Buchungsanfrage</p><h2 id="booking-dialog-title" className="mt-1 text-xl font-semibold text-white">Termin verbindlich anfragen</h2></div>
              <button type="button" onClick={() => setBookingSlot(null)} className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white" aria-label="Buchungsdialog schließen">
                <X size={20} aria-hidden />
              </button>
            </div>
            <div className="border-y border-slate-800 py-5 text-sm space-y-2">
              <p className="font-semibold text-white">{selectedOffer.title}</p>
              <p className="text-emerald-400 tabular-nums">
                {bookingSlot.slot_date} um {bookingSlot.slot_time?.slice(0, 5) || '--:--'} Uhr
              </p>
              <p className="text-slate-400 tabular-nums">{formatPrice(Number(selectedOffer.price))}</p>
            </div>

            {auth.loading ? (
              <p className="text-sm text-slate-400">Prüfe Anmeldung...</p>
            ) : !auth.userId ? (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-slate-300">
                  Zum Anfragen dieses Termins brauchst du ein Kunden-Konto. Nach der Anmeldung kommst du direkt hierher zurück, deine Auswahl bleibt erhalten.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={withNext('/client/login', returnPath)}
                    className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-600"
                  >
                    Anmelden
                  </Link>
                  <Link
                    href={withNext('/client/register', returnPath)}
                    className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700"
                  >
                    Registrieren
                  </Link>
                </div>
              </div>
            ) : !isClient ? (
              <p className="border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-300">
                Du bist mit einem Trainer- bzw. Admin-Konto angemeldet. Termine können nur mit einem Kunden-Konto angefragt werden.
              </p>
            ) : (
              <>
                <p className="text-sm leading-6 text-slate-400">
                  Der Trainer prüft deine Anfrage zuerst. Bei kostenpflichtigen Angeboten erhältst du danach eine Zahlungsaufforderung in deinem Dashboard.
                </p>
                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setBookingSlot(null)} className="min-h-11 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700">
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleBooking}
                    className="min-h-11 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-600 disabled:opacity-60"
                  >
                    {submitting ? 'Sende Anfrage...' : 'Anfrage absenden'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
