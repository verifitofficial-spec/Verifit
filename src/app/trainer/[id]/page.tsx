'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';

export default function TrainerPublicProfile() {
  const params = useParams();
  const router = useRouter();
  const trainerId = params.id as string;

  const [trainer, setTrainer] = useState<any>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingSlot, setBookingSlot] = useState<any>(null);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    async function loadPublicData() {
      if (!trainerId) return;

      const { data: trainerData, error: trainerError } = await supabase
        .from('trainers')
        .select('*')
        .eq('id', trainerId)
        .single();

      if (trainerError || !trainerData) {
        setLoading(false);
        return;
      }

      setTrainer(trainerData);

      const { data: slotData } = await supabase
        .from('trainer_slots')
        .select('*')
        .eq('trainer_id', trainerId)
        .eq('status', 'free')
        .order('slot_date', { ascending: true });

      if (slotData) setSlots(slotData);
      setLoading(false);
    }

    loadPublicData();
  }, [trainerId]);

  async function handleBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingSlot || !clientName || !clientEmail) return;

    setSubmitting(true);

    const { error } = await supabase
      .from('trainer_slots')
      .update({
        status: 'pending',
        title: `${bookingSlot.title} (Gebucht von: ${clientName} - ${clientEmail})`
      })
      .eq('id', bookingSlot.id);

    if (error) {
      alert('Fehler bei der Buchung: ' + error.message);
    } else {
      // Automatische E-Mail-Benachrichtigung an den Trainer auslösen
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainerEmail: trainer.email,
          clientName,
          clientEmail,
          slotDate: bookingSlot.slot_date,
          slotTime: bookingSlot.slot_time.slice(0, 5),
          title: bookingSlot.title,
        }),
      });

      setSuccessMessage('Buchungsanfrage erfolgreich abgeschickt! Der Trainer wird sich in Kürze bei dir melden.');
      setBookingSlot(null);
      setClientName('');
      setClientEmail('');
      
      const { data: slotData } = await supabase
        .from('trainer_slots')
        .select('*')
        .eq('trainer_id', trainerId)
        .eq('status', 'free')
        .order('slot_date', { ascending: true });
      if (slotData) setSlots(slotData);
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400 text-sm">Lade Experten-Profil...</p>
      </div>
    );
  }

  if (!trainer) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-xl font-bold mb-2">Trainer nicht gefunden</h1>
        <Link href="/" className="text-emerald-400 text-sm hover:underline">Zurück zur Startseite</Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <header className="flex justify-between items-center px-6 py-6 max-w-7xl mx-auto w-full border-b border-slate-900">
        <Link href="/" className="text-2xl font-black tracking-wider text-emerald-400">
          VERIFIT<span className="text-white">.</span> <span className="text-xs text-slate-400 font-normal">Expert Hub</span>
        </Link>
        <Link href="/login" className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-xl transition border border-slate-800">
          Trainer Login
        </Link>
      </header>

      <section className="max-w-4xl mx-auto px-6 py-12 w-full flex-1 space-y-8">
        {successMessage && (
          <div className="p-4 rounded-xl text-sm border bg-emerald-500/10 border-emerald-500/25 text-emerald-400 text-center">
            {successMessage}
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-extrabold">{trainer.name}</h1>
                <span className="text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-full font-bold">
                  Verifiziert ✓
                </span>
              </div>
              <p className="text-slate-400 text-sm">{trainer.city || 'Standort flexibel'} &bull; <span className="text-emerald-400">{trainer.service_mode}</span></p>
            </div>
            <div className="bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl text-right">
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Status</span>
              <span className="text-xs font-bold text-emerald-400">{trainer.availability_status === 'available' ? 'Sofort verfügbar' : 'Warteliste'}</span>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Spezialgebiete</h3>
              <p className="text-sm font-medium text-slate-200">{trainer.specialties || 'Keine Angaben hinterlegt'}</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Über mich & Philosophie</h3>
              <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{trainer.bio || 'Keine Biografie vorhanden.'}</p>
            </div>
          </div>

          {trainer.package_category && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold uppercase">Hauptpaket</span>
                <h4 className="text-base font-bold mt-1">{trainer.package_category}</h4>
                <p className="text-xs text-slate-400">Laufzeit: {trainer.package_duration || 'Individuell'}</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-emerald-400">{trainer.package_price ? `${trainer.package_price} €` : 'Auf Anfrage'}</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div>
            <h2 className="text-xl font-extrabold mb-1">Verfügbare Termine & Slots</h2>
            <p className="text-slate-400 text-sm">Wähle einen freien Termin aus, um direkt eine Buchungsanfrage zu starten.</p>
          </div>

          {slots.length === 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-center text-slate-400 text-sm">
              Aktuell sind keine freien Termine verfügbar. Schau bald wieder vorbei!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {slots.map((slot) => (
                <div key={slot.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-emerald-400 block mb-0.5">{slot.slot_date} um {slot.slot_time.slice(0, 5)} Uhr</span>
                    <h4 className="text-sm font-semibold text-white">{slot.title}</h4>
                    <span className="text-xs text-slate-400">{slot.price ? `${slot.price} €` : 'Kostenlos'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBookingSlot(slot)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                  >
                    Buchen
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {bookingSlot && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleBooking} className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Termin verbindlich anfragen</h3>
              <button type="button" onClick={() => setBookingSlot(null)} className="text-slate-400 hover:text-white text-lg cursor-pointer">&times;</button>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
              <p className="text-emerald-400 font-bold">{bookingSlot.slot_date} um {bookingSlot.slot_time.slice(0, 5)} Uhr</p>
              <p className="text-slate-300">{bookingSlot.title}</p>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Dein Name:</label>
                <input type="text" required value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Max Mustermann" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Deine E-Mail-Adresse:</label>
                <input type="email" required value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="max@example.com" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setBookingSlot(null)} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">Abbrechen</button>
              <button type="submit" disabled={submitting} className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">
                {submitting ? 'Sende Anfrage...' : 'Anfrage absenden'}
              </button>
            </div>
          </form>
        </div>
      )}

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600 max-w-7xl mx-auto w-full">
        &copy; {new Date().getFullYear()} VeriFit. Alle Rechte vorbehalten.
      </footer>
    </main>
  );
}