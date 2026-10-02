'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';

interface Trainer {
  id: string;
  name: string | null;
  bio: string | null;
  city: string | null;
  service_mode: string | null;
  specialties: string | null;
  availability_status: string | null;
}

export default function PublicTrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');

  useEffect(() => {
    async function fetchApprovedTrainers() {
      const { data, error } = await supabase
        .from('trainers')
        .select('id, name, bio, city, service_mode, specialties, availability_status')
        .eq('status', 'approved')
        .order('name', { ascending: true });

      if (error) {
        console.error('Verifizierte Trainer konnten nicht geladen werden');
      } else {
        setTrainers((data ?? []) as Trainer[]);
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
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <header className="flex justify-between items-center px-6 py-6 max-w-7xl mx-auto w-full border-b border-slate-900">
        <Link href="/" className="text-2xl font-black tracking-wider text-emerald-400">
          VERIFIT<span className="text-white">.</span>{' '}
          <span className="text-xs text-slate-400 font-normal">Client Hub</span>
        </Link>
        <Link
          href="/client/login"
          className="text-xs bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 transition"
        >
          Kunden-Login
        </Link>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-12 w-full flex-1 space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold mb-2">Verifizierte Experten finden</h1>
          <p className="text-slate-400 text-sm">
            Entdecke geprüfte Personal Trainer, Coaches und Spezialisten für dein Training.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Standort / Stadt
            </label>
            <input
              type="text"
              placeholder="z.B. Berlin"
              value={cityFilter}
              onChange={(event) => setCityFilter(event.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Spezialgebiet
            </label>
            <input
              type="text"
              placeholder="z.B. Rückentraining, Leistungsdiagnostik"
              value={specialtyFilter}
              onChange={(event) => setSpecialtyFilter(event.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-slate-400 text-sm">Lade verifizierte Trainer...</p>
        ) : filteredTrainers.length === 0 ? (
          <p className="text-slate-400 text-sm">Keine passenden Trainer gefunden.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrainers.map((trainer) => (
              <article
                key={trainer.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-xl"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-3">
                    <h2 className="text-lg font-bold">{trainer.name || 'Trainer'}</h2>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                      Verifiziert ✓
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {trainer.city || 'Online / Flexibel'} • {trainer.service_mode || 'Hybrid'}
                  </p>
                  <p className="text-xs text-emerald-400 font-semibold">
                    {trainer.specialties || 'Individuelles Coaching'}
                  </p>
                  <p className="text-xs text-slate-300 line-clamp-3 mt-2">
                    {trainer.bio || 'Keine Biografie hinterlegt.'}
                  </p>
                </div>

                <Link
                  href={`/trainer/${trainer.id}`}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition text-center"
                >
                  Profil, Angebote & Termine
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600 max-w-7xl mx-auto w-full">
        &copy; {new Date().getFullYear()} VeriFit. Alle Rechte vorbehalten.
      </footer>
    </main>
  );
}
