'use client';

import { useCallback, useEffect, useMemo, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';
import Chat from '@/components/Chat';
import TrendChart from '@/components/TrendChart';
import DeleteAccountCard from '@/components/DeleteAccountCard';
import {
  RANGE_OPTIONS,
  TRACKING_METRICS,
  buildSeries,
  type RangeKey,
  type TrackingEntry,
  type TrackingMetricKey,
} from '@/lib/trackingMetrics';

type ClientProfile = {
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

type ClientBooking = {
  id: string;
  offer_title: string | null;
  offer_type: 'discovery' | 'paid';
  price: number | string | null;
  slot_date: string;
  slot_time: string | null;
  status: 'pending' | 'accepted' | 'confirmed' | 'declined' | 'cancelled' | 'expired';
  payment_due_at: string | null;
};

type PlanRow = {
  id: string;
  day_of_week: string;
  title?: string;
  description?: string | null;
  sets?: number | null;
  reps?: string | number | null;
  weight?: number | null;
};

type StoredPlanContent = {
  days?: Array<{
    templateName?: string;
    meals?: Array<{ title?: string; items?: Array<{ name?: string; grams?: string; foodSearchInput?: string }> }>;
    exercises?: Array<{ exercise?: string; sets?: string; reps?: string; weight?: string }>;
  }>;
  schedule?: Record<string, string>;
};

type Notice = { type: 'ok' | 'error'; text: string };

const DAYS_OF_WEEK = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

const cardCls = 'bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6';
const inputCls =
  'w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500';

const emptyForm = (): Record<TrackingMetricKey, string> => ({
  weight: '',
  calories: '',
  water: '',
  sleep: '',
  mood: '',
  health: '',
  motivation: '',
});

function toNumber(value: string, integer: boolean): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value.replace(',', '.'));
  if (!Number.isFinite(parsed)) return null;
  return integer ? Math.round(parsed) : parsed;
}

function formatPrice(price: number | string | null) {
  const value = Number(price);
  return value > 0 ? `${value.toFixed(2).replace('.', ',')} €` : 'Kostenlos';
}

function bookingStatus(status: ClientBooking['status']) {
  switch (status) {
    case 'accepted':
      return { badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20', text: 'Vom Trainer angenommen – Zahlung ausstehend' };
    case 'confirmed':
      return { badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', text: 'Verbindlich bestätigt ✓' };
    case 'declined':
      return { badge: 'bg-red-500/10 text-red-400 border-red-500/20', text: 'Abgelehnt' };
    case 'expired':
      return { badge: 'bg-slate-800 text-slate-400 border-slate-700', text: 'Zahlungsfrist abgelaufen' };
    case 'cancelled':
      return { badge: 'bg-slate-800 text-slate-400 border-slate-700', text: 'Storniert' };
    default:
      return { badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', text: 'Anfrage ausstehend (wartet auf Bestätigung)' };
  }
}

export default function ClientDashboard({ params }: { params: Promise<{ id: string }> }) {
  const clientId = use(params).id;
  const router = useRouter();

  const [client, setClient] = useState<ClientProfile | null>(null);
  const [bookings, setBookings] = useState<ClientBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  // Tracking
  const [form, setForm] = useState<Record<TrackingMetricKey, string>>(emptyForm());
  const [trackingHistory, setTrackingHistory] = useState<TrackingEntry[]>([]);
  const [range, setRange] = useState<RangeKey>('month');
  const [savingTracking, setSavingTracking] = useState(false);
  const [trackingNotice, setTrackingNotice] = useState<Notice | null>(null);

  // Datenfreigabe
  const [shareData, setShareData] = useState(false);
  const [savingShare, setSavingShare] = useState(false);
  const [shareNotice, setShareNotice] = useState<Notice | null>(null);

  // Körper- & Zieldaten
  const [profileHeight, setProfileHeight] = useState('');
  const [profileAge, setProfileAge] = useState('');
  const [profileGender, setProfileGender] = useState('male');
  const [profileGoal, setProfileGoal] = useState('muscle_gain');
  const [profileActivity, setProfileActivity] = useState('1.55');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState<Notice | null>(null);

  // Pläne
  const [nutritionPlans, setNutritionPlans] = useState<PlanRow[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<PlanRow[]>([]);
  const [selectedDay, setSelectedDay] = useState('Montag');

  const loadBookings = useCallback(async (cId: string) => {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, offer_title, offer_type, price, slot_date, slot_time, status, payment_due_at')
      .eq('client_id', cId)
      .order('slot_date', { ascending: true })
      .order('slot_time', { ascending: true });

    if (error) {
      console.error('Buchungen konnten nicht geladen werden:', error.message);
      return;
    }
    setBookings((data ?? []) as ClientBooking[]);
  }, []);

  const loadTrackingHistory = useCallback(async (cId: string, prefillToday: boolean) => {
    const { data, error } = await supabase
      .from('client_trackings')
      .select('*')
      .eq('client_id', cId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Tracking konnte nicht geladen werden:', error.message);
      return;
    }
    const entries = (data ?? []) as TrackingEntry[];
    setTrackingHistory(entries);

    // Nur Werte von HEUTE vorbefüllen (keine Werte von gestern).
    if (prefillToday && entries.length > 0) {
      const todayStr = new Date().toLocaleDateString('en-CA');
      const latest = entries[0];
      if (new Date(latest.created_at).toLocaleDateString('en-CA') === todayStr) {
        const next = emptyForm();
        for (const metric of TRACKING_METRICS) {
          const value = latest[metric.key];
          next[metric.key] = value === null || value === undefined ? '' : String(value);
        }
        setForm(next);
      }
    }
  }, []);

  const loadPlans = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('client_plans')
      .select('id, plan_type, title, content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fehler beim Laden der Pläne:', error.message);
      return;
    }

    const workout: PlanRow[] = [];
    const nutrition: PlanRow[] = [];
    for (const plan of data ?? []) {
      let content: StoredPlanContent;
      try {
        content = JSON.parse(plan.content) as StoredPlanContent;
      } catch {
        continue;
      }
      for (const [dateStr, templateName] of Object.entries(content.schedule ?? {})) {
        const template = (content.days ?? []).find((day) => day.templateName === templateName);
        if (!template) continue;
        const dayOfWeek = new Intl.DateTimeFormat('de-DE', { weekday: 'long' }).format(new Date(`${dateStr}T12:00:00`));
        if (plan.plan_type === 'workout') {
          for (const [index, exercise] of (template.exercises ?? []).entries()) {
            workout.push({
              id: `${plan.id}-${dateStr}-${index}`,
              day_of_week: dayOfWeek,
              title: exercise.exercise,
              sets: Number(exercise.sets) || null,
              reps: exercise.reps,
              weight: Number(exercise.weight) || null,
            });
          }
        } else if (plan.plan_type === 'nutrition') {
          for (const [index, meal] of (template.meals ?? []).entries()) {
            const items = (meal.items ?? [])
              .map((item) => `${item.name || item.foodSearchInput || 'Lebensmittel'}${item.grams ? ` (${item.grams} g)` : ''}`)
              .join(', ');
            nutrition.push({ id: `${plan.id}-${dateStr}-${index}`, day_of_week: dayOfWeek, title: meal.title, description: items || null });
          }
        }
      }
    }
    setWorkoutPlans(workout);
    setNutritionPlans(nutrition);
  }, []);

  useEffect(() => {
    async function loadClientData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || user.id !== clientId) {
        router.push('/client/login');
        return;
      }

      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError || !clientData) {
        router.push('/client/login');
        return;
      }

      const profile = clientData as ClientProfile;
      setClient(profile);
      setShareData(profile.share_data ?? false);
      setProfileHeight(profile.height ? String(profile.height) : '');
      setProfileAge(profile.age ? String(profile.age) : '');
      setProfileGender(profile.gender || 'male');
      setProfileGoal(profile.goal || 'muscle_gain');
      setProfileActivity(profile.activity_level ? String(profile.activity_level) : '1.55');

      const query = new URLSearchParams(window.location.search);
      if (query.get('canceled')) {
        setNotice({ type: 'error', text: 'Die Zahlung wurde abgebrochen. Du kannst sie unten jederzeit erneut starten.' });
      }

      await Promise.all([loadBookings(profile.id), loadTrackingHistory(profile.id, true), loadPlans(profile.id)]);
      setLoading(false);
    }

    loadClientData();
  }, [clientId, router, loadBookings, loadTrackingHistory, loadPlans]);

  // Buchungsstatus automatisch aktualisieren (Trainer-Antwort erscheint ohne Neuladen).
  const clientReady = client !== null;
  useEffect(() => {
    if (!clientReady) return;
    const refresh = () => {
      if (document.visibilityState === 'visible') loadBookings(clientId);
    };
    const interval = setInterval(refresh, 20000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [clientReady, clientId, loadBookings]);

  async function handleToggleShare(value: boolean) {
    const previous = shareData;
    setShareData(value);
    setSavingShare(true);
    setShareNotice(null);
    const { error } = await supabase.from('clients').update({ share_data: value }).eq('id', clientId);
    setSavingShare(false);
    if (error) {
      setShareData(previous);
      setShareNotice({ type: 'error', text: 'Die Freigabe konnte nicht gespeichert werden.' });
    } else {
      setShareNotice({
        type: 'ok',
        text: value ? 'Freigabe aktiviert: Deine Trainer sehen jetzt alle deine Daten.' : 'Freigabe deaktiviert: Deine Trainer sehen deine Daten nicht mehr.',
      });
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileNotice(null);

    const { error } = await supabase
      .from('clients')
      .update({
        height: profileHeight ? parseFloat(profileHeight) : null,
        age: profileAge ? parseInt(profileAge, 10) : null,
        gender: profileGender,
        goal: profileGoal,
        activity_level: parseFloat(profileActivity),
      })
      .eq('id', clientId);

    setSavingProfile(false);
    setProfileNotice(error ? { type: 'error', text: 'Die Körperdaten konnten nicht gespeichert werden.' } : { type: 'ok', text: 'Erfolgreich gespeichert! ✓' });
  }

  async function handleSaveTracking(e: React.FormEvent) {
    e.preventDefault();
    setSavingTracking(true);
    setTrackingNotice(null);

    const payload: Record<string, number | null> = {};
    for (const metric of TRACKING_METRICS) {
      const value = toNumber(form[metric.key], metric.integer);
      if (value !== null && metric.min !== undefined && metric.max !== undefined && (value < metric.min || value > metric.max)) {
        setTrackingNotice({ type: 'error', text: `${metric.title}: Bitte einen Wert zwischen ${metric.min} und ${metric.max} eingeben.` });
        setSavingTracking(false);
        return;
      }
      payload[metric.key] = value;
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const { data: todayEntries } = await supabase
      .from('client_trackings')
      .select('id')
      .eq('client_id', clientId)
      .gte('created_at', startOfToday.toISOString())
      .limit(1);

    const todayEntry = todayEntries?.[0];
    const { error } = todayEntry
      ? await supabase.from('client_trackings').update(payload).eq('id', todayEntry.id)
      : await supabase.from('client_trackings').insert([{ client_id: clientId, ...payload }]);

    if (!error && payload.weight !== null) {
      await supabase.from('clients').update({ weight: payload.weight }).eq('id', clientId);
    }

    setSavingTracking(false);
    if (error) {
      setTrackingNotice({ type: 'error', text: 'Die Werte konnten nicht gespeichert werden.' });
      return;
    }
    setTrackingNotice({ type: 'ok', text: 'Erfolgreich gespeichert! ✓' });
    await loadTrackingHistory(clientId, false);
  }

  async function handleCheckout(bookingId: string) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      router.push('/client/login');
      return;
    }

    setPayingId(bookingId);
    setNotice(null);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ bookingId }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; url?: string };

      if (!response.ok || !data.url) {
        setNotice({ type: 'error', text: data.error || 'Checkout konnte nicht gestartet werden.' });
        setPayingId(null);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setNotice({ type: 'error', text: 'Netzwerkfehler beim Starten des Checkouts.' });
      setPayingId(null);
    }
  }

  async function handleCancelBooking(booking: ClientBooking) {
    const paid = booking.status === 'confirmed' && Number(booking.price) > 0;
    const question = paid
      ? 'Möchtest du diesen bezahlten Termin stornieren? Bis 24 Stunden vor Beginn erhältst du den vollen Betrag zurück.'
      : 'Möchtest du diese Buchung wirklich stornieren?';
    if (!window.confirm(question)) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setNotice({ type: 'error', text: 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.' });
      return;
    }
    const response = await fetch('/api/cancel-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ bookingId: booking.id }),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string; refunded?: boolean };
    if (!response.ok) {
      setNotice({ type: 'error', text: result.error || 'Buchung konnte nicht storniert werden.' });
      return;
    }
    setNotice({ type: 'ok', text: result.refunded ? 'Buchung storniert. Die Rückerstattung wurde veranlasst.' : 'Buchung storniert.' });
    await loadBookings(clientId);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/client/login');
  }

  const rangeDays = RANGE_OPTIONS.find((option) => option.key === range)?.days ?? 30;
  const series = useMemo(
    () => TRACKING_METRICS.map((metric) => ({ metric, points: buildSeries(trackingHistory, metric.key, rangeDays) })),
    [trackingHistory, rangeDays]
  );

  if (loading || !client) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-sm text-slate-400">Lade Dashboard...</p>
      </div>
    );
  }

  const payable = bookings.filter((b) => b.status === 'accepted' && Number(b.price) > 0);
  const currentDayNutrition = nutritionPlans.filter((p) => p.day_of_week === selectedDay);
  const currentDayWorkout = workoutPlans.filter((p) => p.day_of_week === selectedDay);

  const noticeBox = (n: Notice | null) =>
    n && (
      <div
        className={`p-3 rounded-xl text-xs font-medium border ${
          n.type === 'ok' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}
      >
        {n.text}
      </div>
    );

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <header className="flex justify-between items-center px-6 py-6 max-w-7xl mx-auto w-full border-b border-slate-900">
        <Link href="/" className="text-2xl font-black tracking-wider text-emerald-400">
          VERIFIT<span className="text-white">.</span> <span className="text-xs text-slate-400 font-normal">Kunden-Portal</span>
        </Link>
        <button
          onClick={handleLogout}
          className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-xl transition border border-slate-800 cursor-pointer"
        >
          Abmelden
        </button>
      </header>

      <section className="max-w-4xl mx-auto px-6 py-12 w-full flex-1 space-y-8">
        {noticeBox(notice)}

        {/* Zahlung ausstehend */}
        {payable.length > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-3xl p-6 space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-blue-300">Zahlung erforderlich</h2>
              <p className="text-xs text-slate-400">
                Dein Trainer hat zugesagt. Bitte bezahle innerhalb der Frist, damit der Termin verbindlich reserviert bleibt.
              </p>
            </div>
            {payable.map((booking) => (
              <div key={booking.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-sm text-white">{booking.offer_title || 'Trainingseinheit'}</p>
                  <p className="text-xs text-slate-400">
                    {booking.slot_date} um {booking.slot_time?.slice(0, 5) || '--:--'} Uhr · {formatPrice(booking.price)}
                  </p>
                  {booking.payment_due_at && (
                    <p className="text-xs text-amber-400 mt-1">Zahlung bis {new Date(booking.payment_due_at).toLocaleString('de-DE')} Uhr</p>
                  )}
                </div>
                <button
                  onClick={() => handleCheckout(booking.id)}
                  disabled={payingId === booking.id}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm px-5 py-2.5 rounded-xl cursor-pointer disabled:opacity-60"
                >
                  {payingId === booking.id ? 'Öffne Stripe...' : `Jetzt bezahlen (${formatPrice(booking.price)})`}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Willkommen & Buchungen */}
        <div id="buchungen" className={`${cardCls} scroll-mt-6`}>
          <div className="flex justify-between items-center border-b border-slate-800 pb-6">
            <div>
              <h1 className="text-2xl font-extrabold">Willkommen, {client.name || 'Kunde'}</h1>
              <p className="text-slate-400 text-sm">Angemeldet als: {client.email}</p>
            </div>
            <Link
              href="/quiz"
              className="text-xs bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl transition"
            >
              Trainer finden
            </Link>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Deine Buchungen</h2>
              <button onClick={() => loadBookings(clientId)} className="text-xs text-slate-400 hover:text-white cursor-pointer">
                Aktualisieren
              </button>
            </div>
            {bookings.length === 0 ? (
              <p className="text-xs text-slate-500">Du hast bisher keine Termine angefragt.</p>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking) => {
                  const status = bookingStatus(booking.status);
                  const payNow = booking.status === 'accepted' && Number(booking.price) > 0;
                  return (
                    <div key={booking.id} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-bold text-white text-sm">{booking.offer_title || 'Trainingseinheit'}</span>
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full border ${status.badge}`}>{status.text}</span>
                        </div>
                        <p className="text-xs text-slate-400">
                          {booking.slot_date} um {booking.slot_time?.slice(0, 5) || '--:--'} Uhr · {formatPrice(booking.price)}
                        </p>
                        {payNow && booking.payment_due_at && (
                          <p className="text-xs text-amber-400 mt-1">Zahlung bis {new Date(booking.payment_due_at).toLocaleString('de-DE')} Uhr</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {payNow && (
                          <button
                            onClick={() => handleCheckout(booking.id)}
                            disabled={payingId === booking.id}
                            className="text-xs bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl cursor-pointer disabled:opacity-60"
                          >
                            Jetzt bezahlen
                          </button>
                        )}
                        {['pending', 'accepted', 'confirmed'].includes(booking.status) && (
                          <button
                            onClick={() => handleCancelBooking(booking)}
                            className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold px-3 py-2 rounded-xl cursor-pointer"
                          >
                            Stornieren
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Datenfreigabe */}
        <div className={cardCls}>
          <div>
            <h2 className="text-xl font-extrabold mb-1">Datenfreigabe für deine Trainer</h2>
            <p className="text-slate-400 text-sm">
              Mit der Freigabe sehen deine Trainer (mit angenommener oder bestätigter Buchung) <strong className="text-slate-200">alle</strong> deine Daten:
              Körper- & Zieldaten sowie das komplette Tracking inkl. Gewicht, Schlaf, Wasser, Kalorien, Laune, Gesundheit, Motivation und den Verlauf.
              Du kannst die Freigabe jederzeit widerrufen.
            </p>
          </div>
          {noticeBox(shareNotice)}
          <div className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div>
              <p className="text-xs font-bold text-slate-200">{shareData ? 'Freigabe aktiv' : 'Freigabe deaktiviert'}</p>
              <p className="text-[11px] text-slate-500">Wird sofort gespeichert.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={shareData}
                disabled={savingShare}
                onChange={(e) => handleToggleShare(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        </div>

        {/* Körper- & Zieldaten */}
        <div className={cardCls}>
          <div>
            <h2 className="text-xl font-extrabold mb-1">Körper- & Zieldaten</h2>
            <p className="text-slate-400 text-sm">Diese Angaben werden benötigt, um deinen Kalorienbedarf zu berechnen.</p>
          </div>
          <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Körpergröße (cm)</label>
                <input type="number" value={profileHeight} onChange={(e) => setProfileHeight(e.target.value)} placeholder="z.B. 178" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Alter (Jahre)</label>
                <input type="number" value={profileAge} onChange={(e) => setProfileAge(e.target.value)} placeholder="z.B. 28" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Geschlecht</label>
                <select value={profileGender} onChange={(e) => setProfileGender(e.target.value)} className={inputCls}>
                  <option value="male">Männlich</option>
                  <option value="female">Weiblich</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Ziel</label>
                <select value={profileGoal} onChange={(e) => setProfileGoal(e.target.value)} className={inputCls}>
                  <option value="muscle_gain">Muskelaufbau (Überschuss)</option>
                  <option value="fat_loss">Abnehmen (Defizit)</option>
                  <option value="maintenance">Gewicht halten</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Aktivitätslevel (PAL-Faktor)</label>
                <select value={profileActivity} onChange={(e) => setProfileActivity(e.target.value)} className={inputCls}>
                  <option value="1.2">Kaum aktiv (Sitzend / Bürojob ohne Sport)</option>
                  <option value="1.375">Leicht aktiv (Leichte Bewegung, 1-3x Sport/Woche)</option>
                  <option value="1.55">Moderat aktiv (Mittlere Aktivität, 3-5x Sport/Woche)</option>
                  <option value="1.725">Sehr aktiv (Viel Bewegung, 6-7x Sport/Woche)</option>
                  <option value="1.9">Extrem aktiv (Schwere körperliche Arbeit / Profisport)</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-6 py-3 rounded-xl transition cursor-pointer disabled:opacity-60"
              >
                {savingProfile ? 'Speichere...' : 'Profildaten speichern'}
              </button>
              {profileNotice && (
                <span className={`text-xs font-medium ${profileNotice.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{profileNotice.text}</span>
              )}
            </div>
          </form>
        </div>

        {/* Pläne */}
        <div id="plaene" className={`${cardCls} scroll-mt-6`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
            <div>
              <h2 className="text-xl font-extrabold mb-1">Deine Pläne</h2>
              <p className="text-slate-400 text-sm">Wähle einen Wochentag, um deinen Ernährungs- und Trainingsplan einzusehen.</p>
            </div>
            <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                    selectedDay === day ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {day.slice(0, 2)}
                </button>
              ))}
            </div>
          </div>

          <div className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Ansicht für: {selectedDay}</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white">🥗 Ernährungsplan</h3>
              {currentDayNutrition.length === 0 ? (
                <p className="text-xs text-slate-500">Keine Mahlzeiten für {selectedDay} hinterlegt.</p>
              ) : (
                <div className="space-y-3">
                  {currentDayNutrition.map((meal) => (
                    <div key={meal.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-1">
                      <span className="font-bold text-xs text-white">{meal.title || 'Mahlzeit'}</span>
                      {meal.description && <p className="text-xs text-slate-300">{meal.description}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white">🏋️ Krafttrainings-Plan</h3>
              {currentDayWorkout.length === 0 ? (
                <p className="text-xs text-slate-500">Keine Übungen für {selectedDay} hinterlegt.</p>
              ) : (
                <div className="space-y-3">
                  {currentDayWorkout.map((ex) => (
                    <div key={ex.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-xs text-white block mb-1">{ex.title || 'Übung'}</span>
                        <p className="text-[11px] text-slate-400">
                          Sätze: <strong className="text-slate-200">{ex.sets ?? '-'}</strong> &bull; Wiederholungen:{' '}
                          <strong className="text-slate-200">{ex.reps ?? '-'}</strong>
                        </p>
                      </div>
                      {ex.weight !== null && ex.weight !== undefined && (
                        <span className="text-xs bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-xl font-bold border border-blue-500/20">
                          {ex.weight} kg
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tracking */}
        <div id="tracking" className={`${cardCls} scroll-mt-6`}>
          <div>
            <h2 className="text-xl font-extrabold mb-1">Tägliches Performance-Tracking</h2>
            <p className="text-slate-400 text-sm">
              Trage deine Werte ein. Mehrere Speicherungen am selben Tag aktualisieren deinen Tageswert.
            </p>
          </div>

          <form onSubmit={handleSaveTracking} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TRACKING_METRICS.map((metric) => (
                <div key={metric.key}>
                  <label className="block text-xs text-slate-400 mb-1">{metric.inputLabel}</label>
                  <input
                    type="number"
                    step={metric.step}
                    min={metric.min}
                    max={metric.max}
                    value={form[metric.key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [metric.key]: e.target.value }))}
                    placeholder={metric.placeholder}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={savingTracking}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-6 py-3 rounded-xl transition cursor-pointer disabled:opacity-60"
              >
                {savingTracking ? 'Speichere...' : 'Werte speichern'}
              </button>
              {trackingNotice && (
                <span className={`text-xs font-medium ${trackingNotice.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{trackingNotice.text}</span>
              )}
            </div>
          </form>

          <div className="space-y-4 pt-6 border-t border-slate-800">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Verlauf & Entwicklung</h3>
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

            <details className="group">
              <summary className="text-xs text-slate-400 hover:text-white cursor-pointer">Alle Einträge als Liste anzeigen</summary>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 mt-3">
                {trackingHistory.length === 0 ? (
                  <p className="text-xs text-slate-500">Noch keine Einträge vorhanden.</p>
                ) : (
                  trackingHistory.map((entry) => (
                    <div key={entry.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex flex-col md:flex-row md:items-center gap-2">
                      <span className="text-slate-400 font-medium md:w-24">
                        {new Date(entry.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                      <div className="flex flex-wrap gap-3 text-white">
                        {TRACKING_METRICS.map((metric) =>
                          entry[metric.key] !== null && entry[metric.key] !== undefined ? (
                            <span key={metric.key}>
                              {metric.title}: <strong className="text-emerald-400">{entry[metric.key]} {metric.unit}</strong>
                            </span>
                          ) : null
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </details>
          </div>
        </div>

        {/* Chat */}
        <div id="chat" className={`${cardCls} scroll-mt-6`}>
          <div>
            <h2 className="text-xl font-extrabold mb-1">Nachrichten & Chat</h2>
            <p className="text-slate-400 text-sm">Schreibe direkt mit deinen Trainern.</p>
          </div>
          <Chat currentUserId={client.id} />
        </div>

        <DeleteAccountCard role="client" />
      </section>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600 max-w-7xl mx-auto w-full">
        &copy; {new Date().getFullYear()} VeriFit. Alle Rechte vorbehalten.
      </footer>
    </main>
  );
}
