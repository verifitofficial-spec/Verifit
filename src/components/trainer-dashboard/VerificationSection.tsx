'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import type { Feedback, TrainerProfile } from '@/lib/trainer-dashboard/types';
import DocumentUploadCard from './DocumentUploadCard';
import { FeedbackBox, SectionCard, SectionHeader, inputClass, labelClass, primaryButtonClass } from './ui';

interface Props {
  trainer: TrainerProfile;
  onChange: (patch: Partial<TrainerProfile>) => void;
}

export default function VerificationSection({ trainer, onChange }: Props) {
  const [licenseNumber, setLicenseNumber] = useState(trainer.license_number ?? '');
  const [insuranceExpiry, setInsuranceExpiry] = useState(trainer.liability_insurance_expiry ?? '');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // Vorher wurden diese beiden Felder nur über den Button im Profilbereich gespeichert.
  async function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const { error } = await supabase
      .from('trainers')
      .update({
        license_number: licenseNumber.trim() || null,
        liability_insurance_expiry: insuranceExpiry || null,
      })
      .eq('id', trainer.id);

    setSaving(false);
    if (error) {
      setFeedback({ type: 'error', text: 'Fehler beim Speichern: ' + error.message });
      return;
    }
    onChange({
      license_number: licenseNumber.trim() || null,
      liability_insurance_expiry: insuranceExpiry || null,
    });
    setFeedback({ type: 'success', text: 'Angaben gespeichert.' });
  }

  return (
    <SectionCard>
      <SectionHeader
        icon={ShieldCheck}
        title="Lizenzen, Ausweis & Verifizierungs-Bereich"
        description="Uploads und Status für amtlichen Ausweis, Berufshaftpflicht und Trainerlizenzen für die Admin-Prüfung."
      />

      <form onSubmit={handleSaveDetails} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Lizenznummer / Zertifikat</label>
            <input
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="z.B. A-Lizenz Fitness"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Haftpflichtversicherung gültig bis</label>
            <input
              type="date"
              value={insuranceExpiry}
              onChange={(e) => setInsuranceExpiry(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <button type="submit" disabled={saving} className={`px-5 py-2.5 text-xs ${primaryButtonClass}`}>
          {saving ? 'Speichere...' : 'Angaben speichern'}
        </button>
      </form>

      <FeedbackBox feedback={feedback} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <DocumentUploadCard
          label="Trainerlizenz / Zertifikat (PDF)"
          kind="license"
          trainerId={trainer.id}
          path={trainer.license_document_path}
          onPathChange={(path) => onChange({ license_document_path: path })}
          onFeedback={setFeedback}
        />
        <DocumentUploadCard
          label="Berufshaftpflicht-Nachweis (PDF)"
          kind="insurance"
          trainerId={trainer.id}
          path={trainer.insurance_document_path}
          onPathChange={(path) => onChange({ insurance_document_path: path })}
          onFeedback={setFeedback}
        />
      </div>
    </SectionCard>
  );
}
