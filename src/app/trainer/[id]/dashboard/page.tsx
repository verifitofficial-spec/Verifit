'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';
import Chat from '@/components/Chat';

const AVAILABLE_SPECIALTIES = [
  'Athletiktraining',
  'Ernährungsberatung',
  'Fettabbau',
  'Functional Training',
  'Gewichtsmanagement',
  'Ganzkörpertraining',
  'Gesundheitsorientiertes Krafttraining',
  'HIIT & Cardio',
  'Hypertrophie',
  'Körperhaltung & Core',
  'Leistungsdiagnostik',
  'Lauftraining & Ausdauer',
  'Mobility & Stretching',
  'Muskelaufbau',
  'Postnatales Training',
  'Pränatales Training',
  'Reha & Prävention',
  'Rückentraining',
  'Seniorenfitness',
  'Stoffwechseloptimierung',
  'Stressabbau & Entspannung',
  'Sportartspezifisches Training',
  'Transformation',
  'Yogalates & Core'
].sort((a, b) => a.localeCompare(b, 'de'));

export default function TrainerDashboard() {
  const [trainer, setTrainer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [serviceMode, setServiceMode] = useState('Vor Ort & Online');
  
  // Spezialgebiete Tagging States (Game-Style Grid)
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);

  const [licenseNumber, setLicenseNumber] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [packageCategory, setPackageCategory] = useState('');
  const [packageDuration, setPackageDuration] = useState('');
  const [packagePrice, setPackagePrice] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState('available');

  // Kalender-States & Grid Navigation
  const [slotDate, setSlotDate] = useState('');
  const [slotTime, setSlotTime] = useState('');
  const [slotTitle, setSlotTitle] = useState('Discovery-Call / Erstgespräch');
  const [slotPrice, setSlotPrice] = useState('0');
  const [slots, setSlots] = useState<any[]>([]);
  
  const [currentDate, setCurrentDate] = useState(new Date());

  // Multi-Tages-States
  const [isMultiOpen, setIsMultiOpen] = useState(false);
  const [multiStart, setMultiStart] = useState('');
  const [multiEnd, setMultiEnd] = useState('');
  const [multiTime, setMultiTime] = useState('10:00');

  useEffect(() => {
    async function loadTrainerData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data } = await supabase
        .from('trainers')
        .select('*')
        .eq('email', user.email)
        .single();

      if (data) {
        setTrainer(data);
        setName(data.name || '');
        setBio(data.bio || '');
        setCity(data.city || '');
        setServiceMode(data.service_mode || 'Vor Ort & Online');
        
        if (data.specialties) {
          setSelectedSpecialties(
            data.specialties.split(',').map((s: string) => s.trim()).filter(Boolean)
          );
        }

        setLicenseNumber(data.license_number || '');
        setInsuranceExpiry(data.liability_insurance_expiry || '');
        setPackageCategory(data.package_category || '');
        setPackageDuration(data.package_duration || '');
        setPackagePrice(data.package_price ? String(data.package_price) : '');
        setAvailabilityStatus(data.availability_status || 'available');

        loadSlots(data.id);
      }
      setLoading(false);
    }

    loadTrainerData();
  }, [router]);

  async function loadSlots(trainerId: string) {
    const { data } = await supabase
      .from('trainer_slots')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('slot_date', { ascending: true });
    if (data) setSlots(data);
  }

  async function handleAddSlot(e: React.FormEvent, overrideDate?: string) {
    if (e) e.preventDefault();
    const targetDate = overrideDate || slotDate;
    const targetTime = overrideDate ? '10:00' : slotTime;
    
    if (!targetDate || !targetTime || !trainer) {
      alert('Bitte Datum und Uhrzeit angeben.');
      return;
    }

    const payload = {
      trainer_id: trainer.id,
      slot_date: targetDate,
      slot_time: targetTime.length === 5 ? targetTime + ':00' : targetTime,
      title: slotTitle,
      price: slotPrice ? parseFloat(slotPrice) : 0,
      status: 'free'
    };

    const { error } = await supabase.from('trainer_slots').insert(payload).select();

    if (error) {
      alert('Fehler beim Eintragen des Slots: ' + (error.message || JSON.stringify(error)));
    } else {
      setSlotDate('');
      setSlotTime('');
      setSlotTitle('Discovery-Call / Erstgespräch');
      setSlotPrice('0');
      loadSlots(trainer.id);
    }
  }

  async function handleCreateMultiSlots(e: React.FormEvent) {
    e.preventDefault();
    if (!multiStart || !multiEnd || !trainer) return;

    const start = new Date(multiStart);
    const end = new Date(multiEnd);
    const newSlots = [];

    let curr = new Date(start);
    while (curr <= end) {
      const dateString = formatDateString(curr);
      newSlots.push({
        trainer_id: trainer.id,
        slot_date: dateString,
        slot_time: multiTime.length === 5 ? multiTime + ':00' : multiTime,
        title: slotTitle,
        price: slotPrice ? parseFloat(slotPrice) : 0,
        status: 'free'
      });
      curr.setDate(curr.getDate() + 1);
    }

    const { error } = await supabase.from('trainer_slots').insert(newSlots);
    if (error) {
      alert('Fehler beim Generieren der Multi-Slots: ' + error.message);
    } else {
      setIsMultiOpen(false);
      setMultiStart('');
      setMultiEnd('');
      loadSlots(trainer.id);
    }
  }

  async function handleDeleteSlot(slotId: string) {
    await supabase.from('trainer_slots').delete().eq('id', slotId);
    loadSlots(trainer.id);
  }

  async function handleApproveSlot(slotId: string) {
    await supabase
      .from('trainer_slots')
      .update({ status: 'confirmed' })
      .eq('id', slotId);
    loadSlots(trainer.id);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const specialtiesString = selectedSpecialties.join(', ');

    const { error } = await supabase
      .from('trainers')
      .update({
        name,
        bio,
        city,
        service_mode: serviceMode,
        specialties: specialtiesString,
        license_number: licenseNumber,
        liability_insurance_expiry: insuranceExpiry || null,
        package_category: packageCategory,
        package_duration: packageDuration,
        package_price: packagePrice ? parseFloat(packagePrice) : null,
        availability_status: availabilityStatus,
      })
      .eq('id', trainer.id);

    if (error) {
      setMessage('Fehler beim Speichern: ' + error.message);
    } else {
      setMessage('Profil & Sicherheitsnachweise erfolgreich aktualisiert!');
    }
    setSaving(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  let startDayIndex = firstDayOfMonth.getDay() - 1;
  if (startDayIndex === -1) startDayIndex = 6;

  const daysInMonth = lastDayOfMonth.getDate();
  const calendarDays = [];

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayIndex - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    calendarDays.push({ dateObj: d, isCurrentMonth: false });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    calendarDays.push({ dateObj: d, isCurrentMonth: true });
  }

  const remainingDays = 7 - (calendarDays.length % 7);
  if (remainingDays < 7) {
    for (let i = 1; i <= remainingDays; i++) {
      const d = new Date(year, month + 1, i);
      calendarDays.push({ dateObj: d, isCurrentMonth: false });
    }
  }

  function formatDateString(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400 text-sm">Lade Dashboard...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <header className="flex justify-between items-center px-6 py-6 max-w-7xl mx-auto w-full border-b border-slate-900">
        <Link href="/" className="text-2xl font-black tracking-wider text-emerald-400">
          VERIFIT<span className="text-white">.</span> <span className="text-xs text-slate-400 font-normal">Expert Hub</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full text-slate-300">
            Status: <strong className={trainer?.status === 'approved' ? 'text-emerald-400' : 'text-amber-400'}>
              {trainer?.status === 'approved' ? 'Verifiziert ✓' : 'Prüfung ausstehend (Pending)'}
            </strong>
          </span>
          <button
            onClick={handleLogout}
            className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-xl transition cursor-pointer border border-slate-800"
          >
            Abmelden
          </button>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-12 w-full flex-1 space-y-8">
        
        {/* Chat-Sektion direkt im Trainer-Dashboard */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div>
            <h2 className="text-xl font-extrabold mb-1">Kunden-Chat & Nachrichten</h2>
            <p className="text-slate-400 text-sm">
              Kommuniziere in Echtzeit mit deinen Kunden und Anfragenden.
            </p>
          </div>
          {trainer && <Chat currentUserId={trainer.id} />}
        </div>

        {/* Profil-Formular */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div>
            <h1 className="text-2xl font-extrabold mb-1">Trainer Master-Profil & Sicherheit</h1>
            <p className="text-slate-400 text-sm">
              Pflege deine Qualifikationen und den obligatorischen Haftpflicht-Nachweis für die Admin-Prüfung.
            </p>
          </div>

          {message && (
            <div className={`p-3 rounded-xl text-xs border ${message.includes('Fehler') ? 'bg-red-500/10 border-red-500/25 text-red-400' : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Vollständiger Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Standort (Stadt)
                </label>
                <input
                  type="text"
                  placeholder="z.B. Berlin / Köln"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Service-Modus
                </label>
                <select
                  value={serviceMode}
                  onChange={(e) => setServiceMode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Vor Ort">Vor Ort</option>
                  <option value="Hybrid">Hybrid (Vor Ort & Online)</option>
                  <option value="Online">Rein Online</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Live-Kapazitätsstatus
                </label>
                <select
                  value={availabilityStatus}
                  onChange={(e) => setAvailabilityStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="available">Sofort verfügbar</option>
                  <option value="waitlist">Warteliste / Exklusiv (Voll)</option>
                </select>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-6 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400">
                Sicherheits- & Lizenznachweise (Admin-Prüfung)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Lizenznummer / Qualifikation
                  </label>
                  <input
                    type="text"
                    placeholder="z.B. A-Lizenz / Sportwissenschaften B.Sc."
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Berufshaftpflicht Ablaufdatum
                  </label>
                  <input
                    type="date"
                    value={insuranceExpiry}
                    onChange={(e) => setInsuranceExpiry(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Spezialgebiete Game-Style Auswahl */}
            <div className="space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Spezialgebiete & Kernkompetenzen (Klicken zum Auswählen)
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {AVAILABLE_SPECIALTIES.map((spec) => {
                  const isSelected = selectedSpecialties.includes(spec);
                  return (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedSpecialties(selectedSpecialties.filter((s) => s !== spec));
                        } else {
                          setSelectedSpecialties([...selectedSpecialties, spec]);
                        }
                      }}
                      className={`p-2.5 text-xs font-medium rounded-xl border text-center transition cursor-pointer flex items-center justify-center ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-500/20'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {spec}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2 pt-2">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Aktuell ausgewählt:
                </span>
                <div className="flex flex-wrap gap-2 min-h-[46px] p-3 bg-slate-950 border border-slate-800 rounded-xl items-center">
                  {selectedSpecialties.length === 0 ? (
                    <span className="text-xs text-slate-500 px-2">Noch keine Spezialgebiete ausgewählt...</span>
                  ) : (
                    selectedSpecialties.map((spec) => (
                      <span
                        key={spec}
                        className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 font-medium shadow-sm"
                      >
                        {spec}
                        <button
                          type="button"
                          onClick={() => setSelectedSpecialties(selectedSpecialties.filter((s) => s !== spec))}
                          className="text-emerald-400/70 hover:text-emerald-300 font-bold text-sm cursor-pointer transition"
                        >
                          &times;
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Biografie & Trainingsphilosophie
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none h-28"
                placeholder="Beschreibe deinen Ansatz und deine Qualifikationen..."
              />
            </div>

            <div className="border-t border-slate-800 pt-6 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400">
                Angebotspaket
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Kategorie
                  </label>
                  <select
                    value={packageCategory}
                    onChange={(e) => setPackageCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Bitte wählen...</option>
                    <option value="1-zu-1 Personal Training">1-zu-1 Personal Training</option>
                    <option value="Ernährungs- & Stoffwechselcoaching">Ernährungs- & Stoffwechselcoaching</option>
                    <option value="Reha & Schmerzprävention">Reha & Schmerzprävention</option>
                    <option value="Athletik & Longevity-Programm">Athletik & Longevity-Programm</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Laufzeit
                  </label>
                  <input
                    type="text"
                    placeholder="z.B. 3 Monate"
                    value={packageDuration}
                    onChange={(e) => setPackageDuration(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Preis (€)
                  </label>
                  <input
                    type="number"
                    placeholder="499"
                    value={packagePrice}
                    onChange={(e) => setPackagePrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3.5 rounded-xl text-sm transition shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              {saving ? 'Speichere...' : 'Profil aktualisieren'}
            </button>
          </form>
        </div>

        {/* Kalender-Sektion */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-extrabold mb-1">Plattforminterner Kalender</h2>
              <p className="text-slate-400 text-sm">
                Verwalte deine Termin-Slots im Monatsgitter. Bestätige Kundenanfragen per Klick.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMultiOpen(true)}
                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-sm font-bold cursor-pointer transition"
              >
                + Multi-Tages-Slots
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-sm border border-slate-700 cursor-pointer"
                >
                  &larr;
                </button>
                <span className="text-sm font-bold px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg min-w-[140px] text-center">
                  {monthNames[month]} {year}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-sm border border-slate-700 cursor-pointer"
                >
                  &rarr;
                </button>
              </div>
            </div>
          </div>

          <form onSubmit={handleAddSlot} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Zweck / Paket wählen
              </label>
              <select
                value={slotTitle}
                onChange={(e) => {
                  const val = e.target.value;
                  setSlotTitle(val);
                  if (val === 'Discovery-Call / Erstgespräch') {
                    setSlotPrice('0');
                  } else if (val === 'Einzeltraining / Coaching') {
                    setSlotPrice('80');
                  } else if (packageCategory && val === packageCategory) {
                    setSlotPrice(packagePrice || '0');
                  }
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Discovery-Call / Erstgespräch">Discovery-Call / Erstgespräch (0 €)</option>
                {packageCategory ? (
                  <option value={packageCategory}>
                    {packageCategory} ({packagePrice ? `${packagePrice} €` : 'Preis offen'})
                  </option>
                ) : (
                  <option value="1-zu-1 Personal Training">1-zu-1 Personal Training</option>
                )}
                <option value="Einzeltraining / Coaching">Einzeltraining / Coaching</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Preis (€)
              </label>
              <input
                type="number"
                value={slotPrice}
                onChange={(e) => setSlotPrice(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Datum & Uhrzeit
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={slotDate}
                  onChange={(e) => setSlotDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  required
                />
                <input
                  type="time"
                  value={slotTime}
                  onChange={(e) => setSlotTime(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-xl text-sm transition cursor-pointer"
            >
              Slot eintragen
            </button>
          </form>

          {/* Kalender Spaltenraster */}
          <div className="overflow-x-auto">
            <div className="min-w-[700px] grid grid-cols-7 gap-px bg-slate-800 border border-slate-800 rounded-xl overflow-hidden">
              {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((dayName, idx) => (
                <div key={idx} className="bg-slate-950 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {dayName}
                </div>
              ))}

              {calendarDays.map((cd, idx) => {
                const dateStr = formatDateString(cd.dateObj);
                const daySlots = slots.filter((s) => s.slot_date === dateStr);

                return (
                  <div
                    key={idx}
                    className={`bg-slate-900 min-h-[110px] p-2 flex flex-col justify-between ${
                      !cd.isCurrentMonth ? 'opacity-30 bg-slate-950' : ''
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
                      <span>{cd.dateObj.getDate()}</span>
                      <button
                        type="button"
                        onClick={() => handleAddSlot(null as any, dateStr)}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 px-1 rounded bg-emerald-500/10 cursor-pointer"
                        title="Schnell-Slot hinzufügen"
                      >
                        +
                      </button>
                    </div>

                    <div className="space-y-1 mt-2 flex-1">
                      {daySlots.map((slot) => {
                        let slotBg = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                        let badgeText = `${slot.slot_time.slice(0, 5)} - ${slot.price ? `${slot.price}€` : 'Frei'}`;

                        if (slot.status === 'pending') {
                          slotBg = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                          badgeText = `${slot.slot_time.slice(0, 5)} - Anfrage`;
                        } else if (slot.status === 'confirmed') {
                          slotBg = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
                          badgeText = `${slot.slot_time.slice(0, 5)} - Gebucht ✓`;
                        }

                        return (
                          <div
                            key={slot.id}
                            className={`p-1.5 rounded text-[11px] border ${slotBg} flex flex-col gap-1`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold truncate" title={`${slot.title} (${slot.price}€)`}>{badgeText}</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="text-red-400 hover:text-red-300 text-[10px] cursor-pointer"
                              >
                                &times;
                              </button>
                            </div>
                            
                            {slot.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => handleApproveSlot(slot.id)}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-0.5 rounded text-[10px] cursor-pointer"
                              >
                                Approve
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Tages-Modal */}
      {isMultiOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateMultiSlots} className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold">Multi-Tages-Slots generieren</h3>
            <p className="text-slate-400 text-xs">Erstelle schnell gleiche Uhrzeiten über einen Zeitraum hinweg.</p>
            
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Startdatum</label>
              <input
                type="date"
                value={multiStart}
                onChange={(e) => setMultiStart(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Enddatum</label>
              <input
                type="date"
                value={multiEnd}
                onChange={(e) => setMultiEnd(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Uhrzeit</label>
              <input
                type="time"
                value={multiTime}
                onChange={(e) => setMultiTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsMultiOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                Generieren
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}