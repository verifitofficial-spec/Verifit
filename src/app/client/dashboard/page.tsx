'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';

export default function ClientDashboard() {
  const [email, setEmail] = useState('');
  const [client, setClient] = useState<any>(null);
  const [mySlots, setMySlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setMessage('');

    // Prüfen ob Kunde existiert, sonst automatisch anlegen
    let { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('email', email)
      .single();

    if (!clientData) {
      const { data: newClient, error } = await supabase
        .from('clients')
        .insert({ email, name: email.split('@')[0] })
        .select()
        .single();
      
      if (error) {
        setMessage('Fehler beim Login: ' + error.message);
        setLoading(false);
        return;
      }
      clientData = newClient;
    }

    setClient(clientData);
    loadClientSlots(email);
    setLoading(false);
  }

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

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <header className="flex justify-between items-center px-6 py-6 max-w-7xl mx-auto w-full border-b border-slate-900">
        <Link href="/" className="text-2xl font-black tracking-wider text-emerald-400">
          VERIFIT<span className="text-white">.</span> <span className="text-xs text-slate-400 font-normal">Kunden-Portal</span>
        </Link>
        <Link
          href="/"
          className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-xl transition border border-slate-800"
        >
          &larr; Zurück zur Startseite
        </Link>
      </header>

      <section className="max-w-3xl mx-auto px-6 py-12 w-full flex-1 space-y-8">
        {!client ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 max-w-md mx-auto">
            <div>
              <h1 className="text-2xl font-extrabold mb-1">Kunden-Anmeldung</h1>
              <p className="text-slate-400 text-sm">
                Gib deine E-Mail-Adresse ein, um deine angefragten und gebuchten Trainingstermine einzusehen.
              </p>
            </div>

            {message && (
              <p className="text-xs text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/25">{message}</p>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  E-Mail-Adresse
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3.5 rounded-xl text-sm transition shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                {loading ? 'Lade...' : 'Termine anzeigen'}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-6">
              <div>
                <h1 className="text-2xl font-extrabold">Deine gebuchten Termine</h1>
                <p className="text-slate-400 text-sm">Angemeldet als: {client.email}</p>
              </div>
              <button
                onClick={() => setClient(null)}
                className="text-xs bg-slate-950 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-xl border border-slate-800 cursor-pointer"
              >
                Abmelden
              </button>
            </div>

            <div className="space-y-4">
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
        )}
      </section>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600 max-w-7xl mx-auto w-full">
        &copy; {new Date().getFullYear()} VeriFit. Alle Rechte vorbehalten.
      </footer>
    </main>
  );
}