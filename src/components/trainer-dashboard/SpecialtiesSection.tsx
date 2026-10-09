'use client';

import { useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { normalizeSpecialties } from '@/lib/constants';
import { SERVICE_MODE_OPTIONS } from '@/lib/trainer-dashboard/constants';
import type { Feedback, TrainerProfile } from '@/lib/trainer-dashboard/types';
import SpecialtyPicker from '@/components/SpecialtyPicker';
import { FeedbackBox, SectionCard, SectionHeader, labelClass } from './ui';

interface Props {
  trainer: TrainerProfile;
  onChange: (patch: Partial<TrainerProfile>) => void;
}

/** Ältere Werte wie "Hybrid" werden auf die aktuellen Optionen abgebildet. */
function normalizeServiceMode(value: string | null): string {
  if (!value) return SERVICE_MODE_OPTIONS[0];
  if (SERVICE_MODE_OPTIONS.includes(value)) return value;
  const lower = value.toLowerCase();
  if (lower.includes('hybrid') || (lower.includes('vor ort') && lower.includes('online'))) return SERVICE_MODE_OPTIONS[0];
  if (lower.includes('online')) return 'Online';
  if (lower.includes('vor ort')) return 'Vor Ort';
  return SERVICE_MODE_OPTIONS[0];
}

export default function SpecialtiesSection({ trainer, onChange }: Props) {
  const [selected, setSelected] = useState<string[]>(() => normalizeSpecialties(trainer.specialties));
  const [serviceMode, setServiceMode] = useState(() => normalizeServiceMode(trainer.service_mode));
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function toggleSpecialty(spec: string) {
    const previous = selected;
    const next = previous.includes(spec) ? previous.filter((s) => s !== spec) : [...previous, spec];
    setSelected(next);
    setFeedback(null);

    const joined = next.join(', ');
    const { error } = await supabase.from('trainers').update({ specialties: joined }).eq('id', trainer.id);
    if (error) {
      setSelected(previous);
      setFeedback({ type: 'error', text: 'Fehler beim Speichern der Spezialisierungen: ' + error.message });
      return;
    }
    onChange({ specialties: joined });
  }

  async function changeServiceMode(value: string) {
    const previous = serviceMode;
    setServiceMode(value);
    setFeedback(null);

    const { error } = await supabase.from('trainers').update({ service_mode: value }).eq('id', trainer.id);
    if (error) {
      setServiceMode(previous);
      setFeedback({ type: 'error', text: 'Fehler beim Speichern der Trainingsform: ' + error.message });
      return;
    }
    onChange({ service_mode: value });
  }

  return (
    <SectionCard>
      <SectionHeader
        icon={Dumbbell}
        title="Kompetenzgebiete (Fachgebiete, Trainingsform)"
        description="Es werden genau die Kategorien aus dem Matching-Quiz angezeigt. Deine Auswahl bestimmt, bei welchen Quiz-Zielen Kunden dich finden."
      />

      <FeedbackBox feedback={feedback} />

      <div>
        <label className={labelClass}>Trainingsform</label>
        <select
          value={serviceMode}
          onChange={(e) => void changeServiceMode(e.target.value)}
          className="w-full max-w-sm bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition shadow-inner"
        >
          <option value="Vor Ort & Online">Vor Ort & Online (Hybrid)</option>
          <option value="Vor Ort">Nur vor Ort</option>
          <option value="Online">Nur online</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Spezialisierungen
        </label>
        <SpecialtyPicker selected={selected} onToggle={toggleSpecialty} />
      </div>
    </SectionCard>
  );
}
