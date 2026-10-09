'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import TrendChart from '@/components/TrendChart';
import {
  RANGE_OPTIONS,
  TRACKING_METRICS,
  buildSeries,
  type RangeKey,
  type TrackingEntry,
} from '@/lib/trackingMetrics';

type ClientRow = {
  id: string;
  name: string | null;
  email: string;
  share_data: boolean | null;
  height: number | null;
  age: number | null;
  gender: string | null;
  goal: string | null;
  activity_level: number | null;
  weight: number | null;
};

type BookingRow = { client_id: string; status: string };

const GOAL_LABELS: Record<string, string> = {
  muscle_gain: 'Muskelaufbau',
  fat_loss: 'Abnehmen',
  maintenance: 'Gewicht halten',
};

/** Mifflin-St. Jeor als unverbindlicher Richtwert. */
function calcTargets(c: ClientRow) {
  const w = Number(c.weight);
  const h = Number(c.height);
  const a = Number(c.age);
  if (!w || !h || !a) return null;
  const bmr = 10 * w + 6.25 * h - 5 * a + (c.gender === 'female' ? -161 : 5);
  const tdee = bmr * (Number(c.activity_level) || 1.55);
  const adjustment = c.goal === 'fat_loss' ? -450 : c.goal === 'muscle_gain' ? 300 : 0;
  const kcal = Math.round(tdee + adjustment);
  const protein = Math.round(w * 2);
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal, protein, fat, carbs };
}

export default function TrainerClientsPage() {
  const router = useRouter();
  const routeParams = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [statusByClient, setStatusByClient] = useState<Record<string, string[]>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<TrackingEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [range, setRange] = useState<RangeKey>('month');
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/trainer/login');
        return;
      }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (profile?.role !== 'trainer') {
        router.push('/trainer/login');
        return;
      }

      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('client_id, status')
        .eq('trainer_id', user.id)
        .in('status', ['pending', 'accepted', 'confirmed']);

      if (bookingError) {
        setError('Kunden konnten nicht geladen werden.');
        setLoading(false);
        return;
      }

      const statuses: Record<string, string[]> = {};
      for (const row of (bookingData ?? []) as BookingRow[]) {
        (statuses[row.client_id] ??= []).push(row.status);
      }
      setStatusByClient(statuses);

      const ids = Object.keys(statuses);
      if (ids.length > 0) {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('id, name, email, share_data, height, age, gender, goal, activity_level, weight')
          .in('id', ids);
        if (clientError) setError('Kundendaten konnten nicht geladen werden.');
        else setClients((clientData ?? []) as ClientRow[]);
      }
      setLoading(false);
    }

    load();
  }, [router]);

  const selected = clients.find((c) => c.id === selectedId) ?? null;
  const selectedStatuses = selected ? statusByClient[selected.id] ?? [] : [];
  const hasActiveBooking = selectedStatuses.some((s) => s === 'accepted' || s === 'confirmed');
  const canSeeData = Boolean(selected?.share_data) && hasActiveBooking;

  useEffect(() => {
    if (!selectedId || !canSeeData) return;
    let active = true;
    async function loadHistory() {
      setHistoryLoading(true);
      const { data } = await supabase
        .from('client_trackings')
        .select('*')
        .eq('client_id', selectedId)
        .order('created_at', { ascending: false });
      if (!active) return;
      setHistory((data ?? []) as TrackingEntry[]);
      setHistoryLoading(false);
    }
    loadHistory();
    return () => {
      active = false;
    };
  }, [selectedId, canSeeData]);

  const rangeDays = RANGE_OPTIONS.find((option) => option.key === range)?.days ?? 30;
  const series = useMemo(
    () => TRACKING_METRICS.map((metric) => ({ metric, points: buildSeries(history, metric.key, rangeDays) })),
    [history, rangeDays]
  );
  const targets = selected && canSeeData ? calcTargets(selected) : null;

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <header className="flex justify-between items-center px-6 py-6 max-w-7xl mx-auto w-full border-b border-slate-900">
        <Link href="/" className="text-2xl font-black tracking-wider text-emerald-400">
          VERIFIT<span className="text-white">.</span> <span className="text-xs text-slate-400 font-normal">Meine Kunden</span>
        </Link>
        <Link href={`/trainer/${routeParams.id}/dashboard`} className="text-xs text-slate-400 hover:text-white transition">
          Zum Dashboard
        </Link>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-12 w-full flex-1 space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold mb-2">Meine Kunden</h1>
          <p className="text-slate-400 text-sm">
            Daten siehst du nur, wenn der Kunde sie freigegeben hat und eine angenommene oder bestätigte Buchung besteht.
          </p>
        </div>

        {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">{error}</div>}

        {loading ? (
          <p className="text-slate-400 text-sm">Lade Kunden...</p>
        ) : clients.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-sm text-slate-400">
            Du hast noch keine Kunden mit Buchungsanfragen.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              {clients.map((c) => {
                const statuses = statusByClient[c.id] ?? [];
                const active = statuses.some((s) => s === 'accepted' || s === 'confirmed');
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition cursor-pointer ${
                      selectedId === c.id ? 'bg-emerald-500/10 border-emerald-500' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <p className="font-bold text-sm text-white">{c.name || 'Unbenannter Kunde'}</p>
                    <p className="text-[11px] text-slate-500 truncate">{c.email}</p>
                    <div className="flex gap-2 mt-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                        {active ? 'Aktive Buchung' : 'Anfrage offen'}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${c.share_data ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        {c.share_data ? 'Daten freigegeben' : 'Keine Freigabe'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="lg:col-span-2 space-y-6">
              {!selected ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-sm text-slate-400">
                  Wähle links einen Kunden aus.
                </div>
              ) : !canSeeData ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-2">
                  <h2 className="text-lg font-bold">{selected.name || selected.email}</h2>
                  <p className="text-sm text-slate-400">
                    {!selected.share_data
                      ? 'Dieser Kunde hat seine Daten nicht für Trainer freigegeben.'
                      : 'Die Daten werden sichtbar, sobald du die Buchung angenommen hast.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h2 className="text-lg font-bold">{selected.name || selected.email}</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      {[
                        ['Größe', selected.height ? `${selected.height} cm` : '–'],
                        ['Gewicht', selected.weight ? `${selected.weight} kg` : '–'],
                        ['Alter', selected.age ? `${selected.age} Jahre` : '–'],
                        ['Ziel', selected.goal ? GOAL_LABELS[selected.goal] ?? selected.goal : '–'],
                      ].map(([label, value]) => (
                        <div key={label} className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                          <p className="text-slate-500 text-[10px] uppercase tracking-wider">{label}</p>
                          <p className="font-bold text-white mt-1">{value}</p>
                        </div>
                      ))}
                    </div>

                    {targets ? (
                      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                        <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">
                          Richtwert nach Mifflin-St. Jeor (keine medizinische Beratung)
                        </p>
                        <p className="text-sm text-slate-300">
                          Grundumsatz <strong className="text-white">{targets.bmr} kcal</strong> · Gesamtumsatz{' '}
                          <strong className="text-white">{targets.tdee} kcal</strong> · Zielkalorien{' '}
                          <strong className="text-emerald-400">{targets.kcal} kcal</strong>
                        </p>
                        <p className="text-xs text-slate-400">
                          Protein {targets.protein} g · Kohlenhydrate {targets.carbs} g · Fett {targets.fat} g
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Für den Richtwert fehlen Größe, Gewicht oder Alter des Kunden.
                      </p>
                    )}
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <h3 className="text-sm font-bold">Tracking-Verlauf</h3>
                      <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                        {RANGE_OPTIONS.map((option) => (
                          <button
                            key={option.key}
                            onClick={() => setRange(option.key)}
                            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                              range === option.key ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {historyLoading ? (
                      <p className="text-xs text-slate-500">Lade Verlauf...</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {series.map(({ metric, points }) => (
                          <TrendChart
                            key={metric.key}
                            title={metric.title}
                            unit={metric.unit}
                            color={metric.color}
                            decimals={metric.decimals}
                            points={points}
                            fixedMin={metric.min}
                            fixedMax={metric.max}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </section>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600 max-w-7xl mx-auto w-full">
        &copy; {new Date().getFullYear()} VeriFit. Alle Rechte vorbehalten.
      </footer>
    </main>
  );
}
