'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';
import Chat from '@/components/Chat';

type TrackingEntry = {
  id: string;
  created_at: string;
  weight: number | null;
  water: number | null;
  calories: number | null;
  sleep: number | null;
  mood: number | null;
};

type NutritionPlan = {
  id: string;
  day_of_week: string;
  meal_title: string;
  description: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

type WorkoutPlan = {
  id: string;
  day_of_week: string;
  exercise_name: string;
  sets: number | null;
  reps: string | null;
  weight: number | null;
};

const DAYS_OF_WEEK = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

export default function ClientDashboard({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const clientId = resolvedParams.id;

  const [client, setClient] = useState<any>(null);
  const [mySlots, setMySlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tracking States
  const [weight, setWeight] = useState('');
  const [water, setWater] = useState('');
  const [calories, setCalories] = useState('');
  const [sleep, setSleep] = useState('');
  const [mood, setMood] = useState('');
  const [shareData, setShareData] = useState(true);
  const [savingTracking, setSavingTracking] = useState(false);
  const [trackingSuccess, setTrackingSuccess] = useState(false);

  // Körper- & Profildaten States für automatische Berechnung
  const [profileHeight, setProfileHeight] = useState('');
  const [profileAge, setProfileAge] = useState('');
  const [profileGender, setProfileGender] = useState('male');
  const [profileGoal, setProfileGoal] = useState('muscle_gain');
  const [profileActivity, setProfileActivity] = useState('1.55');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Historie & Analyse Filter States
  const [trackingHistory, setTrackingHistory] = useState<TrackingEntry[]>([]);
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month' | 'year'>('week');

  // Pläne States
  const [nutritionPlans, setNutritionPlans] = useState<NutritionPlan[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('Montag');

  const router = useRouter();

  useEffect(() => {
    async function loadClientData() {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError || !clientData) {
        router.push('/client/login');
        return;
      }

      setClient(clientData);
      setShareData(clientData.share_data ?? true);
      
      // Profildaten initialisieren falls vorhanden
      setProfileHeight(clientData.height ? String(clientData.height) : '');
      setProfileAge(clientData.age ? String(clientData.age) : '');
      setProfileGender(clientData.gender || 'male');
      setProfileGoal(clientData.goal || 'muscle_gain');
      setProfileActivity(clientData.activity_level ? String(clientData.activity_level) : '1.55');

      loadClientSlots(clientData.email);
      loadTrackingHistory(clientData.id);
      loadPlans(clientData.id);
      setLoading(false);
    }

    loadClientData();
  }, [clientId, router]);

  async function loadClientSlots(clientEmail: string) {
    const { data } = await supabase
      .from('trainer_slots')
      .select('*, trainers(name, city, service_mode)')
      .eq('client_email', clientEmail)
      .order('slot_date', { ascending: true });

    if (data) {
      setMySlots(data);
    }
  }

  async function loadTrackingHistory(cId: string) {
    const { data } = await supabase
      .from('client_trackings')
      .select('*')
      .eq('client_id', cId)
      .order('created_at', { ascending: false });

    if (data) {
      setTrackingHistory(data);
      if (data.length > 0) {
        setWeight(data[0].weight ? String(data[0].weight) : '');
        setWater(data[0].water ? String(data[0].water) : '');
        setCalories(data[0].calories ? String(data[0].calories) : '');
        setSleep(data[0].sleep ? String(data[0].sleep) : '');
        setMood(data[0].mood ? String(data[0].mood) : '');
      }
    }
  }

  async function loadPlans(cId: string) {
    const { data: nutData } = await supabase
      .from('nutrition_plans')
      .select('*')
      .eq('client_id', cId);

    if (nutData) {
      setNutritionPlans(nutData);
    }

    const { data: workData } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('client_id', cId);

    if (workData) {
      setWorkoutPlans(workData);
    }
  }

  // Speichern der Körperdaten & Freigabe
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess(false);

    const { error } = await supabase
      .from('clients')
      .update({
        height: profileHeight ? parseFloat(profileHeight) : null,
        age: profileAge ? parseInt(profileAge) : null,
        gender: profileGender,
        goal: profileGoal,
        activity_level: parseFloat(profileActivity),
        share_data: shareData,
      })
      .eq('id', clientId);

    setSavingProfile(false);
    if (!error) {
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 4000);
    }
  }

  async function handleSaveTracking(e: React.FormEvent) {
    e.preventDefault();
    setSavingTracking(true);
    setTrackingSuccess(false);

    const todayStr = new Date().toISOString().split('T')[0];

    const { data: existingEntries } = await supabase
      .from('client_trackings')
      .select('id, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    const todayEntry = existingEntries?.find(entry => {
      const entryDateStr = new Date(entry.created_at).toISOString().split('T')[0];
      return entryDateStr === todayStr;
    });

    let error;

    if (todayEntry) {
      const { error: updateError } = await supabase
        .from('client_trackings')
        .update({
          weight: weight ? parseFloat(weight) : null,
          water: water ? parseFloat(water) : null,
          calories: calories ? parseInt(calories) : null,
          sleep: sleep ? parseFloat(sleep) : null,
          mood: mood ? parseInt(mood) : null,
        })
        .eq('id', todayEntry.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('client_trackings').insert([
        {
          client_id: clientId,
          weight: weight ? parseFloat(weight) : null,
          water: water ? parseFloat(water) : null,
          calories: calories ? parseInt(calories) : null,
          sleep: sleep ? parseFloat(sleep) : null,
          mood: mood ? parseInt(mood) : null,
        },
      ]);
      error = insertError;
    }

    // Aktuelles Gewicht direkt in den Stammdaten synchronisieren, falls Gewicht eingegeben
    if (weight) {
      await supabase
        .from('clients')
        .update({ weight: parseFloat(weight) })
        .eq('id', clientId);
    }

    setSavingTracking(false);
    if (!error) {
      setTrackingSuccess(true);
      loadTrackingHistory(clientId);
      setTimeout(() => setTrackingSuccess(false), 4000);
    }
  }

  async function handleCancelSlot(slotId: string) {
    const { error } = await supabase
      .from('trainer_slots')
      .update({
        status: 'free',
        client_name: null,
        client_email: null,
      })
      .eq('id', slotId);

    if (!error && client) {
      loadClientSlots(client.email);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/client/login');
  }

  const getFilteredHistory = () => {
    const now = new Date();
    return trackingHistory.filter(entry => {
      const entryDate = new Date(entry.created_at);
      const diffTime = now.getTime() - entryDate.getTime();
      const diffDays = diffTime / (1000 * 3600 * 24);

      if (timeFilter === 'day') return diffDays <= 1;
      if (timeFilter === 'week') return diffDays <= 7;
      if (timeFilter === 'month') return diffDays <= 30;
      if (timeFilter === 'year') return diffDays <= 365;
      return true;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-sm text-slate-400">Lade Dashboard...</p>
      </div>
    );
  }

  const filteredHistory = getFilteredHistory();
  const currentDayNutrition = nutritionPlans.filter(p => p.day_of_week === selectedDay);
  const currentDayWorkout = workoutPlans.filter(p => p.day_of_week === selectedDay);

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
        {/* Willkommens- & Termin-Sektion */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-6">
            <div>
              <h1 className="text-2xl font-extrabold">Willkommen, {client.name}</h1>
              <p className="text-slate-400 text-sm">Angemeldet als: {client.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-bold">Deine gebuchten Termine</h2>
            {mySlots.length === 0 ? (
              <p className="text-xs text-slate-500">Du hast bisher keine Termine angefragt.</p>
            ) : (
              <div className="space-y-3">
                {mySlots.map((slot) => {
                  let badge = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                  let statusText = 'Anfrage ausstehend (Wartet auf Bestätigung)';
                  if (slot.status === 'confirmed') {
                    badge = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                    statusText = 'Vom Trainer bestätigt ✓';
                  }

                  return (
                    <div key={slot.id} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-white text-sm">{slot.title}</span>
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full border ${badge}`}>
                            {statusText}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Trainer: <strong className="text-slate-200">{slot.trainers?.name}</strong> &bull; {slot.slot_date} um {slot.slot_time} Uhr
                        </p>
                      </div>

                      <button
                        onClick={() => handleCancelSlot(slot.id)}
                        className="text-xs text-red-400 hover:text-red-300 px-3 py-2 bg-red-500/10 rounded-xl border border-red-500/20 cursor-pointer"
                      >
                        Termin absagen
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* NEU: Körper- & Zieldaten für automatische Berechnung & Freigabe */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div>
            <h2 className="text-xl font-extrabold mb-1">Körper- & Zieldaten für deinen Coach</h2>
            <p className="text-slate-400 text-sm">Diese Angaben werden benötigt, um deinen Kalorienbedarf exakt zu berechnen. Du kannst den Zugriff für deinen Trainer jederzeit steuern.</p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Körpergröße (cm)</label>
                <input
                  type="number"
                  value={profileHeight}
                  onChange={(e) => setProfileHeight(e.target.value)}
                  placeholder="z.B. 178"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Alter (Jahre)</label>
                <input
                  type="number"
                  value={profileAge}
                  onChange={(e) => setProfileAge(e.target.value)}
                  placeholder="z.B. 28"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Geschlecht</label>
                <select
                  value={profileGender}
                  onChange={(e) => setProfileGender(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="male">Männlich</option>
                  <option value="female">Weiblich</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Ziel</label>
                <select
                  value={profileGoal}
                  onChange={(e) => setProfileGoal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="muscle_gain">Muskelaufbau (Überschuss)</option>
                  <option value="fat_loss">Abnehmen (Defizit)</option>
                  <option value="maintenance">Gewicht halten</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Aktivitätslevel (PAL-Faktor)</label>
                <select
                  value={profileActivity}
                  onChange={(e) => setProfileActivity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="1.2">Kaum aktiv (Sitzend / Bürojob ohne Sport)</option>
                  <option value="1.375">Leicht aktiv (Leichte Bewegung, 1-3x Sport/Woche)</option>
                  <option value="1.55">Moderat aktiv (Mittlere Aktivität, 3-5x Sport/Woche)</option>
                  <option value="1.725">Sehr aktiv (Viel Bewegung, 6-7x Sport/Woche)</option>
                  <option value="1.9">Extrem aktiv (Schwere körperliche Arbeit / Profisport)</option>
                </select>
              </div>
            </div>

            {/* Freigabe-Schalter für den Trainer */}
            <div className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-200">Datenfreigabe für Trainer</p>
                <p className="text-[11px] text-slate-500">Erlaube deinem Coach den Zugriff, um deinen Kalorienbedarf automatisch zu berechnen.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareData}
                  onChange={(e) => setShareData(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-6 py-3 rounded-xl transition cursor-pointer"
              >
                {savingProfile ? 'Speichere...' : 'Profildaten speichern'}
              </button>
              {profileSuccess && (
                <span className="text-xs text-emerald-400 font-medium">Erfolgreich gespeichert! ✓</span>
              )}
            </div>
          </form>
        </div>

        {/* Ernährungs- & Trainingspläne (Wochen- und Tagesansicht) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
            <div>
              <h2 className="text-xl font-extrabold mb-1">Deine Pläne</h2>
              <p className="text-slate-400 text-sm">Wähle einen Wochentag aus, um deinen Ernährungs- und Trainingsplan einzusehen.</p>
            </div>

            {/* Wochentag Auswahl */}
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

          <div className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
            Ansicht für: {selectedDay}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ernährungsplan des Tages */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                🥗 Ernährungsplan
              </h3>
              {currentDayNutrition.length === 0 ? (
                <p className="text-xs text-slate-500">Keine Mahlzeiten für {selectedDay} hinterlegt.</p>
              ) : (
                <div className="space-y-3">
                  {currentDayNutrition.map((meal) => (
                    <div key={meal.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs text-white">{meal.meal_title}</span>
                        {meal.calories && (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                            {meal.calories} kcal
                          </span>
                        )}
                      </div>
                      {meal.description && <p className="text-xs text-slate-300">{meal.description}</p>}
                      <div className="flex gap-3 text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                        {meal.protein !== null && <span>Protein: <strong className="text-slate-200">{meal.protein}g</strong></span>}
                        {meal.carbs !== null && <span>Kohlenhydrate: <strong className="text-slate-200">{meal.carbs}g</strong></span>}
                        {meal.fat !== null && <span>Fett: <strong className="text-slate-200">{meal.fat}g</strong></span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Krafttraining-Plan des Tages */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                🏋️ Krafttrainings-Plan
              </h3>
              {currentDayWorkout.length === 0 ? (
                <p className="text-xs text-slate-500">Keine Übungen für {selectedDay} hinterlegt.</p>
              ) : (
                <div className="space-y-3">
                  {currentDayWorkout.map((ex) => (
                    <div key={ex.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-xs text-white block mb-1">{ex.exercise_name}</span>
                        <p className="text-[11px] text-slate-400">
                          Sätze: <strong className="text-slate-200">{ex.sets}</strong> &bull; Wiederholungen: <strong className="text-slate-200">{ex.reps}</strong>
                        </p>
                      </div>
                      {ex.weight !== null && (
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

        {/* Performance-Tracking & Verlauf */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-extrabold mb-1">Tägliches Performance-Tracking</h2>
              <p className="text-slate-400 text-sm">Trage deine Werte ein. Mehrere Einträge am selben Tag aktualisieren automatisch deinen Tageswert.</p>
            </div>

            {/* Zeitraum Filter */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {(['day', 'week', 'month', 'year'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer capitalize ${
                    timeFilter === filter ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {filter === 'day' && 'Tag'}
                  {filter === 'week' && 'Woche'}
                  {filter === 'month' && 'Monat'}
                  {filter === 'year' && 'Jahr'}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSaveTracking} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Gewicht (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="z.B. 78.5"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Wasseraufnahme (Liter)</label>
                <input
                  type="number"
                  step="0.1"
                  value={water}
                  onChange={(e) => setWater(e.target.value)}
                  placeholder="z.B. 3.0"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Kalorien (kcal)</label>
                <input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="z.B. 2200"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Schlaf (Stunden)</label>
                <input
                  type="number"
                  step="0.5"
                  value={sleep}
                  onChange={(e) => setSleep(e.target.value)}
                  placeholder="z.B. 7.5"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Wohlbefinden / Energie (Skala 1 - 10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  placeholder="z.B. 8"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={savingTracking}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-6 py-3 rounded-xl transition cursor-pointer"
              >
                {savingTracking ? 'Speichere...' : 'Werte speichern'}
              </button>
              {trackingSuccess && (
                <span className="text-xs text-emerald-400 font-medium">Erfolgreich gespeichert! ✓</span>
              )}
            </div>
          </form>

          {/* Verlaufstabelle mit Entwicklungs-Skala / Trend */}
          <div className="space-y-3 pt-6 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Verlauf & Entwicklung ({timeFilter.toUpperCase()})
            </h3>
            {filteredHistory.length === 0 ? (
              <p className="text-xs text-slate-500">Keine Einträge für diesen Zeitraum vorhanden.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {filteredHistory.map((entry, index) => {
                  let weightDiff = null;
                  if (index < filteredHistory.length - 1 && entry.weight !== null && filteredHistory[index + 1].weight !== null) {
                    weightDiff = Number((entry.weight - filteredHistory[index + 1].weight!).toFixed(1));
                  }

                  return (
                    <div key={entry.id} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center text-xs gap-2">
                      <div className="text-slate-400 font-medium">
                        {new Date(entry.created_at).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="flex flex-wrap gap-4 text-white items-center">
                        {entry.weight !== null && (
                          <div className="flex items-center gap-1.5">
                            <span>Gewicht: <strong className="text-emerald-400">{entry.weight} kg</strong></span>
                            {weightDiff !== null && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${weightDiff < 0 ? 'bg-emerald-500/10 text-emerald-400' : weightDiff > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>
                                {weightDiff > 0 ? `+${weightDiff}` : weightDiff} kg
                              </span>
                            )}
                          </div>
                        )}
                        {entry.water !== null && <span>Wasser: <strong className="text-emerald-400">{entry.water}L</strong></span>}
                        {entry.calories !== null && <span>kcal: <strong className="text-emerald-400">{entry.calories}</strong></span>}
                        {entry.sleep !== null && <span>Schlaf: <strong className="text-emerald-400">{entry.sleep}h</strong></span>}
                        {entry.mood !== null && <span>Wohlbefinden: <strong className="text-emerald-400">{entry.mood}/10</strong></span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Echtzeit-Chat */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div>
            <h2 className="text-xl font-extrabold mb-1">Nachrichten & Chat</h2>
            <p className="text-slate-400 text-sm">Schreibe direkt mit deinen Trainern.</p>
          </div>
          <Chat currentUserId={client.id} />
        </div>
      </section>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600 max-w-7xl mx-auto w-full">
        &copy; {new Date().getFullYear()} VeriFit. Alle Rechte vorbehalten.
      </footer>
    </main>
  );
}