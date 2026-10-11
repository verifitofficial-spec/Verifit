'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, BadgeCheck, CalendarDays, MapPin, RotateCcw } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import BrandMark from '@/components/BrandMark';
import Footer from '@/components/Footer';
import { SkeletonBlock } from '@/components/Skeleton';
import { SPECIALTY_CATEGORIES, parseSpecialties } from '@/lib/constants';
import { useAuthProfile } from '@/lib/useAuthProfile';

type QuizTrainer = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  service_mode: string | null;
  specialtyList: string[];
  minPrice: number | null;
  freeSlots: number;
};

type QuizAnswers = {
  experience: string;
  goal: string;
  mode: string;
  budget: string;
};

type PriceRange = { min: number; max: number };

const EMPTY_ANSWERS: QuizAnswers = { experience: '', goal: '', mode: '', budget: '' };

function matchesExperience(t: QuizTrainer, experience: string) {
  if (!experience) return true;
  const context = `${t.bio ?? ''} ${t.specialtyList.join(' ')}`.toLowerCase();
  if (experience === 'Anfänger' && (context.includes('nur profis') || context.includes('leistungssportler'))) return false;
  if (experience === 'Profi' && (context.includes('nur anfänger') || context.includes('einsteiger'))) return false;
  return true;
}

function matchesMode(t: QuizTrainer, mode: string) {
  if (!mode) return true;
  const sm = (t.service_mode ?? '').toLowerCase();
  if (!sm) return true;
  const onsite = sm.includes('vor ort');
  const online = sm.includes('online');
  const hybrid = sm.includes('hybrid') || (onsite && online);
  if (mode === 'Vor Ort') return onsite || hybrid;
  if (mode === 'Online') return online || hybrid;
  return hybrid;
}

function budgetThresholds(range: PriceRange) {
  const third = (range.max - range.min) / 3;
  return { t1: range.min + third, t2: range.min + third * 2 };
}

function matchesBudget(t: QuizTrainer, budget: string, range: PriceRange) {
  if (!budget || t.minPrice === null || range.max === range.min) return true;
  const { t1, t2 } = budgetThresholds(range);
  if (budget === 'low') return t.minPrice <= t1;
  if (budget === 'mid') return t.minPrice > t1 && t.minPrice <= t2;
  return t.minPrice > t2;
}

function filterTrainers(list: QuizTrainer[], answers: QuizAnswers, withBudget: boolean, range: PriceRange) {
  return list.filter(
    (t) =>
      matchesExperience(t, answers.experience) &&
      (!answers.goal || t.specialtyList.includes(answers.goal)) &&
      matchesMode(t, answers.mode) &&
      (!withBudget || matchesBudget(t, answers.budget, range))
  );
}

const optionBtn =
  'group flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 border-t border-slate-800 px-1 py-4 text-left text-sm font-semibold text-white transition-colors hover:border-emerald-500 hover:text-emerald-300';

export default function QuizPage() {
  const router = useRouter();
  const auth = useAuthProfile();
  const [trainers, setTrainers] = useState<QuizTrainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [view, setView] = useState<'quiz' | 'results'>('quiz');
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<QuizAnswers>(EMPTY_ANSWERS);

  useEffect(() => {
    async function fetchData() {
      const today = new Date().toLocaleDateString('en-CA');
      const [trainerRes, offerRes, slotRes] = await Promise.all([
        supabase
          .from('trainers')
          .select('id, name, bio, avatar_url, city, service_mode, specialties, package_price')
          .eq('status', 'approved'),
        supabase.from('trainer_offers').select('trainer_id, price, type').eq('is_active', true),
        supabase.from('trainer_slots').select('trainer_id').eq('status', 'free').gte('slot_date', today),
      ]);

      if (trainerRes.error) {
        console.error('Fehler beim Laden der Trainer:', trainerRes.error.message);
        setLoadError(true);
        setLoading(false);
        return;
      }

      const minPriceByTrainer = new Map<string, number>();
      for (const offer of offerRes.data ?? []) {
        const price = Number(offer.price);
        if (offer.type !== 'paid' || !(price > 0)) continue;
        const current = minPriceByTrainer.get(offer.trainer_id);
        if (current === undefined || price < current) minPriceByTrainer.set(offer.trainer_id, price);
      }

      const slotsByTrainer = new Map<string, number>();
      for (const slot of slotRes.data ?? []) {
        slotsByTrainer.set(slot.trainer_id, (slotsByTrainer.get(slot.trainer_id) ?? 0) + 1);
      }

      setTrainers(
        (trainerRes.data ?? []).map((t) => {
          const legacyPrice = Number(t.package_price);
          return {
            id: t.id,
            name: t.name,
            avatar_url: t.avatar_url,
            bio: t.bio,
            city: t.city,
            service_mode: t.service_mode,
            specialtyList: parseSpecialties(t.specialties),
            minPrice: minPriceByTrainer.get(t.id) ?? (legacyPrice > 0 ? legacyPrice : null),
            freeSlots: slotsByTrainer.get(t.id) ?? 0,
          };
        })
      );
      setLoading(false);
    }

    fetchData();
  }, []);

  const availableGoals = useMemo(() => new Set(trainers.flatMap((t) => t.specialtyList)), [trainers]);

  // Preisspanne richtet sich nach den Trainern, die zu Erfahrung, Ziel und Trainingsform passen.
  const priceRange = useMemo<PriceRange>(() => {
    const prices = filterTrainers(trainers, answers, false, { min: 0, max: 0 })
      .map((t) => t.minPrice)
      .filter((p): p is number => p !== null);
    return prices.length > 0 ? { min: Math.min(...prices), max: Math.max(...prices) } : { min: 50, max: 300 };
  }, [trainers, answers]);

  const results = useMemo(() => {
    if (view !== 'results') return [];
    return filterTrainers(trainers, answers, true, priceRange).sort(
      (a, b) => Number(b.freeSlots > 0) - Number(a.freeSlots > 0) || (a.name ?? '').localeCompare(b.name ?? '', 'de')
    );
  }, [view, trainers, answers, priceRange]);

  function handleSelectOption(key: keyof QuizAnswers, value: string) {
    const updated = { ...answers, [key]: value };
    setAnswers(updated);
    if (step < 4) setStep((prev) => prev + 1);
    else setView('results');
  }

  function resetQuiz() {
    setStep(1);
    setAnswers(EMPTY_ANSWERS);
    setView('quiz');
  }

  const { t1, t2 } = budgetThresholds(priceRange);
  const homeLabel = auth.homeHref ? 'Zum Dashboard' : 'Quiz verlassen';
  const questionTitles = [
    'Wie stufst du dein aktuelles Fitness-Level ein?',
    'Was ist dein primäres Trainingsziel?',
    'Wie möchtest du trainieren?',
    'Welches Budget passt zu deiner Planung?',
  ];

  return (
    <main className="flex min-h-screen flex-col justify-between bg-canvas text-ink">
      <header className="border-b border-line bg-canvas">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
          <BrandMark className="text-xl sm:text-2xl" />
          <div className="flex items-center gap-3">
            {view === 'quiz' && <span className="hidden text-sm font-medium text-slate-400 sm:inline">Schritt {step} von 4</span>}
          <button
            type="button"
            onClick={() => router.push(auth.homeHref ?? '/')}
            className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
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
              <p className="text-sm font-semibold text-emerald-400">Persönliches Matching</p>
              <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
                Vier Angaben helfen dabei, freigeschaltete Trainer nach deinem Ziel und deinen Rahmenbedingungen zu sortieren.
              </p>
              <div className="mt-8 grid grid-cols-4 gap-2" aria-label={`Schritt ${step} von 4`}>
                {[1, 2, 3, 4].map((progressStep) => (
                  <span
                    key={progressStep}
                    className={`h-1 rounded-full ${progressStep <= step ? 'bg-emerald-400' : 'bg-slate-800'}`}
                    aria-hidden
                  />
                ))}
              </div>
              <dl className="mt-8 space-y-4 border-t border-slate-800 pt-6 text-sm">
                {answers.experience && <div><dt className="text-slate-500">Erfahrung</dt><dd className="mt-1 text-slate-200">{answers.experience}</dd></div>}
                {answers.goal && <div><dt className="text-slate-500">Ziel</dt><dd className="mt-1 text-slate-200">{answers.goal}</dd></div>}
                {answers.mode && <div><dt className="text-slate-500">Trainingsform</dt><dd className="mt-1 text-slate-200">{answers.mode}</dd></div>}
              </dl>
            </aside>

            <div>
              <p className="font-mono text-sm text-emerald-400 tabular-nums">0{step} / 04</p>
              <h1 className="mt-4 max-w-3xl text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl lg:text-5xl">
                {questionTitles[step - 1]}
              </h1>
              {step === 4 && (
                <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-400 tabular-nums">
                  Basierend auf den aktuell hinterlegten Angeboten liegt die verfügbare Spanne bei etwa {Math.round(priceRange.min)} € bis {Math.round(priceRange.max)} €.
                </p>
              )}

            {step === 1 && (
              <div className="mt-10 border-b border-slate-800">
                {[
                  { label: 'Leistungssportler / Profi', val: 'Profi' },
                  { label: 'Fortgeschritten (trainiere regelmäßig & zielgerichtet)', val: 'Fortgeschritten' },
                  { label: 'Anfänger / Wiedereinsteiger', val: 'Anfänger' },
                ].map((opt, index) => (
                  <button key={opt.val} onClick={() => handleSelectOption('experience', opt.val)} className={optionBtn}>
                    <span className="flex items-center gap-4"><span className="font-mono text-xs text-slate-500">0{index + 1}</span>{opt.label}</span>
                    <ArrowRight size={17} className="text-emerald-400" aria-hidden />
                  </button>
                ))}
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
                  <div role="alert" className="border-y border-red-500/25 bg-red-500/5 py-6 text-sm text-red-300">
                    Die verfügbaren Fachgebiete konnten nicht geladen werden. Bitte lade die Seite erneut.
                  </div>
                ) : availableGoals.size === 0 ? (
                  <p className="border-y border-slate-800 py-6 text-sm text-slate-400">Aktuell sind noch keine verifizierten Trainer verfügbar.</p>
                ) : (
                  SPECIALTY_CATEGORIES.map((block) => (
                    <div key={block.category}>
                      <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{block.category}</h2>
                      <div className="border-b border-slate-800">
                        {block.items.map((item) => {
                          const available = availableGoals.has(item);
                          return (
                            <button
                              key={item}
                              disabled={!available}
                              onClick={() => available && handleSelectOption('goal', item)}
                              className={`flex min-h-14 w-full items-center justify-between gap-4 border-t px-1 py-4 text-left text-sm font-semibold transition-colors ${
                                available
                                  ? 'cursor-pointer border-slate-800 text-white hover:border-emerald-500 hover:text-emerald-300'
                                  : 'cursor-not-allowed border-slate-900 text-slate-600'
                              }`}
                            >
                              <span>{item}</span>
                              {available ? (
                                <ArrowRight size={17} className="text-emerald-400" aria-hidden />
                              ) : (
                                <span className="text-xs font-medium text-slate-600">Zurzeit nicht verfügbar</span>
                              )}
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
              <div className="mt-10 border-b border-slate-800">
                {[
                  { label: 'Vor Ort (Personal Training / Studio)', val: 'Vor Ort' },
                  { label: 'Online-Coaching (Digital & App-basiert)', val: 'Online' },
                  { label: 'Hybrid (Kombination aus beidem)', val: 'Hybrid' },
                ].map((opt, index) => (
                  <button key={opt.val} onClick={() => handleSelectOption('mode', opt.val)} className={optionBtn}>
                    <span className="flex items-center gap-4"><span className="font-mono text-xs text-slate-500">0{index + 1}</span>{opt.label}</span>
                    <ArrowRight size={17} className="text-emerald-400" aria-hidden />
                  </button>
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="mt-10 border-b border-slate-800">
                {[
                  { label: `Einstieg / Flexibel (bis ca. ${Math.round(t1)} €)`, val: 'low' },
                  { label: `Fortgeschritten / Standard (ca. ${Math.round(t1)} € – ${Math.round(t2)} €)`, val: 'mid' },
                  { label: `Intensiv / Premium Betreuung (ab ${Math.round(t2)} €+)`, val: 'high' },
                ].map((opt, index) => (
                  <button key={opt.val} onClick={() => handleSelectOption('budget', opt.val)} className={optionBtn}>
                    <span className="flex items-center gap-4 tabular-nums"><span className="font-mono text-xs text-slate-500">0{index + 1}</span>{opt.label}</span>
                    <ArrowRight size={17} className="text-emerald-400" aria-hidden />
                  </button>
                ))}
              </div>
            )}

            {step > 1 && (
              <div className="pt-7">
                <button type="button" onClick={() => setStep((prev) => prev - 1)} className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-white">
                  <ArrowLeft size={16} aria-hidden /> Einen Schritt zurück
                </button>
              </div>
            )}
            </div>
          </div>
        ) : (
          <div className="w-full">
            <div className="flex flex-col items-start justify-between gap-5 border-b border-slate-800 pb-8 md:flex-row md:items-end">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold text-emerald-400">Dein Matching-Ergebnis</p>
                <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Passende Trainerprofile.</h1>
                <p className="mt-4 text-sm leading-6 text-slate-400">Freie Termine werden zuerst angezeigt. Details zu Angeboten und Buchung findest du im jeweiligen Profil.</p>
              </div>
              <button
                type="button"
                onClick={resetQuiz}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <RotateCcw size={16} aria-hidden /> Quiz neu starten
              </button>
            </div>

            {results.length === 0 ? (
              <div className="border-b border-slate-800 py-12">
                <h2 className="text-xl font-semibold text-white">Keine exakte Übereinstimmung gefunden.</h2>
                <p className="mt-2 text-sm text-slate-400">Passe deine Angaben an oder sieh dir alle freigeschalteten Trainer an.</p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button onClick={resetQuiz} className="min-h-11 cursor-pointer rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-600">
                    Quiz neu starten
                  </button>
                  <Link href="/trainer/list" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
                    Alle Trainer ansehen
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                {results.map((trainer, index) => (
                  <article key={trainer.id} className="grid gap-6 border-b border-slate-800 py-8 lg:grid-cols-[4rem_minmax(0,1fr)_minmax(14rem,0.55fr)_auto] lg:items-start">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-slate-700 bg-slate-900 text-sm font-bold text-emerald-400">
                            {trainer.avatar_url ? <img src={trainer.avatar_url} alt="" className="w-full h-full object-cover" /> : <span>{trainer.name?.charAt(0) || 'T'}</span>}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-xs text-slate-500">{String(index + 1).padStart(2, '0')}</span>
                        <h2 className="text-2xl font-semibold tracking-tight">{trainer.name || 'Trainer'}</h2>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                          <BadgeCheck size={14} aria-hidden /> Verifiziert
                        </span>
                      </div>
                      <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
                        <MapPin size={14} aria-hidden /> {trainer.city || 'Standort flexibel'} <span aria-hidden>·</span> {trainer.service_mode || 'Trainingsform im Profil'}
                      </p>
                      <p className="mt-4 text-sm font-medium leading-6 text-slate-300">
                        {trainer.specialtyList.length > 0 ? trainer.specialtyList.join(', ') : 'Individuelles Coaching'}
                      </p>
                    </div>
                    <div className="space-y-2 text-sm tabular-nums">
                        {trainer.minPrice !== null && (
                        <p className="font-semibold text-white">ab {trainer.minPrice.toFixed(2).replace('.', ',')} €</p>
                        )}
                      <p className={`flex items-center gap-2 ${trainer.freeSlots > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                        <CalendarDays size={15} aria-hidden />
                          {trainer.freeSlots > 0 ? `${trainer.freeSlots} freie Termine` : 'Aktuell keine freien Termine'}
                      </p>
                    </div>

                    <Link
                      href={`/trainer/${trainer.id}`}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-emerald-500 hover:text-emerald-300"
                    >
                      Profil ansehen <ArrowRight size={16} aria-hidden />
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
