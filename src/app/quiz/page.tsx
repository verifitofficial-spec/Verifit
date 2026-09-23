'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

type Trainer = {
  id: string;
  name: string;
  bio: string;
  status: string;
  package_category?: string;
  package_duration?: string;
  package_price?: string | number;
  city?: string;
  service_mode?: string;
  specialties?: string;
};

type QuizAnswers = {
  experience: string;
  goal: string;
  mode: string;
  budget: string;
};

const MASTER_GOAL_BLOCKS = [
  {
    category: "Hypertrophie & Muskelaufbau",
    items: ["Muskelaufbau", "Hypertrophie", "Krafttraining", "Bodybuilding"]
  },
  {
    category: "Gewichtsverlust & Transformation",
    items: ["Abnehmen", "Fettabbau", "Body-Transformation", "Ernährungsberatung"]
  },
  {
    category: "Gesundheit & Prävention",
    items: ["Rückentraining", "Reha", "Haltung", "Schmerzprävention", "Mobilität"]
  },
  {
    category: "Performance & Athletik",
    items: ["Leistungsdiagnostik", "Athletiktraining", "Ausdauer", "Functional Fitness"]
  }
];

export default function QuizPage() {
  const router = useRouter();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<'quiz' | 'results'>('quiz');
  const [step, setStep] = useState<number>(1);
  const [answers, setAnswers] = useState<QuizAnswers>({
    experience: '',
    goal: '',
    mode: '',
    budget: '',
  });

  const [filteredResults, setFilteredResults] = useState<Trainer[]>([]);
  const [selectedTrainer, setSelectedTrainer] = useState<any>(null);
  const [trainerSlots, setTrainerSlots] = useState<any[]>([]);
  const [bookingMessage, setBookingMessage] = useState('');

  const [activeTrainerKeywords, setActiveTrainerKeywords] = useState<string[]>([]);
  
  // Dynamische Preisspannen für Schritt 4
  const [dynamicPriceRange, setDynamicPriceRange] = useState({ min: 0, max: 500 });

  useEffect(() => {
    async function fetchApprovedTrainers() {
      setLoading(true);
      const { data, error } = await supabase
        .from('trainers')
        .select('*')
        .eq('status', 'approved');

      if (error) {
        console.error('Fehler beim Laden der Trainer:', error.message);
      } else {
        const list = data || [];
        setTrainers(list);

        const keywords = new Set<string>();
        list.forEach(t => {
          if (t.specialties) {
            t.specialties.split(',').forEach((part: string) => {
              const clean = part.trim().toLowerCase();
              if (clean) keywords.add(clean);
            });
          }
        });
        setActiveTrainerKeywords(Array.from(keywords));
      }
      setLoading(false);
    }

    fetchApprovedTrainers();
  }, []);

  const isGoalAvailable = (item: string) => {
    const query = item.toLowerCase();
    return activeTrainerKeywords.some(kw => kw.includes(query) || query.includes(kw));
  };

  const handleSelectOption = (key: keyof QuizAnswers, value: string) => {
    const updatedAnswers = { ...answers, [key]: value };
    setAnswers(updatedAnswers);

    if (step < 4) {
      // Wenn wir von Schritt 3 zu Schritt 4 gehen, berechnen wir die passenden Preisspannen vorab
      if (step === 3) {
        calculateDynamicBudgetRange(updatedAnswers);
      }
      setStep(prev => prev + 1);
    } else {
      executeMatching(updatedAnswers);
    }
  };

  // Berechnet die echten min/max Preise basierend auf den bisherigen Auswahl-Filtern (Ziel & Modus)
  const calculateDynamicBudgetRange = (currentAnswers: QuizAnswers) => {
    let relevantTrainers = [...trainers];

    if (currentAnswers.goal) {
      relevantTrainers = relevantTrainers.filter(t => {
        const goal = currentAnswers.goal.toLowerCase();
        return t.specialties && t.specialties.toLowerCase().includes(goal);
      });
    }

    if (currentAnswers.mode) {
      relevantTrainers = relevantTrainers.filter(t => {
        const mode = t.service_mode ? t.service_mode.toLowerCase() : '';
        const targetMode = currentAnswers.mode.toLowerCase();
        return mode === targetMode || mode === 'hybrid' || mode.includes('vor ort & online');
      });
    }

    const prices = relevantTrainers
      .map(t => (t.package_price ? parseFloat(String(t.package_price)) : NaN))
      .filter(p => !isNaN(p));

    if (prices.length > 0) {
      setDynamicPriceRange({
        min: Math.min(...prices),
        max: Math.max(...prices),
      });
    } else {
      setDynamicPriceRange({ min: 50, max: 300 }); // Fallback
    }
  };

  const executeMatching = (finalAnswers: QuizAnswers) => {
    setLoading(true);
    setView('results');

    let results = [...trainers];

    if (finalAnswers.goal) {
      results = results.filter(t => {
        const goal = finalAnswers.goal.toLowerCase();
        return t.specialties && t.specialties.toLowerCase().includes(goal);
      });
    }

    if (finalAnswers.mode) {
      results = results.filter(t => {
        const mode = t.service_mode ? t.service_mode.toLowerCase() : '';
        const targetMode = finalAnswers.mode.toLowerCase();
        return mode === targetMode || mode === 'hybrid' || mode.includes('vor ort & online');
      });
    }

    if (finalAnswers.budget) {
      results = results.filter(t => {
        if (!t.package_price) return true;
        const priceNum = typeof t.package_price === 'number' ? t.package_price : parseFloat(String(t.package_price));
        if (isNaN(priceNum)) return true;

        if (finalAnswers.budget === 'low') return priceNum <= (dynamicPriceRange.min + (dynamicPriceRange.max - dynamicPriceRange.min) / 3);
        if (finalAnswers.budget === 'mid') return priceNum > (dynamicPriceRange.min + (dynamicPriceRange.max - dynamicPriceRange.min) / 3) && priceNum <= (dynamicPriceRange.min + ((dynamicPriceRange.max - dynamicPriceRange.min) / 3) * 2);
        if (finalAnswers.budget === 'high') return priceNum > (dynamicPriceRange.min + ((dynamicPriceRange.max - dynamicPriceRange.min) / 3) * 2);
        return true;
      });
    }

    setFilteredResults(results);
    setLoading(false);
  };

  const resetQuiz = () => {
    setStep(1);
    setAnswers({ experience: '', goal: '', mode: '', budget: '' });
    setView('quiz');
  };

  async function openBookingModal(trainer: any) {
    setSelectedTrainer(trainer);
    setBookingMessage('');
    const { data } = await supabase
      .from('trainer_slots')
      .select('*')
      .eq('trainer_id', trainer.id)
      .eq('status', 'free')
      .order('slot_date', { ascending: true });
    
    setTrainerSlots(data || []);
  }

  async function handleBookSlot(slot: any) {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slotId: slot.id,
        title: slot.title,
        price: slot.price,
        trainerName: selectedTrainer.name,
      }),
    });

    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      setBookingMessage('Fehler beim Starten des Checkouts: ' + data.error);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <header className="flex justify-between items-center px-6 py-6 max-w-7xl mx-auto w-full">
        <Link href="/" className="text-2xl font-black tracking-wider text-emerald-400">
          VERIFIT<span className="text-white">.</span>
        </Link>
        <div className="flex items-center gap-4">
          {view === 'quiz' && step <= 4 && (
            <span className="text-xs text-slate-400 font-medium">Schritt {step} von 4</span>
          )}
          <button
            onClick={() => router.push('/')}
            className="text-xs bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5"
          >
            <span>&times;</span> Quiz verlassen
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
                {step === 1 && "Wie stufst du dein aktuelles Fitness-Level ein?"}
                {step === 2 && "Was ist dein primäres Trainingsziel?"}
                {step === 3 && "Wie möchtest du trainieren?"}
                {step === 4 && "Welches Budget passt zu deiner Planung?"}
              </h1>
              {step === 4 && (
                <p className="text-slate-400 text-xs">
                  Basierend auf deinen vorherigen Angaben liegt die echte, verfügbare Marktspanne unserer Coaches bei ca. {dynamicPriceRange.min} € – {dynamicPriceRange.max} €.
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
                  <button
                    key={opt.val}
                    onClick={() => handleSelectOption('experience', opt.val)}
                    className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500 rounded-2xl text-left font-semibold text-sm transition cursor-pointer flex justify-between items-center group"
                  >
                    <span className="group-hover:text-emerald-400 transition">{opt.label}</span>
                    <span className="text-emerald-400">&rarr;</span>
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 max-w-xl mx-auto w-full pt-2">
                {MASTER_GOAL_BLOCKS.map((block) => (
                  <div key={block.category} className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                      {block.category}
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {block.items.map((item) => {
                        const available = isGoalAvailable(item);
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
                            <span className={available ? 'group-hover:text-emerald-400 transition' : ''}>
                              {item}
                            </span>
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
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="grid grid-cols-1 gap-3 max-w-xl mx-auto w-full pt-4">
                {[
                  { label: 'Vor Ort (Personal Training / Studio)', val: 'Vor Ort' },
                  { label: 'Online-Coaching (Digital & App-basiert)', val: 'Online' },
                  { label: 'Hybrid (Kombination aus beidem)', val: 'Hybrid' },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    onClick={() => handleSelectOption('mode', opt.val)}
                    className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500 rounded-2xl text-left font-semibold text-sm transition cursor-pointer flex justify-between items-center group"
                  >
                    <span className="group-hover:text-emerald-400 transition">{opt.label}</span>
                    <span className="text-emerald-400">&rarr;</span>
                  </button>
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="grid grid-cols-1 gap-3 max-w-xl mx-auto w-full pt-4">
                {[
                  { label: `Einstieg / Flexibel (bis ca. ${Math.round(dynamicPriceRange.min + (dynamicPriceRange.max - dynamicPriceRange.min) / 3)} €)`, val: 'low' },
                  { label: `Fortgeschritten / Standard (ca. ${Math.round(dynamicPriceRange.min + (dynamicPriceRange.max - dynamicPriceRange.min) / 3)} € – ${Math.round(dynamicPriceRange.min + ((dynamicPriceRange.max - dynamicPriceRange.min) / 3) * 2)} €)`, val: 'mid' },
                  { label: `Intensiv / Premium Betreuung (ab ${Math.round(dynamicPriceRange.min + ((dynamicPriceRange.max - dynamicPriceRange.min) / 3) * 2)} €+)`, val: 'high' },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    onClick={() => handleSelectOption('budget', opt.val)}
                    className="p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500 rounded-2xl text-left font-semibold text-sm transition cursor-pointer flex justify-between items-center group"
                  >
                    <span className="group-hover:text-emerald-400 transition">{opt.label}</span>
                    <span className="text-emerald-400">&rarr;</span>
                  </button>
                ))}
              </div>
            )}

            {step > 1 && (
              <div className="text-center pt-2">
                <button
                  onClick={() => setStep(prev => prev - 1)}
                  className="text-xs text-slate-400 hover:text-white transition cursor-pointer"
                >
                  &larr; Einen Schritt zurück
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-800">
              <div>
                <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                  Deine Ergebnisse (Transparent & Direkt)
                </span>
                <h2 className="text-2xl font-extrabold mt-1">Passende Trainer-Matches</h2>
              </div>
              <button
                onClick={resetQuiz}
                className="text-xs bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-xl transition cursor-pointer"
              >
                &larr; Quiz neu starten
              </button>
            </div>

            {loading ? (
              <p className="text-center text-slate-400 py-12">Analysiere verifizierte Experten...</p>
            ) : filteredResults.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
                <p className="text-slate-400 text-sm">Kein Trainer exakt auf diese Kombination gematcht.</p>
                <button
                  onClick={resetQuiz}
                  className="bg-emerald-500 text-slate-950 font-semibold px-6 py-2.5 rounded-xl text-xs transition cursor-pointer"
                >
                  Quiz neu starten
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredResults.map((trainer) => (
                  <div key={trainer.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-xl">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <h3 className="text-xl font-bold">{trainer.name}</h3>
                        <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium">
                          Verifiziert ✓
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs">
                        {trainer.city || 'Online'} • {trainer.service_mode || 'Hybrid'}
                      </p>
                      <p className="text-emerald-400 text-xs font-semibold">
                        {trainer.specialties || 'Individuelles Coaching'}
                      </p>
                      {trainer.package_price && (
                        <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                          Transparenter Preis: <strong className="text-emerald-400">{trainer.package_price} €</strong> {trainer.package_duration ? `(${trainer.package_duration})` : ''}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <Link
                        href={`/trainer/${trainer.id}`}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-center font-semibold py-2.5 rounded-xl text-xs transition border border-slate-700"
                      >
                        Profil ansehen
                      </Link>
                      <button
                        onClick={() => openBookingModal(trainer)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer text-center"
                      >
                        Slots ansehen & Buchen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {selectedTrainer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Termin bei {selectedTrainer.name}</h3>
              <button onClick={() => setSelectedTrainer(null)} className="text-slate-400 hover:text-white text-lg cursor-pointer">&times;</button>
            </div>
            {bookingMessage && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl">
                {bookingMessage}
              </div>
            )}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Verfügbare Slots:</h4>
              {trainerSlots.length === 0 ? (
                <p className="text-xs text-slate-500">Derzeit keine freien Slots verfügbar.</p>
              ) : (
                renderSlotsList(trainerSlots, handleBookSlot)
              )}
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

function renderSlotsList(trainerSlots: any[], handleBookSlot: (slot: any) => void) {
  return trainerSlots.map((slot) => (
    <div key={slot.id} className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
      <div>
        <div className="font-bold">{slot.title}</div>
        <div className="text-slate-400">{slot.slot_date} um {slot.slot_time.slice(0, 5)} Uhr • {slot.price}€</div>
      </div>
      <button onClick={() => handleBookSlot(slot)} className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer">
        Bezahlen & Buchen
      </button>
    </div>
  ));
}