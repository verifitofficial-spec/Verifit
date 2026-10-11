'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, BadgeCheck, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import Footer from '@/components/Footer';
import PublicHeader from '@/components/PublicHeader';
import { SkeletonBlock } from '@/components/Skeleton';
import { parseSpecialties } from '@/lib/constants';

interface Trainer {
  id: string;
  name: string | null;
  bio: string | null;
  city: string | null;
  service_mode: string | null;
  specialties: string | null;
  availability_status: string | null;
}

function TrainerRowSkeleton() {
  return (
    <div className="grid gap-6 border-t border-slate-800 py-8 lg:grid-cols-[4rem_minmax(0,1fr)_minmax(15rem,0.7fr)_auto]">
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
      const { data, error } = await supabase
        .from('trainers')
        .select('id, name, bio, city, service_mode, specialties, availability_status')
        .eq('status', 'approved')
        .order('name', { ascending: true });

      if (error) {
        console.error('Verifizierte Trainer konnten nicht geladen werden');
        setLoadError(true);
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
    <main className="min-h-screen bg-canvas text-ink">
      <PublicHeader />

      <section className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-emerald-400">Verifizierte Trainer</p>
            <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.035em] sm:text-5xl lg:text-6xl">
              Expertise, die du vergleichen kannst.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300">
              Filtere freigeschaltete Trainer nach Standort und Fachgebiet. Im Profil findest du
              Angebote und tatsächlich eingetragene freie Termine.
            </p>
          </div>
          {!loading && !loadError && (
            <div className="border-l border-slate-700 pl-5">
              <span className="block font-mono text-3xl font-semibold tabular-nums text-white">{filteredTrainers.length}</span>
              <span className="text-sm text-slate-400">{filteredTrainers.length === 1 ? 'passendes Profil' : 'passende Profile'}</span>
            </div>
          )}
        </div>

        <div className="mt-12 border-y border-slate-800 py-6">
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-white">
            <SlidersHorizontal size={17} className="text-emerald-400" aria-hidden />
            Auswahl eingrenzen
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="city-filter" className="mb-2 block text-sm font-medium text-slate-300">
                Standort oder Stadt
              </label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={17} aria-hidden />
                <input
                  id="city-filter"
                  type="search"
                  placeholder="Zum Beispiel Berlin"
                  value={cityFilter}
                  onChange={(event) => setCityFilter(event.target.value)}
                  className="min-h-12 w-full rounded-lg border border-slate-700 bg-slate-900 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 transition-colors hover:border-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label htmlFor="specialty-filter" className="mb-2 block text-sm font-medium text-slate-300">
                Fachgebiet
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={17} aria-hidden />
                <input
                  id="specialty-filter"
                  type="search"
                  placeholder="Zum Beispiel Rückentraining"
                  value={specialtyFilter}
                  onChange={(event) => setSpecialtyFilter(event.target.value)}
                  className="min-h-12 w-full rounded-lg border border-slate-700 bg-slate-900 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 transition-colors hover:border-slate-600 focus:border-emerald-500 focus:outline-none"
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
            <div role="alert" className="border-y border-red-500/25 bg-red-500/5 px-4 py-8">
              <h2 className="font-semibold text-red-300">Die Trainerliste konnte nicht geladen werden.</h2>
              <p className="mt-2 text-sm text-slate-400">Bitte lade die Seite erneut oder versuche es später noch einmal.</p>
            </div>
          ) : filteredTrainers.length === 0 ? (
            <div className="border-y border-slate-800 py-10">
              <h2 className="text-xl font-semibold text-white">Keine passenden Profile gefunden.</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                Entferne einen Filter oder starte das Matching, um deine Auswahl über Trainingsziel und Budget einzugrenzen.
              </p>
              <Link href="/quiz" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-400 hover:text-emerald-300">
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
                    className="group grid gap-6 border-t border-slate-800 py-8 first:border-t-0 lg:grid-cols-[4rem_minmax(0,1fr)_minmax(15rem,0.7fr)_auto] lg:items-start"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-sm font-bold text-emerald-400" aria-hidden>
                      {trainer.name?.charAt(0).toUpperCase() || String(index + 1).padStart(2, '0')}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-semibold tracking-tight text-white">{trainer.name || 'Trainer'}</h2>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                          <BadgeCheck size={14} aria-hidden /> Verifiziert
                        </span>
                      </div>
                      <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-slate-400">
                        <span>{trainer.city || 'Standort flexibel'}</span>
                        <span aria-hidden>·</span>
                        <span>{trainer.service_mode || 'Trainingsform im Profil'}</span>
                      </p>
                      <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                        {trainer.bio || 'Noch keine Biografie hinterlegt. Angebote und freie Termine findest du im Profil.'}
                      </p>
                    </div>

                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Fachgebiete</p>
                      {visibleSpecialties.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {visibleSpecialties.map((specialty) => (
                            <span key={specialty} className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-300">
                              {specialty}
                            </span>
                          ))}
                          {specialties.length > visibleSpecialties.length && (
                            <span className="px-1 py-1.5 text-xs text-slate-500">+{specialties.length - visibleSpecialties.length} weitere</span>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">Noch keine Angaben</p>
                      )}
                    </div>

                    <Link
                      href={`/trainer/${trainer.id}`}
                      className="inline-flex min-h-11 items-center justify-center gap-2 self-center rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-emerald-500 hover:text-emerald-300 lg:self-start"
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
