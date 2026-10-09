'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
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
  'p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500 rounded-2xl text-left font-semibold text-sm transition cursor-pointer flex justify-between items-center group';

export default function QuizPage() {
  const router = useRouter();
  const auth = useAuthProfile();
  const [trainers, setTrainers] = useState<QuizTrainer[]>([]);
  const [loading, setLoading] = useState(true);
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

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <header className="flex justify-between items-center px-6 py-6 max-w-7xl mx-auto w-full">
        <Link href="/" className="text-2xl font-black tracking-wider text-emerald-400">
          VERIFIT<span className="text-white">.</span>
        </Link>
        <div className="flex items-center gap-4">
          {view === 'quiz' && <span className="text-xs text-slate-400 font-medium">Schritt {step} von 4</span>}
          <button
            onClick={() => router.push(auth.homeHref ?? '/')}
            className="text-xs bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl transition cursor-pointer"
          >
            {homeLabel}
          </button>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-6 py-12 w-full flex-1 flex flex-col justify-center">
        {view === 'quiz' ? (
          <div className="space-y-8">
            <div className="text-center space-y-3">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                Geprüfte Qualität & Radikale Transparenz
              </span>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                {step === 1 && 'Wie stufst du dein aktuelles Fitness-Level ein?'}
                {step === 2 && 'Was ist dein primäres Trainingsziel?'}
                {step === 3 && 'Wie möchtest du trainieren?'}
                {step === 4 && 'Welches Budget passt zu deiner Planung?'}
              </h1>
              {step === 4 && (
                <p className="text-slate-400 text-xs">
                  Basierend auf deinen Angaben liegt die verfügbare Spanne unserer Coaches bei ca. {Math.round(priceRange.min)} € – {Math.round(priceRange.max)} €.
                </p>
              )}
            </div>

            {step === 1 && (
              <div className="grid grid-cols-1 gap-3 max-w-xl mx-auto w-full pt-4">
                {[
                  { label: 'Leistungssportler / Profi', val: 'Profi' },
                  { label: 'Fortgeschritten (trainiere regelmäßig & zielgerichtet)', val: 'Fortgeschritten' },
                  { label: 'Anfänger / Wiedereinsteiger', val: 'Anfänger' },
                ].map((opt) => (
                  <button key={opt.val} onClick={() => handleSelectOption('experience', opt.val)} className={optionBtn}>
                    <span className="group-hover:text-emerald-400 transition">{opt.label}</span>
                    <span className="text-emerald-400">&rarr;</span>
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 max-w-xl mx-auto w-full pt-2">
                {loading ? (
                  <p className="text-center text-slate-400 text-sm">Lade verfügbare Fachgebiete...</p>
                ) : availableGoals.size === 0 ? (
                  <p className="text-center text-slate-400 text-sm">Aktuell sind noch keine verifizierten Trainer verfügbar.</p>
                ) : (
                  SPECIALTY_CATEGORIES.map((block) => (
                    <div key={block.category} className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">{block.category}</h3>
                      <div className="grid grid-cols-1 gap-2">
                        {block.items.map((item) => {
                          const available = availableGoals.has(item);
                          return (
                            <button
                              key={item}
                              disabled={!available}
                              onClick={() => available && handleSelectOption('goal', item)}
                              className={`p-3.5 rounded-2xl text-left font-semibold text-sm transition flex justify-between items-center border ${
                                available
                                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-emerald-500 text-white cursor-pointer group'
                                  : 'bg-slate-950/60 border-slate-900 text-slate-600 cursor-not-allowed opacity-60'
                              }`}
                            >
                              <span className={available ? 'group-hover:text-emerald-400 transition' : ''}>{item}</span>
                              {available ? (
                                <span className="text-emerald-400">&rarr;</span>
                              ) : (
                                <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-slate-600 uppercase tracking-widest border border-slate-800">
                                  Zur Zeit nicht verfügbar
                                </span>
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
              <div className="grid grid-cols-1 gap-3 max-w-xl mx-auto w-full pt-4">
                {[
                  { label: 'Vor Ort (Personal Training / Studio)', val: 'Vor Ort' },
                  { label: 'Online-Coaching (Digital & App-basiert)', val: 'Online' },
                  { label: 'Hybrid (Kombination aus beidem)', val: 'Hybrid' },
                ].map((opt) => (
                  <button key={opt.val} onClick={() => handleSelectOption('mode', opt.val)} className={optionBtn}>
                    <span className="group-hover:text-emerald-400 transition">{opt.label}</span>
                    <span className="text-emerald-400">&rarr;</span>
                  </button>
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="grid grid-cols-1 gap-3 max-w-xl mx-auto w-full pt-4">
                {[
                  { label: `Einstieg / Flexibel (bis ca. ${Math.round(t1)} €)`, val: 'low' },
                  { label: `Fortgeschritten / Standard (ca. ${Math.round(t1)} € – ${Math.round(t2)} €)`, val: 'mid' },
                  { label: `Intensiv / Premium Betreuung (ab ${Math.round(t2)} €+)`, val: 'high' },
                ].map((opt) => (
                  <button key={opt.val} onClick={() => handleSelectOption('budget', opt.val)} className={optionBtn}>
                    <span className="group-hover:text-emerald-400 transition">{opt.label}</span>
                    <span className="text-emerald-400">&rarr;</span>
                  </button>
                ))}
              </div>
            )}

            {step > 1 && (
              <div className="text-center pt-2">
                <button onClick={() => setStep((prev) => prev - 1)} className="text-xs text-slate-400 hover:text-white transition cursor-pointer">
                  &larr; Einen Schritt zurück
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-800">
              <div>
                <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Deine Ergebnisse (Transparent & Direkt)</span>
                <h2 className="text-2xl font-extrabold mt-1">Passende Trainer-Matches</h2>
              </div>
              <button
                onClick={resetQuiz}
                className="text-xs bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-xl transition cursor-pointer"
              >
                &larr; Quiz neu starten
              </button>
            </div>

            {results.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
                <p className="text-slate-400 text-sm">Kein Trainer exakt auf diese Kombination gematcht.</p>
                <div className="flex justify-center gap-3">
                  <button onClick={resetQuiz} className="bg-emerald-500 text-slate-950 font-semibold px-6 py-2.5 rounded-xl text-xs transition cursor-pointer">
                    Quiz neu starten
                  </button>
                  <Link href="/trainer/list" className="bg-slate-800 border border-slate-700 text-white font-semibold px-6 py-2.5 rounded-xl text-xs transition">
                    Alle Trainer ansehen
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {results.map((trainer) => (
                  <div key={trainer.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-xl">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center text-lg font-bold text-emerald-400 shrink-0">
                            {trainer.avatar_url ? <img src={trainer.avatar_url} alt="" className="w-full h-full object-cover" /> : <span>{trainer.name?.charAt(0) || 'T'}</span>}
                          </div>
                          <h3 className="text-xl font-bold">{trainer.name || 'Trainer'}</h3>
                        </div>
                        <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
                          Verifiziert ✓
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs">
                        {trainer.city || 'Online'} • {trainer.service_mode || 'Vor Ort & Online'}
                      </p>
                      <p className="text-emerald-400 text-xs font-semibold">
                        {trainer.specialtyList.length > 0 ? trainer.specialtyList.join(', ') : 'Individuelles Coaching'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {trainer.minPrice !== null && (
                          <span className="text-xs text-slate-300 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
                            ab <strong className="text-emerald-400">{trainer.minPrice} €</strong>
                          </span>
                        )}
                        <span
                          className={`text-xs px-2.5 py-1.5 rounded-xl border ${
                            trainer.freeSlots > 0
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-slate-950 text-slate-500 border-slate-800'
                          }`}
                        >
                          {trainer.freeSlots > 0 ? `${trainer.freeSlots} freie Termine` : 'Aktuell keine freien Termine'}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/trainer/${trainer.id}`}
                      className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-center font-bold py-2.5 rounded-xl text-xs transition"
                    >
                      Profil & Angebote ansehen
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600 max-w-7xl mx-auto w-full">
        &copy; {new Date().getFullYear()} VeriFit. Alle Rechte vorbehalten.
      </footer>
    </main>
  );
}
