'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';

const CONFIRM_WORD = 'LÖSCHEN';

export default function DeleteAccountCard({ role }: { role: 'client' | 'trainer' }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleDelete() {
    setError('');
    setBusy(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setError('Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.');
      setBusy(false);
      return;
    }

    try {
      const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ confirm: CONFIRM_WORD }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(data.error || 'Das Konto konnte nicht gelöscht werden.');
        setBusy(false);
        return;
      }

      await supabase.auth.signOut({ scope: 'local' });
      router.push('/');
    } catch {
      setError('Netzwerkfehler. Bitte versuche es erneut.');
      setBusy(false);
    }
  }

  return (
    <div className="bg-surface border border-danger-line rounded-3xl p-8 shadow-2xl space-y-4">
      <div>
        <h2 className="text-xl font-extrabold mb-1 text-danger">Konto löschen</h2>
        <p className="text-ink-muted text-sm">
          {role === 'client'
            ? 'Dein Konto, dein Profil und deine zugehörigen personenbezogenen Daten werden unwiderruflich gelöscht. Kontaktanfragen werden nach dem festgelegten Lösch- und Aufbewahrungskonzept verarbeitet.'
            : 'Dein Konto, dein Trainerprofil, deine Angebote, Verifizierungsdokumente und zugehörigen personenbezogenen Daten werden unwiderruflich gelöscht. Kontaktanfragen werden nach dem festgelegten Lösch- und Aufbewahrungskonzept verarbeitet.'}
        </p>
      </div>

      {error && (
        <div className="p-3 bg-danger-soft border border-danger-line rounded-xl text-danger text-xs">{error}</div>
      )}

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 bg-danger-soft hover:bg-danger-soft border border-danger-line text-danger font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer"
        >
          <Trash2 size={14} /> Konto löschen
        </button>
      ) : (
        <div className="space-y-3">
          <label className="block text-xs text-ink-muted">
            Tippe zur Bestätigung <strong className="text-ink">{CONFIRM_WORD}</strong> ein:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full max-w-xs bg-canvas border border-line rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-danger-line"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || confirmText !== CONFIRM_WORD}
              onClick={handleDelete}
              className="bg-danger-strong hover:brightness-90 text-danger-foreground font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? 'Lösche...' : 'Endgültig löschen'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setConfirmText('');
                setError('');
              }}
              className="bg-surface-soft hover:bg-surface-hover border border-line-strong text-ink-soft font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
