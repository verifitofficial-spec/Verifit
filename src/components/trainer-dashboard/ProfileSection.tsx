'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import type { Feedback, TrainerProfile } from '@/lib/trainer-dashboard/types';
import { FeedbackBox, SectionCard, SectionHeader, inputClass, labelClass, primaryButtonClass } from './ui';

interface Props {
  trainer: TrainerProfile;
  onChange: (patch: Partial<TrainerProfile>) => void;
}

const AVATAR_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export default function ProfileSection({ trainer, onChange }: Props) {
  const [name, setName] = useState(trainer.name ?? '');
  const [city, setCity] = useState(trainer.city ?? '');
  const [bio, setBio] = useState(trainer.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const { error } = await supabase
      .from('trainers')
      .update({ name: name.trim(), bio, city: city.trim() })
      .eq('id', trainer.id);

    setSaving(false);
    if (error) {
      setFeedback({ type: 'error', text: 'Fehler beim Speichern: ' + error.message });
      return;
    }
    onChange({ name: name.trim(), bio, city: city.trim() });
    setFeedback({ type: 'success', text: 'Profil erfolgreich aktualisiert!' });
  }

  async function handleAvatarUpload(file: File) {
    const extension = AVATAR_TYPES[file.type];
    if (!extension) {
      setFeedback({ type: 'error', text: 'Fehler: Bitte JPG, PNG oder WebP auswählen.' });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setFeedback({ type: 'error', text: 'Fehler: Das Profilbild darf maximal 5 MB groß sein.' });
      return;
    }

    setUploadingAvatar(true);
    setFeedback(null);

    const path = `${trainer.id}/profile.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { contentType: file.type, upsert: true });
    if (uploadError) {
      setFeedback({ type: 'error', text: 'Fehler beim Hochladen des Profilbilds: ' + uploadError.message });
      setUploadingAvatar(false);
      return;
    }

    // Cache-Buster, damit ein ersetztes Bild sofort sichtbar ist (gleicher Pfad).
    const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(path);
    const avatarUrl = `${publicUrl.publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase.from('trainers').update({ avatar_url: avatarUrl }).eq('id', trainer.id);
    setUploadingAvatar(false);

    if (updateError) {
      setFeedback({ type: 'error', text: 'Fehler beim Speichern des Profilbilds: ' + updateError.message });
      return;
    }
    onChange({ avatar_url: avatarUrl });
    setFeedback({ type: 'success', text: 'Profilbild erfolgreich gespeichert.' });
  }

  return (
    <SectionCard>
      <SectionHeader
        icon={ShieldCheck}
        level={1}
        title="Persönliche Angaben (Profilbild, Stammdaten, Name, etc.)"
        description="Pflege deinen vollständigen Namen, Standort und deine Kurzbeschreibung."
      />

      <FeedbackBox feedback={feedback} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-950/70 border border-slate-800 rounded-xl p-4">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl font-bold text-emerald-400 shrink-0">
            {trainer.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={trainer.avatar_url} alt="Aktuelles Profilbild" className="w-full h-full object-cover" />
            ) : (
              <span>{name.charAt(0) || 'T'}</span>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-xs text-slate-300">Dieses Bild wird nach dem Quiz und in der Trainerliste angezeigt.</p>
            <label className="inline-flex items-center bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer">
              {uploadingAvatar ? 'Lade hoch...' : trainer.avatar_url ? 'Profilbild ersetzen' : 'Profilbild hochladen'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploadingAvatar}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleAvatarUpload(file);
                  e.target.value = '';
                }}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Vollständiger Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Standort (Stadt)</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Bio / Über mich</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className={`${inputClass} resize-none`} />
        </div>

        <button type="submit" disabled={saving} className={`w-full py-3.5 ${primaryButtonClass}`}>
          {saving ? 'Speichere...' : 'Profil aktualisieren'}
        </button>
      </form>
    </SectionCard>
  );
}
