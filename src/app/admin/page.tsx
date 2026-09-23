'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

type Trainer = {
  id: string;
  name: string;
  email: string;
  bio: string;
  status?: string;
};

export default function VerificationPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Sicherheitsprüfung und Laden der Trainer beim Start der Seite
  useEffect(() => {
    async function checkAdminSession() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/admin/login');
        return;
      }

      // Prüfen, ob die Rolle in profiles wirklich admin ist
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        await supabase.auth.signOut();
        router.push('/admin/login');
        return;
      }

      fetchTrainers();
    }

    checkAdminSession();
  }, [router]);

  // Trainer aus Supabase laden
  async function fetchTrainers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('trainers')
      .select('*');

    if (error) {
      console.error('Fehler beim Laden der Trainer:', error.message);
    } else {
      setTrainers(data || []);
    }
    setLoading(false);
  }

  // Status eines Trainers aktualisieren (z.B. 'approved' oder 'rejected')
  async function updateTrainerStatus(id: string, newStatus: 'approved' | 'rejected') {
    const { error } = await supabase
      .from('trainers')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      console.error('Fehler beim Aktualisieren des Status:', error.message);
      alert('Fehler beim Speichern.');
    } else {
      // Liste lokal aktualisieren, damit die UI sofort reagiert
      setTrainers(prev =>
        prev.map(t => (t.id === id ? { ...t, status: newStatus } : t))
      );
    }
  }

  // Admin Logout Funktion
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-emerald-400">Trainer Verifizierung</h1>
            <p className="text-xs text-slate-400 mt-1">Admin Control Center</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-slate-400 hover:text-white text-sm transition">
              Zur Startseite
            </Link>
            <button
              onClick={handleLogout}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs px-4 py-2 rounded-xl transition cursor-pointer text-slate-300"
            >
              Abmelden
            </button>
          </div>
        </div>

        <p className="text-slate-400 mb-8 text-sm">
          Jeder Trainer auf VeriFit wird manuell geprüft: Zertifikate, Identität und fachliche Qualifikation.
        </p>

        {loading ? (
          <p className="text-slate-400 text-sm">Lade Trainer-Daten...</p>
        ) : trainers.length === 0 ? (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl text-center text-slate-400 text-sm">
            Keine registrierten Trainer gefunden.
          </div>
        ) : (
          <div className="space-y-4">
            {trainers.map((trainer, index) => (
              <div 
                key={trainer.id || index} 
                className="p-5 bg-slate-900 border border-slate-800 rounded-xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-white">{trainer.name || 'Unbenannter Trainer'}</h2>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      trainer.status === 'approved' 
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                        : trainer.status === 'rejected'
                        ? 'bg-red-950 text-red-400 border border-red-800'
                        : 'bg-yellow-950 text-yellow-400 border border-yellow-800'
                    }`}>
                      {trainer.status === 'approved' ? 'Bestätigt' : trainer.status === 'rejected' ? 'Abgelehnt' : 'Ausstehend'}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs">{trainer.email}</p>
                  <p className="text-slate-300 bg-slate-950 p-3 rounded-lg mt-2 text-xs border border-slate-800/60">
                    {trainer.bio || 'Keine Bio angegeben.'}
                  </p>
                </div>

                {/* Aktions-Buttons */}
                <div className="flex gap-2 w-full md:w-auto justify-end">
                  <button
                    onClick={() => updateTrainerStatus(trainer.id, 'approved')}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Bestätigen
                  </button>
                  <button
                    onClick={() => updateTrainerStatus(trainer.id, 'rejected')}
                    className="px-4 py-2 bg-slate-800 hover:bg-red-950/40 text-red-400 border border-red-900/40 text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    Ablehnen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}