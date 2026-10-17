'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, BadgeCheck, Clock, ExternalLink, MapPin, ShieldCheck } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import BrandMark from '@/components/BrandMark';
import Footer from '@/components/Footer';
import ThemeToggle from '@/components/ThemeToggle';
import { SkeletonBlock } from '@/components/Skeleton';
import InquiryForm from '@/components/InquiryForm';
import { parseSpecialties } from '@/lib/constants';
import { useAuthProfile } from '@/lib/useAuthProfile';
import { withNext } from '@/lib/nextParam';
import { isMissingRelationError } from '@/lib/supabaseErrors';
import {
  isMissingPhase3MetadataError,
  isOfferTypePriceValid,
  normalizeDatabasePrice,
  normalizePricingModel,
  normalizeServiceMode,
  normalizeTargetLevels,
  type PricingModel,
  type ServiceMode,
} from '@/lib/matching';

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
  target_levels?: unknown;
};

type TrainerOffer = {
  id: string;
  title: string;
  type: 'discovery' | 'paid';
  duration_minutes: number;
  price: number | string | null;
  description: string | null;
  service_mode?: string | null;
  pricing_model?: string | null;
  included_sessions?: number | null;
};

type PublicTrainerFallbackResponse = {
  trainers?: PublicTrainer[];
  offers?: TrainerOffer[];
};

function formatPrice(price: number) {
  return price > 0 ? `${price.toFixed(2).replace('.', ',')} €` : 'Kostenlos';
}

function formatOfferPrice(offer: TrainerOffer) {
  const price = normalizeDatabasePrice(offer.price);
  if (offer.type === 'discovery') return 'Kostenlos';
  return price !== null && price > 0 ? formatPrice(price) : 'Preis nicht hinterlegt';
}

function offerDetails(offer: TrainerOffer) {
  const mode: ServiceMode | null = normalizeServiceMode(offer.service_mode);
  const model: PricingModel | null = normalizePricingModel(offer.pricing_model);
  const priceLabel =
    model === 'single_session' ? 'pro Einheit' :
    model === 'monthly' ? 'pro Monat' :
    model === 'package' && offer.included_sessions ? `für ${offer.included_sessions} Einheiten` :
    offer.type === 'discovery' ? 'Erstgespräch' : 'Abrechnung nicht klassifiziert';
  return { mode: mode ?? 'Trainingsform nicht klassifiziert', priceLabel };
}

export default function TrainerPublicProfile() {
  const params = useParams<{ id: string }>();
  const trainerId = params.id;
  const auth = useAuthProfile();

  const [trainer, setTrainer] = useState<PublicTrainer | null>(null);
  const [offers, setOffers] = useState<TrainerOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const returnPath = `/trainer/${trainerId}`;

  useEffect(() => {
    async function loadPublicData() {
      if (!trainerId) return;

      async function loadTrainerColumns(columns: string) {
        return supabase
          .from('trainers_public')
          .select(columns)
          .eq('id', trainerId)
          .maybeSingle();
      }

      async function loadTrainer() {
        const publicColumns = 'id, name, bio, city, service_mode, specialties, target_levels, qualifications, avatar_url, instagram_url, tiktok_url, hourly_rate';
        const enrichedResult = await loadTrainerColumns(publicColumns);
        if (!isMissingPhase3MetadataError(enrichedResult.error)) return enrichedResult;

        return loadTrainerColumns(
          'id, name, bio, city, service_mode, specialties, qualifications, avatar_url, instagram_url, tiktok_url, hourly_rate'
        );
      }

      const [trainerResult, initialOfferResult] = await Promise.all([
        loadTrainer(),
        supabase
          .from('trainer_offers')
          .select('id, title, type, duration_minutes, price, description, service_mode, pricing_model, included_sessions')
          .eq('trainer_id', trainerId)
          .eq('is_active', true)
          .order('created_at', { ascending: true }),
      ]);

      let loadedTrainer = trainerResult.data as unknown as PublicTrainer | null;
      let loadedOffers: TrainerOffer[];
      if (isMissingRelationError(trainerResult.error, 'trainers_public')) {
        const response = await fetch(
          `/api/public/matching-data?trainerId=${encodeURIComponent(trainerId)}`,
          { cache: 'no-store' }
        );
        if (!response.ok) {
          console.error('Öffentliches Trainerprofil konnte nicht vollständig geladen werden.');
          setLoadError(true);
          setLoading(false);
          return;
        }
        const fallback = await response.json() as PublicTrainerFallbackResponse;
        loadedTrainer = fallback.trainers?.[0] ?? null;
        loadedOffers = fallback.offers ?? [];
      } else if (trainerResult.error) {
        console.error('Öffentliches Trainerprofil konnte nicht vollständig geladen werden.');
        setLoadError(true);
        setLoading(false);
        return;
      } else if (initialOfferResult.error) {
        if (!isMissingPhase3MetadataError(initialOfferResult.error)) {
          console.error('Öffentliches Trainerprofil konnte nicht vollständig geladen werden.');
          setLoadError(true);
          setLoading(false);
          return;
        }
        const legacyOfferResult = await supabase
            .from('trainer_offers')
            .select('id, title, type, duration_minutes, price, description')
            .eq('trainer_id', trainerId)
            .eq('is_active', true)
            .order('created_at', { ascending: true });
        if (legacyOfferResult.error) {
          console.error('Öffentliches Trainerprofil konnte nicht vollständig geladen werden.');
          setLoadError(true);
          setLoading(false);
          return;
        }
        loadedOffers = (legacyOfferResult.data ?? []) as TrainerOffer[];
      } else {
        loadedOffers = (initialOfferResult.data ?? []) as TrainerOffer[];
      }
      loadedOffers = loadedOffers.filter((offer) => isOfferTypePriceValid(offer.type, offer.price));

      if (loadedTrainer) setTrainer(loadedTrainer);
      setOffers(loadedOffers);

      setLoading(false);
    }

    loadPublicData();
  }, [trainerId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-canvas text-ink">
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

  if (loadError || !trainer) {
    return (
      <main className="flex min-h-screen flex-col bg-canvas text-ink">
        <header className="border-b border-line"><div className="mx-auto flex w-full max-w-7xl px-5 py-5 sm:px-8 lg:px-10"><BrandMark className="text-xl sm:text-2xl" /></div></header>
        <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-5 py-16 sm:px-8 lg:px-10">
          <p className="text-sm font-semibold text-accent">Profil nicht verfügbar</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            {loadError ? 'Das Trainerprofil konnte nicht geladen werden.' : 'Dieser Trainer wurde nicht gefunden.'}
          </h1>
          <Link href="/trainer/list" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-accent hover:text-accent">
            <ArrowLeft size={16} aria-hidden /> Zu den verifizierten Trainern
          </Link>
        </section>
        <Footer />
      </main>
    );
  }

  const specialtyList = parseSpecialties(trainer.specialties);
  const targetLevels = normalizeTargetLevels(trainer.target_levels);
  const paidOfferPrices = offers
    .filter((offer) => offer.type === 'paid' && isOfferTypePriceValid(offer.type, offer.price))
    .map((offer) => normalizeDatabasePrice(offer.price))
    .filter((price): price is number => price !== null && price > 0);
  const minimumPaidOfferPrice = paidOfferPrices.length > 0 ? Math.min(...paidOfferPrices) : null;
  const hasHourlyRate = trainer.hourly_rate !== null && Number(trainer.hourly_rate) > 0;

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-line bg-canvas">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
          <BrandMark className="text-xl sm:text-2xl" />
          <div className="flex items-center gap-3">
            <ThemeToggle compact />
            <Link href="/trainer/list" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink">
              <ArrowLeft size={15} aria-hidden /> Alle Trainer
            </Link>
            {!auth.loading && !auth.userId && (
              <Link
                href={withNext('/client/login', returnPath)}
                className="inline-flex min-h-10 items-center rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface-soft"
              >
                Kunden-Login
              </Link>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
        <div className="grid gap-10 border-b border-line pb-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
          <div>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line-strong bg-surface text-2xl font-bold text-accent">
                {trainer.avatar_url ? (
                  <img src={trainer.avatar_url} alt={trainer.name || 'Trainer'} className="w-full h-full object-cover" />
                ) : (
                  <span>{trainer.name?.charAt(0) || 'T'}</span>
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">{trainer.name || 'Trainer'}</h1>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/45 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
                    <BadgeCheck size={15} aria-hidden /> Verifiziert
                  </span>
                </div>
                <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                  <MapPin size={15} aria-hidden /> {trainer.city || 'Standort flexibel'} <span aria-hidden>·</span>{' '}
                  <span>{trainer.service_mode || 'Trainingsform im Profil'}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="border-l border-line-strong pl-5 tabular-nums">
            <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
              {hasHourlyRate ? 'Stundensatz / Basis' : minimumPaidOfferPrice !== null ? 'Bezahlte Angebote' : 'Preisangabe'}
            </span>
            <span className="mt-2 block text-2xl font-semibold text-ink">
              {hasHourlyRate
                ? `${Number(trainer.hourly_rate).toFixed(2).replace('.', ',')} € / Std.`
                : minimumPaidOfferPrice !== null
                  ? `ab ${formatPrice(minimumPaidOfferPrice)}`
                  : 'Nicht hinterlegt'}
            </span>
            <a href="#anfrage" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-accent hover:text-accent">
              Angebote und Anfrage <ArrowUpRight size={16} aria-hidden />
            </a>
          </div>
        </div>

        <div className="grid gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Über das Training</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">Ansatz und Philosophie</h2>
              <p className="mt-5 max-w-3xl whitespace-pre-line text-base leading-8 text-ink-soft">{trainer.bio || 'Noch keine Biografie hinterlegt.'}</p>
            </div>

            {trainer.qualifications && (
              <div className="border-t border-line pt-8">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Qualifikationen und Zertifikate</p>
                <p className="mt-4 whitespace-pre-line text-sm leading-7 text-ink-soft">
                  {trainer.qualifications}
                </p>
              </div>
            )}
          </div>

          <aside className="border-t border-line pt-8 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Fachgebiete</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {specialtyList.length > 0 ? specialtyList.map((specialty) => (
                <span key={specialty} className="rounded-md border border-line-strong bg-surface px-3 py-2 text-xs font-medium text-ink-soft">{specialty}</span>
              )) : <p className="text-sm text-ink-muted">Noch keine Angaben</p>}
            </div>
            <div className="mt-8 border-t border-line pt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Betreute Trainingsniveaus</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {targetLevels.length > 0 ? targetLevels.map((level) => (
                  <span key={level} className="rounded-md border border-line-strong bg-surface px-3 py-2 text-xs font-medium text-ink-soft">{level}</span>
                )) : <p className="text-sm text-ink-muted">Noch keine Angaben</p>}
              </div>
            </div>
            <div className="mt-8 flex items-start gap-3 border-t border-line pt-6">
              <ShieldCheck className="mt-0.5 shrink-0 text-accent" size={20} aria-hidden />
              <p className="text-sm leading-6 text-ink-muted">Trainerlizenz und Berufshaftpflicht wurden von VeriFit manuell geprüft.</p>
            </div>
            {(trainer.instagram_url || trainer.tiktok_url) && (
              <div className="mt-8 flex flex-wrap gap-3 border-t border-line pt-6">
                {trainer.instagram_url && <a href={trainer.instagram_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink">Instagram <ExternalLink size={14} aria-hidden /></a>}
                {trainer.tiktok_url && <a href={trainer.tiktok_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink">TikTok <ExternalLink size={14} aria-hidden /></a>}
              </div>
            )}
          </aside>
        </div>

        <section className="border-t border-line pt-12">
          <p className="text-sm font-semibold text-accent">Angebote</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Mögliche Zusammenarbeit.</h2>
          {offers.length === 0 ? (
            <p className="mt-7 border-y border-line py-6 text-sm text-ink-muted">
              Dieser Trainer hat derzeit kein konkretes Angebot hinterlegt. Eine allgemeine Anfrage ist trotzdem möglich.
            </p>
          ) : (
            <div className="mt-7 grid gap-4 md:grid-cols-2">
              {offers.map((offer) => {
                const details = offerDetails(offer);
                return (
                  <article key={offer.id} className="rounded-2xl border border-line bg-surface p-5">
                    <p className="text-xs font-semibold text-accent">
                      {offer.type === 'discovery' ? 'Kostenloses Erstgespräch' : 'Kostenpflichtiges Angebot'}
                    </p>
                    <h3 className="mt-2 font-semibold text-ink">{offer.title}</h3>
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
                      <Clock size={13} aria-hidden /> {offer.duration_minutes} Minuten · {details.mode}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-ink tabular-nums">
                      {formatOfferPrice(offer)} · {details.priceLabel}
                    </p>
                    {offer.description && <p className="mt-3 text-sm leading-6 text-ink-muted">{offer.description}</p>}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <InquiryForm
          key={trainerId}
          trainerId={trainerId}
          trainerName={trainer.name || 'den Trainer'}
          offers={offers.map((offer) => ({ id: offer.id, title: offer.title }))}
          authLoading={auth.loading}
          userId={auth.userId}
          role={auth.role}
          dashboardHref={auth.homeHref}
          returnPath={returnPath}
        />
      </section>

      <Footer />
    </main>
  );
}
