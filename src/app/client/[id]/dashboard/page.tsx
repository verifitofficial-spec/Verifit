'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';
import Chat from '@/components/Chat';

export default function ClientDashboard({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const clientId = resolvedParams.id;

  const [client, setClient] = useState<any>(null);
  const [mySlots, setMySlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadClientData() {
      // 1. Kundendaten anhand der ID aus der URL laden
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
      loadClientSlots(clientData.email);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-sm text-slate-400">Lade Dashboard...</p>
      </div>
    );
  }

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

      <section className="max-w-3xl mx-auto px-6 py-12 w-full flex-1 space-y-8">
        <div className="space-y-8">
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

          {/* Integrierter Echtzeit-Chat für den Kunden */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
            <div>
              <h2 className="text-xl font-extrabold mb-1">Nachrichten & Chat</h2>
              <p className="text-slate-400 text-sm">
                Schreibe direkt mit deinen Trainern.
              </p>
            </div>
            <Chat currentUserId={client.id} />
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600 max-w-7xl mx-auto w-full">
        &copy; {new Date().getFullYear()} VeriFit. Alle Rechte vorbehalten.
      </footer>
    </main>
  );
}