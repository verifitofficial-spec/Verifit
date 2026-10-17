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

const fieldLabel = 'block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5';

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
      description="Definiere Trainingsform, Abrechnung, Leistungsumfang und Preis."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-danger-soft border border-danger-line rounded-xl text-xs text-danger">{error}</div>
        )}

        <div>
          <label className={fieldLabel}>Typ</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDraft({
                ...draft,
                type: 'discovery',
                price: 0,
                pricingModel: '',
                includedSessions: null,
              })}
              className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                isDiscovery
                  ? 'bg-accent-soft border-accent text-accent'
                  : 'bg-canvas border-line text-ink-muted hover:text-ink-soft'
              }`}
            >
              Kostenloses Erstgespräch
            </button>
            <button
              type="button"
              onClick={() => setDraft({ ...draft, type: 'paid', price: draft.price > 0 ? draft.price : 90 })}
              className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                !isDiscovery
                  ? 'bg-surface-hover border-slate-500 text-ink'
                  : 'bg-canvas border-line text-ink-muted hover:text-ink-soft'
              }`}
            >
              Kostenpflichtiges Paket
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="offer-service-mode" className={fieldLabel}>Trainingsform</label>
            <select
              id="offer-service-mode"
              value={draft.serviceMode}
              onChange={(e) => setDraft({ ...draft, serviceMode: e.target.value as OfferDraft['serviceMode'] })}
              className={smallInputClass}
            >
              <option value="" disabled>Bitte auswählen</option>
              <option value="Vor Ort">Vor Ort</option>
              <option value="Online">Online-Coaching</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>
          <div>
            <label htmlFor="offer-pricing-model" className={fieldLabel}>Abrechnung</label>
            <select
              id="offer-pricing-model"
              value={draft.pricingModel}
              disabled={isDiscovery}
              onChange={(e) => setDraft({
                ...draft,
                pricingModel: e.target.value as OfferDraft['pricingModel'],
                includedSessions: e.target.value === 'package' ? draft.includedSessions : null,
              })}
              className={`${smallInputClass} ${isDiscovery ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <option value="" disabled>Bitte auswählen</option>
              <option value="single_session">Preis pro Einheit</option>
              <option value="package">Paketpreis</option>
              <option value="monthly">Monatliche Pauschale</option>
            </select>
          </div>
        </div>

        {!isDiscovery && draft.pricingModel === 'package' && (
          <div>
            <label htmlFor="offer-included-sessions" className={fieldLabel}>Enthaltene Einheiten</label>
            <input
              id="offer-included-sessions"
              required
              type="number"
              min="1"
              step="1"
              value={draft.includedSessions ?? ''}
              onChange={(e) => setDraft({ ...draft, includedSessions: e.target.value ? Number(e.target.value) : null })}
              className={smallInputClass}
            />
            <p className="mt-2 text-xs leading-5 text-ink-muted">Ohne Laufzeit wird der Paketpreis nicht als scheinbar exakter Monatsbetrag ausgegeben.</p>
          </div>
        )}

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
