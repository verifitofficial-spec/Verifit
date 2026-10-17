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

  async function saveDocumentPath(nextPath: string | null): Promise<string | null> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.';

    const response = await fetch('/api/trainer/verification-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ kind, path: nextPath }),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    return response.ok ? null : data.error || 'Dokumentpfad konnte nicht gespeichert werden.';
  }

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

    const saveError = await saveDocumentPath(newPath);
    if (saveError) {
      await supabase.storage.from(BUCKET).remove([newPath]);
      onFeedback({ type: 'error', text: 'Fehler beim Speichern des Dokumentpfads: ' + saveError });
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

    const saveError = await saveDocumentPath(null);
    if (saveError) {
      onFeedback({ type: 'error', text: 'Fehler beim Aktualisieren des Profils: ' + saveError });
      return;
    }

    const { error: removeError } = await supabase.storage.from(BUCKET).remove([path]);
    if (removeError) {
      onFeedback({
        type: 'error',
        text: 'Der Datenbankeintrag wurde entfernt, die Datei im Speicher konnte aber nicht gelöscht werden.',
      });
    } else {
      onFeedback({ type: 'success', text: 'Dokument entfernt.' });
    }
    onPathChange(null);
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
    <div className="bg-canvas/80 border border-line rounded-xl p-5 space-y-3">
      <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">{label}</label>

      {path ? (
        <div className="flex items-center justify-between bg-surface border border-accent/45 rounded-xl p-3">
          <button
            type="button"
            onClick={handleView}
            className="text-xs text-accent hover:underline flex items-center gap-2 cursor-pointer"
          >
            📄 Dokument ansehen
          </button>
          <button type="button" onClick={handleDelete} className="text-xs text-danger hover:text-danger cursor-pointer">
            Entfernen
          </button>
        </div>
      ) : (
        <p className="text-xs text-ink-muted">Noch kein Dokument hochgeladen.</p>
      )}

      <label
        className={`block w-full text-center text-xs font-semibold py-2.5 rounded-xl border transition ${
          uploading
            ? 'bg-surface-soft border-line-strong text-ink-muted cursor-not-allowed'
            : 'bg-surface border-line-strong text-accent hover:border-accent/65 cursor-pointer'
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
