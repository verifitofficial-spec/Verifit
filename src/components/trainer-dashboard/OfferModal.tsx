'use client';

import { useState } from 'react';
import type { OfferDraft } from '@/lib/trainer-dashboard/types';
import { ModalShell, primaryButtonClass, smallInputClass } from './ui';

interface Props {
  initial: OfferDraft;
  editing: boolean;
  onClose: () => void;
  onSubmit: (draft: OfferDraft) => Promise<string | null>;
}

const fieldLabel = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5';

export default function OfferModal({ initial, editing, onClose, onSubmit }: Props) {
  const [draft, setDraft] = useState<OfferDraft>(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isDiscovery = draft.type === 'discovery';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const result = await onSubmit(draft);
    setBusy(false);
    if (result) setError(result);
    else onClose();
  }

  return (
    <ModalShell
      title={editing ? 'Angebot bearbeiten' : 'Neues Angebot erstellen'}
      description="Definiere Titel, Dauer und Preis für dein Trainer-Paket."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-xs text-red-400">{error}</div>
        )}

        <div>
          <label className={fieldLabel}>Typ</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDraft({ ...draft, type: 'discovery', price: 0 })}
              className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                isDiscovery
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              Kostenloses Erstgespräch
            </button>
            <button
              type="button"
              onClick={() => setDraft({ ...draft, type: 'paid', price: draft.price > 0 ? draft.price : 90 })}
              className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                !isDiscovery
                  ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400'
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              Kostenpflichtiges Paket
            </button>
          </div>
        </div>

        <div>
          <label className={fieldLabel}>Titel des Angebots</label>
          <input
            required
            type="text"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className={smallInputClass}
            placeholder="z.B. 10er Karte Personal Training"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={fieldLabel}>Dauer (Minuten)</label>
            <input
              required
              type="number"
              min="5"
              value={draft.duration}
              onChange={(e) => setDraft({ ...draft, duration: Number(e.target.value) })}
              className={smallInputClass}
            />
          </div>
          <div>
            <label className={fieldLabel}>Preis (€)</label>
            <input
              required
              type="number"
              min="0"
              disabled={isDiscovery}
              value={isDiscovery ? 0 : draft.price}
              onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
              className={`${smallInputClass} ${isDiscovery ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>
        </div>

        <div>
          <label className={fieldLabel}>Beschreibung</label>
          <textarea
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            rows={3}
            className={`${smallInputClass} resize-none`}
            placeholder="Kurze Beschreibung der Leistung..."
          />
        </div>

        <button type="submit" disabled={busy} className={`w-full py-2.5 mt-2 ${primaryButtonClass}`}>
          {busy ? 'Speichere...' : editing ? 'Änderungen speichern' : 'Angebot anlegen'}
        </button>
      </form>
    </ModalShell>
  );
}
