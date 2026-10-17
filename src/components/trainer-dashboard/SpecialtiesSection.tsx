'use client';

import { useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { normalizeSpecialties } from '@/lib/constants';
import { isAuthorizationError, isInvalidPayloadError } from '@/lib/supabaseErrors';
import type { Feedback, TrainerProfile } from '@/lib/trainer-dashboard/types';
import SpecialtyPicker from '@/components/SpecialtyPicker';
import { FeedbackBox, SectionCard, SectionHeader, labelClass } from './ui';
import {
  EXPERIENCE_LEVELS,
  isMissingPhase3MetadataError,
  normalizeServiceMode,
  normalizeTargetLevels,
  toggleTargetLevelSelection,
  type ExperienceLevel,
} from '@/lib/matching';

interface Props {
  trainer: TrainerProfile;
  onChange: (patch: Partial<TrainerProfile>) => void;
}

export default function SpecialtiesSection({ trainer, onChange }: Props) {
  const [selected, setSelected] = useState<string[]>(() => normalizeSpecialties(trainer.specialties));
  const [serviceMode, setServiceMode] = useState(() => normalizeServiceMode(trainer.service_mode) ?? '');
  const targetLevels = normalizeTargetLevels(trainer.target_levels);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [savingField, setSavingField] = useState<'specialties' | 'serviceMode' | 'targetLevels' | null>(null);

  async function toggleSpecialty(spec: string) {
    if (savingField) return;
    const previous = selected;
    const next = previous.includes(spec) ? previous.filter((s) => s !== spec) : [...previous, spec];
    setSelected(next);
    setFeedback(null);
    setSavingField('specialties');

    const joined = next.join(', ');
    const { data, error } = await supabase
      .from('trainers')
      .update({ specialties: joined })
      .eq('id', trainer.id)
      .select('specialties')
      .maybeSingle();
    setSavingField(null);
    if (error || !data) {
      setSelected(previous);
      setFeedback({
        type: 'error',
        text: isAuthorizationError(error) || !data
          ? 'Spezialisierungen konnten wegen fehlender Berechtigung nicht gespeichert werden. Bitte melde dich erneut an.'
          : isInvalidPayloadError(error)
            ? 'Die gewählten Spezialisierungen wurden von der Datenbank abgelehnt.'
          : 'Spezialisierungen konnten wegen eines Datenbankfehlers nicht gespeichert werden.',
      });
      return;
    }
    onChange({ specialties: joined });
  }

  async function changeServiceMode(value: string) {
    if (savingField) return;
    const previous = serviceMode;
    setServiceMode(value);
    setFeedback(null);
    setSavingField('serviceMode');

    const { data, error } = await supabase
      .from('trainers')
      .update({ service_mode: value })
      .eq('id', trainer.id)
      .select('service_mode')
      .maybeSingle();
    setSavingField(null);
    if (error || !data) {
      setServiceMode(previous);
      setFeedback({
        type: 'error',
        text: isAuthorizationError(error) || !data
          ? 'Die Trainingsform konnte wegen fehlender Berechtigung nicht gespeichert werden. Bitte melde dich erneut an.'
          : isInvalidPayloadError(error)
            ? 'Die gewählte Trainingsform wurde von der Datenbank abgelehnt.'
          : 'Die Trainingsform konnte wegen eines Datenbankfehlers nicht gespeichert werden.',
      });
      return;
    }
    onChange({ service_mode: value });
  }

  async function toggleTargetLevel(level: ExperienceLevel) {
    if (savingField) return;
    const next = toggleTargetLevelSelection(targetLevels, level);
    setFeedback(null);
    setSavingField('targetLevels');

    const { data, error } = await supabase
      .from('trainers')
      .update({ target_levels: next })
      .eq('id', trainer.id)
      .select('target_levels')
      .maybeSingle();
    setSavingField(null);
    if (error || !data) {
      setFeedback({
        type: 'error',
        text: isMissingPhase3MetadataError(error)
          ? 'Zielgruppen sind in dieser Datenbank noch nicht verfügbar. Das Feld „target_levels“ aus Phase 3 fehlt.'
          : isAuthorizationError(error) || !data
            ? 'Zielgruppen konnten wegen fehlender Berechtigung nicht gespeichert werden. Bitte melde dich erneut an.'
            : isInvalidPayloadError(error)
              ? 'Die gewählten Zielgruppen wurden von der Datenbank abgelehnt.'
            : 'Zielgruppen konnten wegen eines Datenbankfehlers nicht gespeichert werden.',
      });
      return;
    }
    onChange({ target_levels: normalizeTargetLevels(data.target_levels) });
  }

  return (
    <SectionCard>
      <SectionHeader
        icon={Dumbbell}
        title="Kompetenzen"
        description="Fachgebiete, Trainingsform und betreute Niveaus."
      />

      <FeedbackBox feedback={feedback} />

      <div>
        <label className={labelClass}>Trainingsform</label>
        <select
          value={serviceMode}
          onChange={(e) => void changeServiceMode(e.target.value)}
          disabled={savingField !== null}
          className="w-full max-w-sm bg-canvas/80 border border-line rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-accent transition shadow-inner"
        >
          <option value="" disabled>Bitte auswählen</option>
          <option value="Hybrid">Vor Ort & Online (Hybrid)</option>
          <option value="Vor Ort">Nur vor Ort</option>
          <option value="Online">Nur online</option>
        </select>
      </div>

      <fieldset>
        <legend className={labelClass}>Betreute Trainingsniveaus</legend>
        <p className="mb-3 text-xs leading-5 text-ink-muted">Nur gewählte Niveaus erscheinen als passend.</p>
        <div className="flex flex-wrap gap-2">
          {EXPERIENCE_LEVELS.map((level) => {
            const active = targetLevels.includes(level);
            return (
              <button
                key={level}
                type="button"
                aria-pressed={active}
                disabled={savingField !== null}
                onClick={() => void toggleTargetLevel(level)}
                className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${
                  active
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line-strong bg-surface text-ink-soft hover:border-line-strong'
                }`}
              >
                {level}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">
          Spezialisierungen
        </label>
        <SpecialtyPicker selected={selected} disabled={savingField !== null} onToggle={toggleSpecialty} />
      </div>
    </SectionCard>
  );
}
