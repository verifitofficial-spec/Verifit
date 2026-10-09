'use client';

import { useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import type { Feedback } from '@/lib/trainer-dashboard/types';

type DocumentKind = 'license' | 'insurance';

interface Props {
  label: string;
  kind: DocumentKind;
  trainerId: string;
  path: string | null;
  onPathChange: (path: string | null) => void;
  onFeedback: (feedback: Feedback) => void;
}

const BUCKET = 'verification-docs';
const MAX_BYTES = 10 * 1024 * 1024;

export default function DocumentUploadCard({ label, kind, trainerId, path, onPathChange, onFeedback }: Props) {
  const [uploading, setUploading] = useState(false);
  const dbField = kind === 'license' ? 'license_document_path' : 'insurance_document_path';

  async function handleUpload(file: File) {
    if (file.type !== 'application/pdf') {
      onFeedback({ type: 'error', text: 'Fehler: Bitte nur PDF-Dateien hochladen.' });
      return;
    }
    if (file.size > MAX_BYTES) {
      onFeedback({ type: 'error', text: 'Fehler: Die Datei darf maximal 10 MB groß sein.' });
      return;
    }

    setUploading(true);
    onFeedback(null);

    const newPath = `${trainerId}/${kind}-${Date.now()}.pdf`;
    const oldPath = path;

    // Erst hochladen und speichern, danach das alte Dokument entfernen (kein Datenverlust bei Fehlern).
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(newPath, file, { contentType: 'application/pdf', upsert: false });
    if (uploadError) {
      onFeedback({ type: 'error', text: 'Fehler beim Hochladen: ' + uploadError.message });
      setUploading(false);
      return;
    }

    const { error: dbError } = await supabase.from('trainers').update({ [dbField]: newPath }).eq('id', trainerId);
    if (dbError) {
      await supabase.storage.from(BUCKET).remove([newPath]);
      onFeedback({ type: 'error', text: 'Fehler beim Speichern des Dokumentpfads: ' + dbError.message });
      setUploading(false);
      return;
    }

    if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);

    onPathChange(newPath);
    onFeedback({
      type: 'success',
      text: kind === 'license' ? 'Lizenz-PDF erfolgreich hochgeladen!' : 'Versicherungsnachweis erfolgreich hochgeladen!',
    });
    setUploading(false);
  }

  async function handleDelete() {
    if (!path) return;
    if (!window.confirm('Dokument wirklich entfernen?')) return;

    const { error: removeError } = await supabase.storage.from(BUCKET).remove([path]);
    if (removeError) {
      onFeedback({ type: 'error', text: 'Fehler beim Löschen: ' + removeError.message });
      return;
    }
    const { error: dbError } = await supabase.from('trainers').update({ [dbField]: null }).eq('id', trainerId);
    if (dbError) {
      onFeedback({ type: 'error', text: 'Fehler beim Aktualisieren des Profils: ' + dbError.message });
      return;
    }
    onPathChange(null);
    onFeedback({ type: 'success', text: 'Dokument entfernt.' });
  }

  async function handleView() {
    if (!path) return;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
    if (error || !data) {
      onFeedback({ type: 'error', text: 'Fehler: Dokument konnte nicht geöffnet werden' + (error ? `: ${error.message}` : '.') });
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-3">
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>

      {path ? (
        <div className="flex items-center justify-between bg-slate-900 border border-emerald-500/30 rounded-xl p-3">
          <button
            type="button"
            onClick={handleView}
            className="text-xs text-emerald-400 hover:underline flex items-center gap-2 cursor-pointer"
          >
            📄 Dokument ansehen
          </button>
          <button type="button" onClick={handleDelete} className="text-xs text-red-400 hover:text-red-300 cursor-pointer">
            Entfernen
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-500">Noch kein Dokument hochgeladen.</p>
      )}

      <label
        className={`block w-full text-center text-xs font-semibold py-2.5 rounded-xl border transition ${
          uploading
            ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-slate-900 border-slate-700 text-emerald-400 hover:border-emerald-500/50 cursor-pointer'
        }`}
      >
        {uploading ? 'Lade hoch...' : path ? 'Ersetzen' : 'PDF hochladen'}
        <input
          type="file"
          accept="application/pdf"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
            e.target.value = '';
          }}
          className="hidden"
        />
      </label>
    </div>
  );
}
