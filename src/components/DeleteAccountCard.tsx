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
    <div className="bg-slate-900 border border-red-500/20 rounded-3xl p-8 shadow-2xl space-y-4">
      <div>
        <h2 className="text-xl font-extrabold mb-1 text-red-400">Konto löschen</h2>
        <p className="text-slate-400 text-sm">
          {role === 'client'
            ? 'Dein Konto und alle deine Daten (Profil, Tracking, Pläne, Nachrichten) werden unwiderruflich gelöscht. Offene Anfragen werden storniert. Buchungsbelege bleiben anonymisiert erhalten.'
            : 'Dein Trainerprofil, deine Angebote, Termine, Dokumente, Pläne und Nachrichten werden unwiderruflich gelöscht. Offene Anfragen werden storniert. Buchungsbelege bleiben anonymisiert erhalten. Dein Stripe-Konto bleibt bei Stripe bestehen.'}
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">{error}</div>
      )}

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer"
        >
          <Trash2 size={14} /> Konto löschen
        </button>
      ) : (
        <div className="space-y-3">
          <label className="block text-xs text-slate-400">
            Tippe zur Bestätigung <strong className="text-white">{CONFIRM_WORD}</strong> ein:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full max-w-xs bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || confirmText !== CONFIRM_WORD}
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
