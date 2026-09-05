'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase Client Initialisierung (falls nicht ohnehin über eine zentrale lib eingebunden)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TrainerDashboardPage() {
  // Ersetze dies später durch die echte ID des aktuell eingeloggten Trainers aus der Auth-Session
  const trainerId = "HIER_DIE_TRAINER_ID_EINSETZEN"; 

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleApplyForVerification = async () => {
    if (!pdfFile) {
      alert('Bitte wähle zuerst eine PDF-Datei aus.');
      return;
    }

    setSubmitting(true);
    try {
      const fileName = `${trainerId}/zertifikat-${Date.now()}.pdf`;
      
      // 1. PDF in den Supabase Storage Bucket hochladen
      const { data, error } = await supabase.storage
        .from('trainer-documents')
        .upload(fileName, pdfFile);
      
      if (error) throw error;

      // 2. Datenbank aktualisieren: Status auf 'pending' und Pfad in 'license_number' speichern
      const { error: updateError } = await supabase
        .from('trainers')
        .update({
          status: 'pending',
          license_number: data.path,
        })
        .eq('id', trainerId);

      if (updateError) throw updateError;

      alert('Antrag erfolgreich eingereicht! Der Administrator prüft nun deine Dokumente.');
    } catch (err: any) {
      alert('Fehler beim Einreichen: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Trainer Dashboard</h1>
        
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h2 className="text-lg font-bold">Verifizierung & Dokumente hochladen</h2>
          <p className="text-xs text-slate-400">
            Lade deine Trainer-Lizenz oder Zertifikate als PDF hoch, um deinen Account freischalten zu lassen.
          </p>
          
          <div>
            <input 
              type="file" 
              accept=".pdf" 
              onChange={(e) => e.target.files && setPdfFile(e.target.files[0])}
              className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-500 file:text-slate-950 hover:file:bg-emerald-600 cursor-pointer"
            />
          </div>

          <button
            onClick={handleApplyForVerification}
            disabled={submitting}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
          >
            {submitting ? 'Wird hochgeladen...' : 'Antrag einreichen'}
          </button>
        </div>
      </div>
    </main>
  );
}