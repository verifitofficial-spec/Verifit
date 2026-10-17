'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, BadgeCheck, MapPin, RotateCcw } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import BrandMark from '@/components/BrandMark';
import Footer from '@/components/Footer';
import ThemeToggle from '@/components/ThemeToggle';
import { SkeletonBlock } from '@/components/Skeleton';
import { SPECIALTY_CATEGORIES, parseSpecialties } from '@/lib/constants';
import { isMissingRelationError } from '@/lib/supabaseErrors';
import { useAuthProfile } from '@/lib/useAuthProfile';
import {
  getAvailableExperienceLevels,
  getAvailableGoals,
  getAvailableServiceModes,
  isMissingPhase3MetadataError,
  normalizeDatabasePrice,
  normalizePricingModel,
  normalizeServiceMode,
  normalizeTargetLevels,
  partitionMatchingTrainers,
  reconcileDynamicMatchingAnswers,
  type AlternativeTrainerMatch,
  type ExperienceLevel,
  type ExactTrainerMatch,
  type MatchingAnswers,
  type MatchingOffer,
  type ServiceMode,
} from '@/lib/matching';

type QuizTrainer = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  specialtyList: string[];
  specialties: string[];
  targetLevels: ExperienceLevel[];
  offers: MatchingOffer[];
};

type QuizAnswers = {
  experience: ExperienceLevel | '';
  goal: string;
  mode: ServiceMode | '';
  sessionsPerMonth: number | null;
  monthlyBudget: number | null;
};

type TrainerRow = {
  id: string; name: string | null; avatar_url: string | null; bio: string | null;
  city: string | null; specialties: string | null; target_levels?: unknown;
};

type OfferRow = {
  id: string; trainer_id: string; title: string; type: 'discovery' | 'paid'; price: number | string | null;
  duration_minutes?: number | null; service_mode?: unknown; pricing_model?: unknown; included_sessions?: number | null;
};

type MatchingDataResponse = {
  trainers: TrainerRow[];
  offers: OfferRow[];
  metadataReady: boolean;
};

const EMPTY_ANSWERS: QuizAnswers = {
  experience: '', goal: '', mode: '', sessionsPerMonth: null, monthlyBudget: null,
};

const optionBtn =
  'group flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 border-t border-line px-1 py-4 text-left text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent';

function formatEuro(value: number) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function TrainerResultList({
  results,
  answers,
  startIndex = 0,
}: {
  results: Array<ExactTrainerMatch<QuizTrainer> | AlternativeTrainerMatch<QuizTrainer>>;
  answers: QuizAnswers;
  startIndex?: number;
}) {
  return results.map(({ trainer, offers }, index) => (
    <article key={trainer.id} className="grid gap-6 border-b border-line py-8 lg:grid-cols-[4rem_minmax(0,0.9fr)_minmax(18rem,1.1fr)_auto] lg:items-start">
      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-line-strong bg-surface text-sm font-bold text-accent">
        {trainer.avatar_url ? <img src={trainer.avatar_url} alt="" className="h-full w-full object-cover" /> : <span>{trainer.name?.charAt(0) || 'T'}</span>}
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-xs text-ink-muted">{String(startIndex + index + 1).padStart(2, '0')}</span>
          <h3 className="text-2xl font-semibold tracking-tight">{trainer.name || 'Trainer'}</h3>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
            <BadgeCheck size={14} aria-hidden /> Verifiziert
          </span>
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          <MapPin size={14} aria-hidden /> {trainer.city || 'Kein Standort hinterlegt'} <span aria-hidden>·</span> {answers.mode}
        </p>
        <p className="mt-4 text-sm font-medium leading-6 text-ink-soft">
          Passt zu {answers.goal} und dem Niveau {answers.experience}.
        </p>
      </div>
      <div className="space-y-4 text-sm">
        {offers.map((matchedOffer) => {
          const { offer, comparison } = matchedOffer;
          const reason = 'reason' in matchedOffer ? matchedOffer.reason : null;
          const status = reason?.type === 'budget_exceeded'
            ? `${formatEuro(reason.amount)} über deinem Monatsbudget`
            : reason?.type === 'package_not_monthly_comparable'
              ? 'Monatlich nicht vergleichbar'
              : 'Im Budget';
          return (
            <div key={offer.id} className="border-l border-line-strong pl-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-ink">
                  {offer.title}
                  {offer.durationMinutes !== null && (
                    <span className="ml-2 text-xs font-normal text-ink-muted">· {offer.durationMinutes} Min.</span>
                  )}
                </p>
                <span className={`text-xs font-semibold ${reason?.type === 'budget_exceeded' ? 'text-warning' : reason ? 'text-ink-muted' : 'text-accent'}`}>
                  {status}
                </span>
              </div>
              <p className="mt-1 font-medium text-ink-soft tabular-nums">{comparison.label}</p>
              <p className="mt-1 text-xs leading-5 text-ink-muted">{comparison.explanation}</p>
            </div>
          );
        })}
      </div>
      <Link
        href={`/trainer/${trainer.id}`}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
      >
        Profil ansehen <ArrowRight size={16} aria-hidden />
      </Link>
    </article>
  ));
}

export default function QuizPage() {
  const router = useRouter();
  const auth = useAuthProfile();
  const [trainers, setTrainers] = useState<QuizTrainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [metadataReady, setMetadataReady] = useState(true);
  const [view, setView] = useState<'quiz' | 'results'>('quiz');
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<QuizAnswers>(EMPTY_ANSWERS);

  useEffect(() => {
    async function fetchData() {
      async function loadTrainerRows(columns: string) {
        return supabase.from('trainers_public').select(columns);
      }

      const enrichedTrainerRes = await loadTrainerRows(
        'id, name, bio, avatar_url, city, specialties, target_levels'
      );
      const enrichedOfferRes = await supabase
        .from('trainer_offers')
        .select('id, trainer_id, title, type, price, duration_minutes, service_mode, pricing_model, included_sessions')
        .eq('is_active', true);

      let trainerRows = (enrichedTrainerRes.data ?? []) as unknown as TrainerRow[];
      let offerRows = (enrichedOfferRes.data ?? []) as OfferRow[];

      if (isMissingRelationError(enrichedTrainerRes.error, 'trainers_public')) {
        const compatibilityResponse = await fetch('/api/public/matching-data', {
          cache: 'no-store',
        });
        if (!compatibilityResponse.ok) {
          console.error('Matching-Daten konnten nicht vollständig geladen werden.');
          setLoadError(true);
          setLoading(false);
          return;
        }

        const compatibilityData = await compatibilityResponse.json() as MatchingDataResponse;
        trainerRows = compatibilityData.trainers;
        offerRows = compatibilityData.offers;
        setMetadataReady(compatibilityData.metadataReady);
      } else {
        const metadataErrors = [enrichedTrainerRes.error, enrichedOfferRes.error].filter(Boolean);
        if (metadataErrors.length > 0) {
          if (!metadataErrors.every(isMissingPhase3MetadataError)) {
            console.error('Matching-Daten konnten nicht vollständig geladen werden.');
            setLoadError(true);
            setLoading(false);
            return;
          }
          setMetadataReady(false);
          const [legacyTrainerRes, legacyOfferRes] = await Promise.all([
            loadTrainerRows('id, name, bio, avatar_url, city, specialties'),
            supabase.from('trainer_offers').select('id, trainer_id, title, type, price').eq('is_active', true),
          ]);
          if (legacyTrainerRes.error || legacyOfferRes.error) {
            console.error('Matching-Daten konnten nicht vollständig geladen werden.');
            setLoadError(true);
            setLoading(false);
            return;
          }
          trainerRows = (legacyTrainerRes.data ?? []) as unknown as TrainerRow[];
          offerRows = (legacyOfferRes.data ?? []) as OfferRow[];
        }
      }

      const offersByTrainer = new Map<string, MatchingOffer[]>();
      for (const rawOffer of offerRows) {
        const durationMinutes = rawOffer.duration_minutes ?? null;
        const offer: MatchingOffer = {
          id: rawOffer.id,
          title: rawOffer.title,
          type: rawOffer.type,
          isActive: true,
          price: normalizeDatabasePrice(rawOffer.price),
          durationMinutes:
            durationMinutes !== null && Number.isFinite(durationMinutes) && durationMinutes > 0
              ? durationMinutes
              : null,
          serviceMode: normalizeServiceMode(rawOffer.service_mode),
          pricingModel: normalizePricingModel(rawOffer.pricing_model),
          includedSessions: rawOffer.included_sessions ?? null,
        };
        offersByTrainer.set(rawOffer.trainer_id, [...(offersByTrainer.get(rawOffer.trainer_id) ?? []), offer]);
      }

      setTrainers(
        trainerRows.map((t) => ({
            id: t.id,
            name: t.name,
            avatar_url: t.avatar_url,
            bio: t.bio,
            city: t.city,
            specialtyList: parseSpecialties(t.specialties),
            specialties: parseSpecialties(t.specialties),
            targetLevels: normalizeTargetLevels(t.target_levels),
            offers: offersByTrainer.get(t.id) ?? [],
          }))
      );
      setLoading(false);
    }

    fetchData();
  }, []);

  const matchingCandidates = useMemo(() => (metadataReady ? trainers : []), [metadataReady, trainers]);
  const availableExperienceLevels = useMemo(
    () => getAvailableExperienceLevels(matchingCandidates),
    [matchingCandidates]
  );
  const availableGoals = useMemo(
    () => new Set(getAvailableGoals(matchingCandidates, answers.experience)),
    [matchingCandidates, answers.experience]
  );
  const availableModes = useMemo(
    () => getAvailableServiceModes(matchingCandidates, answers),
    [matchingCandidates, answers]
  );

  const results = useMemo(() => {
    if (
      view !== 'results' || !answers.experience || !answers.goal || !answers.mode ||
      !answers.sessionsPerMonth || !answers.monthlyBudget
    ) return { exact: [], alternatives: [] };
    return partitionMatchingTrainers(matchingCandidates, answers as MatchingAnswers);
  }, [view, matchingCandidates, answers]);

  function handleSelectOption<K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) {
    const updated = reconcileDynamicMatchingAnswers(matchingCandidates, { ...answers, [key]: value });
    setAnswers(updated);
    if (step < 5) setStep((prev) => prev + 1);
    else setView('results');
  }

  function resetQuiz() {
    setStep(1);
    setAnswers(EMPTY_ANSWERS);
    setView('quiz');
  }

  const homeLabel = auth.homeHref ? 'Zum Dashboard' : 'Quiz verlassen';
  const questionTitles = [
    'Wie stufst du dein aktuelles Fitness-Level ein?',
    'Was ist dein primäres Trainingsziel?',
    'Wie möchtest du trainieren?',
    'Wie oft möchtest du pro Monat betreut trainieren?',
    'Wie hoch ist dein monatliches Budget?',
  ];

  return (
    <main className="flex min-h-screen flex-col justify-between bg-canvas text-ink">
      <header className="border-b border-line bg-canvas">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
          <BrandMark className="text-xl sm:text-2xl" />
          <div className="flex items-center gap-3">
            {view === 'quiz' && <span className="hidden text-sm font-medium text-ink-muted sm:inline">Schritt {step} von 5</span>}
            <ThemeToggle compact />
            <button
              type="button"
              onClick={() => router.push(auth.homeHref ?? '/')}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-soft hover:text-ink"
            >
              <ArrowLeft size={15} aria-hidden />
              {homeLabel}
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-7xl flex-1 px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
        {view === 'quiz' ? (
          <div className="grid w-full gap-10 lg:grid-cols-[0.65fr_1.35fr] lg:gap-20">
            <aside className="lg:pt-3">
              <p className="text-sm font-semibold text-accent">Persönliches Matching</p>
              <p className="mt-4 max-w-sm text-sm leading-6 text-ink-muted">
                Fünf Angaben gleichen dein Ziel mit ausdrücklich gepflegten Trainer- und Angebotsdaten ab.
              </p>
              <div
                className="mt-8 grid grid-cols-5 gap-2"
                role="progressbar"
                aria-label="Fortschritt im Matching"
                aria-valuemin={1}
                aria-valuemax={5}
                aria-valuenow={step}
                aria-valuetext={`Schritt ${step} von 5`}
              >
                {[1, 2, 3, 4, 5].map((progressStep) => (
                  <span
                    key={progressStep}
                    className={`h-1 rounded-full ${progressStep <= step ? 'bg-accent-strong' : 'bg-surface-soft'}`}
                    aria-hidden
                  />
                ))}
              </div>
              {!loading && !loadError && !metadataReady && (
                <div role="alert" className="mt-6 rounded-xl border border-warning-line bg-warning-soft p-4 text-sm leading-6 text-warning">
                  Das Matching kann mit dieser Datenbank noch keine verlässlichen Ergebnisse liefern. Die benötigten Phase-3-Felder fehlen.
                </div>
              )}
              <dl className="mt-8 space-y-4 border-t border-line pt-6 text-sm">
                {answers.experience && <div><dt className="text-ink-muted">Erfahrung</dt><dd className="mt-1 text-ink-soft">{answers.experience}</dd></div>}
                {answers.goal && <div><dt className="text-ink-muted">Ziel</dt><dd className="mt-1 text-ink-soft">{answers.goal}</dd></div>}
                {answers.mode && <div><dt className="text-ink-muted">Trainingsform</dt><dd className="mt-1 text-ink-soft">{answers.mode}</dd></div>}
                {answers.sessionsPerMonth && <div><dt className="text-ink-muted">Umfang</dt><dd className="mt-1 text-ink-soft">{answers.sessionsPerMonth} Einheiten / Monat</dd></div>}
                {answers.monthlyBudget && <div><dt className="text-ink-muted">Budget</dt><dd className="mt-1 text-ink-soft tabular-nums">{Number.isFinite(answers.monthlyBudget) ? `bis ${answers.monthlyBudget} € / Monat` : 'Flexibel'}</dd></div>}
              </dl>
            </aside>

            <div>
              <p className="font-mono text-sm text-accent tabular-nums">0{step} / 05</p>
              <h1 className="mt-4 max-w-3xl text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl lg:text-5xl">
                {questionTitles[step - 1]}
              </h1>
              {step === 5 && <p className="mt-5 max-w-2xl text-sm leading-6 text-ink-muted">Das Budget wird mit berechenbaren Monatskosten verglichen. Nicht vergleichbare Pakete bleiben ausdrücklich unbewertet.</p>}

            {step === 1 && (
              <div className="mt-10 border-b border-line">
                {loading ? (
                  <div className="space-y-3" aria-label="Verfügbare Kundenniveaus werden geladen">
                    <SkeletonBlock className="h-14 w-full" />
                    <SkeletonBlock className="h-14 w-full" />
                    <SkeletonBlock className="h-14 w-full" />
                  </div>
                ) : loadError ? (
                  <div role="alert" className="border-y border-danger-line bg-danger-soft py-6 text-sm text-danger">
                    Die verfügbaren Kundenniveaus konnten nicht geladen werden. Bitte lade die Seite erneut.
                  </div>
                ) : availableExperienceLevels.length === 0 ? (
                  <p className="border-y border-line py-6 text-sm text-ink-muted">Aktuell sind keine zuverlässig passenden Trainerangebote verfügbar.</p>
                ) : ([
                  { label: 'Leistungssportler / Profi', val: 'Profi' as ExperienceLevel },
                  { label: 'Fortgeschritten (trainiere regelmäßig & zielgerichtet)', val: 'Fortgeschritten' as ExperienceLevel },
                  { label: 'Anfänger / Wiedereinsteiger', val: 'Anfänger' as ExperienceLevel },
                ].filter((opt) => availableExperienceLevels.includes(opt.val)).map((opt, index) => (
                  <button key={opt.val} onClick={() => handleSelectOption('experience', opt.val)} className={optionBtn}>
                    <span className="flex items-center gap-4"><span className="font-mono text-xs text-ink-muted">0{index + 1}</span>{opt.label}</span>
                    <ArrowRight size={17} className="text-accent" aria-hidden />
                  </button>
                )))}
              </div>
            )}

            {step === 2 && (
              <div className="mt-10 space-y-8">
                {loading ? (
                  <div className="space-y-3" aria-label="Verfügbare Fachgebiete werden geladen">
                    <SkeletonBlock className="h-14 w-full" />
                    <SkeletonBlock className="h-14 w-full" />
                    <SkeletonBlock className="h-14 w-full" />
                  </div>
                ) : loadError ? (
                  <div role="alert" className="border-y border-danger-line bg-danger-soft py-6 text-sm text-danger">
                    Die verfügbaren Fachgebiete konnten nicht geladen werden. Bitte lade die Seite erneut.
                  </div>
                ) : availableGoals.size === 0 ? (
                  <p className="border-y border-line py-6 text-sm text-ink-muted">Aktuell sind noch keine verifizierten Trainer verfügbar.</p>
                ) : (
                  SPECIALTY_CATEGORIES.map((block) => ({
                    ...block,
                    items: block.items.filter((item) => availableGoals.has(item)),
                  })).filter((block) => block.items.length > 0).map((block) => (
                    <div key={block.category}>
                      <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">{block.category}</h2>
                      <div className="border-b border-line">
                        {block.items.map((item) => {
                          return (
                            <button
                              key={item}
                              onClick={() => handleSelectOption('goal', item)}
                              className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 border-t border-line px-1 py-4 text-left text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
                            >
                              <span>{item}</span>
                              <ArrowRight size={17} className="text-accent" aria-hidden />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {step === 3 && (
              <div className="mt-10 border-b border-line">
                {availableModes.length === 0 ? (
                  <p className="border-y border-line py-6 text-sm text-ink-muted">Für diese Auswahl ist aktuell keine Trainingsform verfügbar.</p>
                ) : ([
                  { label: 'Vor Ort (Personal Training / Studio)', val: 'Vor Ort' as ServiceMode },
                  { label: 'Online-Coaching (Digital & App-basiert)', val: 'Online' as ServiceMode },
                  { label: 'Hybrid (Kombination aus beidem)', val: 'Hybrid' as ServiceMode },
                ].filter((opt) => availableModes.includes(opt.val)).map((opt, index) => (
                  <button key={opt.val} onClick={() => handleSelectOption('mode', opt.val)} className={optionBtn}>
                    <span className="flex items-center gap-4"><span className="font-mono text-xs text-ink-muted">0{index + 1}</span>{opt.label}</span>
                    <ArrowRight size={17} className="text-accent" aria-hidden />
                  </button>
                )))}
              </div>
            )}

            {step === 4 && (
              <div className="mt-10 border-b border-line">
                {[
                  { label: '1 betreute Einheit pro Monat', val: 1 },
                  { label: '2 betreute Einheiten pro Monat', val: 2 },
                  { label: '4 betreute Einheiten pro Monat', val: 4 },
                  { label: '8 betreute Einheiten pro Monat', val: 8 },
                ].map((opt, index) => (
                  <button key={opt.val} onClick={() => handleSelectOption('sessionsPerMonth', opt.val)} className={optionBtn}>
                    <span className="flex items-center gap-4 tabular-nums"><span className="font-mono text-xs text-ink-muted">0{index + 1}</span>{opt.label}</span>
                    <ArrowRight size={17} className="text-accent" aria-hidden />
                  </button>
                ))}
              </div>
            )}

            {step === 5 && (
              <div className="mt-10 border-b border-line">
                {[
                  { label: 'Bis 150 € pro Monat', val: 150 },
                  { label: 'Bis 250 € pro Monat', val: 250 },
                  { label: 'Bis 400 € pro Monat', val: 400 },
                  { label: 'Bis 600 € pro Monat', val: 600 },
                  { label: 'Budget flexibel', val: Number.POSITIVE_INFINITY },
                ].map((opt, index) => (
                  <button key={opt.val} onClick={() => handleSelectOption('monthlyBudget', opt.val)} className={optionBtn}>
                    <span className="flex items-center gap-4 tabular-nums"><span className="font-mono text-xs text-ink-muted">0{index + 1}</span>{opt.label}</span>
                    <ArrowRight size={17} className="text-accent" aria-hidden />
                  </button>
                ))}
              </div>
            )}

            {step > 1 && (
              <div className="pt-7">
                <button type="button" onClick={() => setStep((prev) => prev - 1)} className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink">
                  <ArrowLeft size={16} aria-hidden /> Einen Schritt zurück
                </button>
              </div>
            )}
            </div>
          </div>
        ) : (
          <div className="w-full">
            <div className="flex flex-col items-start justify-between gap-5 border-b border-line pb-8 md:flex-row md:items-end">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold text-accent">Dein Matching-Ergebnis</p>
                <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Passende Trainerprofile.</h1>
                <p className="mt-4 text-sm leading-6 text-ink-muted">Fachlich passende Profile werden nach Budgetvergleich gruppiert und innerhalb der Gruppen stabil nach Name sortiert. Es gibt keinen undurchsichtigen Prozent-Score.</p>
              </div>
              <button
                type="button"
                onClick={resetQuiz}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface-soft hover:text-ink"
              >
                <RotateCcw size={16} aria-hidden /> Quiz neu starten
              </button>
            </div>

            {!metadataReady ? (
              <div role="alert" className="border-b border-warning-line py-12">
                <h2 className="text-xl font-semibold text-ink">Matching derzeit nicht verfügbar.</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
                  Die verbundenen Datenbanktabellen enthalten die benötigten Zielgruppen- und Angebotsfelder noch nicht. Deshalb werden keine vermeintlich passenden Trainer angezeigt.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button onClick={resetQuiz} className="min-h-11 cursor-pointer rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-accent-strong">
                    Quiz neu starten
                  </button>
                  <Link href="/trainer/list" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line-strong bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-soft">
                    Alle Trainer ansehen
                  </Link>
                </div>
              </div>
            ) : results.exact.length === 0 && results.alternatives.length === 0 ? (
              <div className="border-b border-line py-12">
                <h2 className="text-xl font-semibold text-ink">Keine exakte Übereinstimmung gefunden.</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
                  Es gibt aktuell kein Profil mit ausdrücklich passendem Ziel, Niveau, Trainingsform und einem belastbar bewertbaren Angebot. Fehlende Angaben werden nicht als Eignung gewertet.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button onClick={resetQuiz} className="min-h-11 cursor-pointer rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-accent-strong">
                    Quiz neu starten
                  </button>
                  <Link href="/trainer/list" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line-strong bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-soft">
                    Alle Trainer ansehen
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-14 pt-10">
                {results.exact.length > 0 ? (
                  <section aria-labelledby="exact-results-heading">
                    <div className="border-b border-line pb-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Primäre Ergebnisse</p>
                      <h2 id="exact-results-heading" className="mt-2 text-2xl font-semibold text-ink">Exakte Treffer</h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
                        Niveau, Fachgebiet und Trainingsform passen. Mindestens ein monatlich vergleichbares Angebot liegt in deinem Budget.
                      </p>
                    </div>
                    <TrainerResultList results={results.exact} answers={answers} />
                  </section>
                ) : (
                  <section aria-labelledby="exact-results-heading" className="border-b border-line pb-8">
                    <h2 id="exact-results-heading" className="text-2xl font-semibold text-ink">Keine exakten Treffer</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
                      Die Kernkriterien passen, aber derzeit liegt kein belastbar vergleichbares Angebot innerhalb deines Monatsbudgets.
                    </p>
                  </section>
                )}

                {results.alternatives.length > 0 && (
                  <section aria-labelledby="alternative-results-heading">
                    <div className="border-b border-line pb-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Weitere Optionen</p>
                      <h2 id="alternative-results-heading" className="mt-2 text-2xl font-semibold text-ink">Ähnliche Alternativen</h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
                        Diese Trainer erfüllen deine Kernkriterien, weichen aber beim Budget ab oder bieten ein Paket ohne hinterlegte Laufzeit an.
                      </p>
                    </div>
                    <TrainerResultList
                      results={results.alternatives}
                      answers={answers}
                      startIndex={results.exact.length}
                    />
                  </section>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
