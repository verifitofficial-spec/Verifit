'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';

export default function PublicTrainersPage() {
  const [trainers, setTrainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [selectedTrainer, setSelectedTrainer] = useState<any>(null);
  const [trainerSlots, setTrainerSlots] = useState<any[]>([]);
  const [bookingMessage, setBookingMessage] = useState('');

  useEffect(() => {
    fetchApprovedTrainers();
  }, []);

  async function fetchApprovedTrainers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('trainers')
      .select('*')
      .eq('status', 'approved');

    if (error) {
      console.error('Fehler beim Laden der Trainer:', error.message);
    } else {
      setTrainers(data || []);
    }
    setLoading(false);
  }

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

  async function handleBookSlot(slotId: string) {
    const { error } = await supabase
      .from('trainer_slots')
      .update({ status: 'pending' })
      .eq('id', slotId);

    if (error) {
      setBookingMessage('Fehler bei der Buchungsanfrage: ' + error.message);
    } else {
      setBookingMessage('Termin erfolgreich angefragt! Der Trainer wird benachrichtigt.');
      // Slots neu laden
      openBookingModal(selectedTrainer);
    }
  }

  const filteredTrainers = trainers.filter(t => {
    const matchesCity = cityFilter === '' || (t.city && t.city.toLowerCase().includes(cityFilter.toLowerCase()));
    const matchesSpecialty = specialtyFilter === '' || (t.specialties && t.specialties.toLowerCase().includes(specialtyFilter.toLowerCase()));
    return matchesCity && matchesSpecialty;
  });

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <header className="flex justify-between items-center px-6 py-6 max-w-7xl mx-auto w-full border-b border-slate-900">
        <Link href="/" className="text-2xl font-black tracking-wider text-emerald-400">
          VERIFIT<span className="text-white">.</span> <span className="text-xs text-slate-400 font-normal">Client Hub</span>
        </Link>
        <Link href="/login" className="text-xs bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 transition">
          Trainer Login
        </Link>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-12 w-full flex-1 space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold mb-2">Verifizierte Experten finden</h1>
          <p className="text-slate-400 text-sm">
            Entdecke geprüfte Personal Trainer, Coaches und Spezialisten für dein Training.
          </p>
        </div>

        {/* Such- und Filterleiste */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Standort / Stadt</label>
            <input
              type="text"
              placeholder="z.B. Berlin"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Spezialgebiet</label>
            <input
              type="text"
              placeholder="z.B. Rückentraining, Leistungsdiagnostik"
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Trainer Grid */}
        {loading ? (
          <p className="text-slate-400 text-sm">Lade verifizierte Trainer...</p>
        ) : filteredTrainers.length === 0 ? (
          <p className="text-slate-400 text-sm">Keine passenden Trainer gefunden.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrainers.map((trainer) => (
              <div key={trainer.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-xl">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <h2 className="text-lg font-bold">{trainer.name}</h2>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                      Verifiziert ✓
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{trainer.city || 'Online / Flexibel'} • {trainer.service_mode}</p>
                  <p className="text-xs text-emerald-400 font-semibold">{trainer.specialties || 'Allrounder'}</p>
                  <p className="text-xs text-slate-300 line-clamp-3 mt-2">{trainer.bio || 'Keine Biografie hinterlegt.'}</p>
                </div>

                {trainer.package_category && (
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                    <div className="font-bold text-slate-200">{trainer.package_category}</div>
                    <div className="text-slate-400">Laufzeit: {trainer.package_duration || 'Individuell'}</div>
                    <div className="text-emerald-400 font-bold">{trainer.package_price ? `${trainer.package_price} €` : 'Preis auf Anfrage'}</div>
                  </div>
                )}

                <button
                  onClick={() => openBookingModal(trainer)}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                >
                  Slots ansehen & Buchen
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal für Slot-Buchung */}
      {selectedTrainer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Termin bei {selectedTrainer.name}</h3>
              <button
                onClick={() => setSelectedTrainer(null)}
                className="text-slate-400 hover:text-white text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {bookingMessage && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl">
                {bookingMessage}
              </div>
            )}

            <div className="space-y-2 max-h-60 overflow-y-auto">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Verfügbare Freigaben:</h4>
              {trainerSlots.length === 0 ? (
                <p className="text-xs text-slate-500">Derzeit keine freien Slots verfügbar.</p>
              ) : (
                trainerSlots.map((slot) => (
                  <div key={slot.id} className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <div className="font-bold">{slot.title}</div>
                      <div className="text-slate-400">{slot.slot_date} um {slot.slot_time.slice(0, 5)} Uhr • {slot.price}€</div>
                    </div>
                    <button
                      onClick={() => handleBookSlot(slot.id)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer"
                    >
                      Anfragen
                    </button>
                  </div>
                ))
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