'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, BadgeCheck, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import Footer from '@/components/Footer';
import PublicHeader from '@/components/PublicHeader';
import { SkeletonBlock } from '@/components/Skeleton';
import { parseSpecialties } from '@/lib/constants';
import { isOfferTypePriceValid, normalizeDatabasePrice } from '@/lib/matching';
import { isMissingRelationError } from '@/lib/supabaseErrors';

interface Trainer {
  id: string;
  name: string | null;
  bio: string | null;
  city: string | null;
  service_mode: string | null;
  specialties: string | null;
  availability_status: string | null;
  activeOfferCount: number;
  minPaidOfferPrice: number | null;
  hasDiscoveryOffer: boolean;
}

type OfferSummaryRow = { trainer_id: string; type: 'discovery' | 'paid'; price: number | string | null };

type PublicTrainerFallbackResponse = {
  trainers?: Omit<Trainer, 'activeOfferCount' | 'minPaidOfferPrice' | 'hasDiscoveryOffer'>[];
  offers?: OfferSummaryRow[];
};

function TrainerRowSkeleton() {
  return (
    <div className="grid gap-6 border-t border-line py-8 lg:grid-cols-[4rem_minmax(0,1fr)_minmax(15rem,0.7fr)_auto]">
      <SkeletonBlock className="h-12 w-12 rounded-full" />
      <div className="space-y-3">
        <SkeletonBlock className="h-6 w-48" />
        <SkeletonBlock className="h-4 w-64 max-w-full" />
        <SkeletonBlock className="h-4 w-full max-w-lg" />
      </div>
      <div className="space-y-2">
        <SkeletonBlock className="h-7 w-full" />
        <SkeletonBlock className="h-7 w-2/3" />
      </div>
      <SkeletonBlock className="h-11 w-36" />
    </div>
  );
}

export default function PublicTrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [cityFilter, setCityFilter] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');

  useEffect(() => {
    async function fetchApprovedTrainers() {
      const [trainerResult, initialOfferResult] = await Promise.all([
        supabase
          .from('trainers_public')
          .select('id, name, bio, city, service_mode, specialties, availability_status')
          .order('name', { ascending: true }),
        supabase.from('trainer_offers').select('trainer_id, type, price').eq('is_active', true),
      ]);

      let data = trainerResult.data;
      let error = trainerResult.error;
      let offerData = initialOfferResult.data;
      let offerError = initialOfferResult.error;

      if (isMissingRelationError(error, 'trainers_public')) {
        const response = await fetch('/api/public/matching-data', { cache: 'no-store' });
        if (response.ok) {
          const fallback = await response.json() as PublicTrainerFallbackResponse;
          data = fallback.trainers ?? [];
          error = null;
          offerData = fallback.offers ?? [];
          offerError = null;
        }
      }

      if (error || offerError) {
        console.error('Verifizierte Trainer konnten nicht geladen werden');
        setLoadError(true);
      } else {
        const offersByTrainer = new Map<string, OfferSummaryRow[]>();
        for (const offer of (offerData ?? []) as OfferSummaryRow[]) {
          offersByTrainer.set(offer.trainer_id, [...(offersByTrainer.get(offer.trainer_id) ?? []), offer]);
        }
        setTrainers((data ?? []).map((trainer) => {
          const offers = (offersByTrainer.get(trainer.id) ?? []).filter((offer) =>
            isOfferTypePriceValid(offer.type, offer.price)
          );
          const paidPrices = offers
            .filter((offer) => offer.type === 'paid')
            .map((offer) => normalizeDatabasePrice(offer.price))
            .filter((price): price is number => price !== null && price > 0);
          return {
            ...trainer,
            activeOfferCount: offers.length,
            minPaidOfferPrice: paidPrices.length > 0 ? Math.min(...paidPrices) : null,
            hasDiscoveryOffer: offers.some((offer) => offer.type === 'discovery'),
          } as Trainer;
        }));
      }
      setLoading(false);
    }

    fetchApprovedTrainers();
  }, []);

  const filteredTrainers = trainers.filter((trainer) => {
    const city = trainer.city?.toLowerCase() || '';
    const specialties = trainer.specialties?.toLowerCase() || '';
    return (
      (cityFilter === '' || city.includes(cityFilter.toLowerCase())) &&
      (specialtyFilter === '' || specialties.includes(specialtyFilter.toLowerCase()))
    );
  });

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <PublicHeader />

      <section className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-accent">Verifizierte Trainer</p>
            <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.035em] sm:text-5xl lg:text-6xl">
              Expertise, die du vergleichen kannst.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-ink-soft">
              Filtere freigeschaltete Trainer nach Standort und Fachgebiet. Im Profil findest du
              Angebote, Preise und die Möglichkeit für eine unverbindliche Kontaktanfrage.
            </p>
          </div>
          {!loading && !loadError && (
            <div className="border-l border-line-strong pl-5">
              <span className="block font-mono text-3xl font-semibold tabular-nums text-ink">{filteredTrainers.length}</span>
              <span className="text-sm text-ink-muted">{filteredTrainers.length === 1 ? 'passendes Profil' : 'passende Profile'}</span>
            </div>
          )}
        </div>

        <div className="mt-12 border-y border-line py-6">
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-ink">
            <SlidersHorizontal size={17} className="text-accent" aria-hidden />
            Auswahl eingrenzen
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="city-filter" className="mb-2 block text-sm font-medium text-ink-soft">
                Standort oder Stadt
              </label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" size={17} aria-hidden />
                <input
                  id="city-filter"
                  type="search"
                  placeholder="Zum Beispiel Berlin"
                  value={cityFilter}
                  onChange={(event) => setCityFilter(event.target.value)}
                  className="min-h-12 w-full rounded-lg border border-line-strong bg-surface py-3 pl-11 pr-4 text-sm text-ink placeholder:text-ink-muted transition-colors hover:border-line-strong focus:border-accent focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label htmlFor="specialty-filter" className="mb-2 block text-sm font-medium text-ink-soft">
                Fachgebiet
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" size={17} aria-hidden />
                <input
                  id="specialty-filter"
                  type="search"
                  placeholder="Zum Beispiel Rückentraining"
                  value={specialtyFilter}
                  onChange={(event) => setSpecialtyFilter(event.target.value)}
                  className="min-h-12 w-full rounded-lg border border-line-strong bg-surface py-3 pl-11 pr-4 text-sm text-ink placeholder:text-ink-muted transition-colors hover:border-line-strong focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10" aria-live="polite" aria-busy={loading}>
          {loading ? (
            <div>
              <p className="sr-only">Verifizierte Trainer werden geladen.</p>
              <TrainerRowSkeleton />
              <TrainerRowSkeleton />
              <TrainerRowSkeleton />
            </div>
          ) : loadError ? (
            <div role="alert" className="border-y border-danger-line bg-danger-soft px-4 py-8">
              <h2 className="font-semibold text-danger">Die Trainerliste konnte nicht geladen werden.</h2>
              <p className="mt-2 text-sm text-ink-muted">Bitte lade die Seite erneut oder versuche es später noch einmal.</p>
            </div>
          ) : filteredTrainers.length === 0 ? (
            <div className="border-y border-line py-10">
              <h2 className="text-xl font-semibold text-ink">Keine passenden Profile gefunden.</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-ink-muted">
                Entferne einen Filter oder starte das Matching, um deine Auswahl über Trainingsziel und Budget einzugrenzen.
              </p>
              <Link href="/quiz" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-accent hover:text-accent">
                Matching starten <ArrowUpRight size={16} aria-hidden />
              </Link>
            </div>
          ) : (
            <div>
              {filteredTrainers.map((trainer, index) => {
                const specialties = parseSpecialties(trainer.specialties);
                const visibleSpecialties = specialties.slice(0, 3);
                return (
                  <article
                    key={trainer.id}
                    className="group grid gap-6 border-t border-line py-8 first:border-t-0 lg:grid-cols-[4rem_minmax(0,1fr)_minmax(15rem,0.7fr)_auto] lg:items-start"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-line-strong bg-surface text-sm font-bold text-accent" aria-hidden>
                      {trainer.name?.charAt(0).toUpperCase() || String(index + 1).padStart(2, '0')}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-semibold tracking-tight text-ink">{trainer.name || 'Trainer'}</h2>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/45 bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
                          <BadgeCheck size={14} aria-hidden /> Verifiziert
                        </span>
                      </div>
                      <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
                        <span>{trainer.city || 'Standort flexibel'}</span>
                        <span aria-hidden>·</span>
                        <span>{trainer.service_mode || 'Trainingsform im Profil'}</span>
                      </p>
                      <p className="mt-4 max-w-2xl text-sm leading-6 text-ink-soft">
                        {trainer.bio || 'Noch keine Biografie hinterlegt. Angebote und Kontaktmöglichkeit findest du im Profil.'}
                      </p>
                      <p className="mt-3 text-xs text-ink-muted tabular-nums">
                        {trainer.activeOfferCount === 0
                          ? 'Aktuell keine konkreten Angebote'
                          : trainer.minPaidOfferPrice !== null
                            ? `${trainer.activeOfferCount} ${trainer.activeOfferCount === 1 ? 'Angebot' : 'Angebote'} · niedrigster Angebotspreis ${trainer.minPaidOfferPrice.toFixed(2).replace('.', ',')} €`
                            : trainer.hasDiscoveryOffer
                              ? 'Kostenloses Erstgespräch verfügbar'
                              : `${trainer.activeOfferCount} ${trainer.activeOfferCount === 1 ? 'Angebot' : 'Angebote'}`}
                      </p>
                    </div>

                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Fachgebiete</p>
                      {visibleSpecialties.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {visibleSpecialties.map((specialty) => (
                            <span key={specialty} className="rounded-md border border-line-strong bg-surface px-2.5 py-1.5 text-xs font-medium text-ink-soft">
                              {specialty}
                            </span>
                          ))}
                          {specialties.length > visibleSpecialties.length && (
                            <span className="px-1 py-1.5 text-xs text-ink-muted">+{specialties.length - visibleSpecialties.length} weitere</span>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-ink-muted">Noch keine Angaben</p>
                      )}
                    </div>

                    <Link
                      href={`/trainer/${trainer.id}`}
                      className="inline-flex min-h-11 items-center justify-center gap-2 self-center rounded-lg border border-line-strong bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent lg:self-start"
                    >
                      Profil ansehen <ArrowUpRight size={16} aria-hidden />
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
