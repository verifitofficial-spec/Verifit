'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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

  useEffect(() => {
    fetchTrainers();
  }, []);

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

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Trainer Verifizierung</h1>
          <Link href="/" className="text-emerald-400 hover:text-emerald-300 text-sm">
            Zurück zur Startseite
          </Link>
        </div>

        <p className="text-slate-400 mb-8">
          Jeder Trainer auf VeriFit wird manuell geprüft: Zertifikate, Identität und fachliche Qualifikation.
        </p>

        {loading ? (
          <p className="text-slate-400">Lade Trainer-Daten...</p>
        ) : trainers.length === 0 ? (
          <p className="text-slate-400">Keine registrierten Trainer gefunden.</p>
        ) : (
          <div className="space-y-4">
            {trainers.map((trainer, index) => (
              <div 
                key={trainer.id || index} 
                className="p-5 bg-slate-900 border border-slate-800 rounded-lg shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold">{trainer.name}</h2>
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
                  <p className="text-slate-400 text-sm">{trainer.email}</p>
                  <p className="text-slate-300 bg-slate-950 p-3 rounded mt-2 text-sm">{trainer.bio}</p>
                </div>

                {/* Aktions-Buttons */}
                <div className="flex gap-2 w-full md:w-auto justify-end">
                  <button
                    onClick={() => updateTrainerStatus(trainer.id, 'approved')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded transition cursor-pointer"
                  >
                    Bestätigen
                  </button>
                  <button
                    onClick={() => updateTrainerStatus(trainer.id, 'rejected')}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded transition cursor-pointer"
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