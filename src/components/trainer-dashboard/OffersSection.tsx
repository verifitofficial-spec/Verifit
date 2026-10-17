'use client';

import { useState } from 'react';
import { Briefcase, CircleOff, Clock, Edit3, Plus } from 'lucide-react';
import type { Feedback, OfferDraft, OfferTemplate } from '@/lib/trainer-dashboard/types';
import OfferModal from './OfferModal';
import { FeedbackBox, SectionCard, SectionHeader } from './ui';

interface Props {
  offers: OfferTemplate[];
  loading: boolean;
  loadError: string | null;
  onRetry: () => void;
  onSave: (draft: OfferDraft, editingId: string | null) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
}

const EMPTY_DRAFT: OfferDraft = {
  title: '', type: 'paid', duration: 60, price: 90, description: '',
  serviceMode: '', pricingModel: '', includedSessions: null,
};

export default function OffersSection({ offers, loading, loadError, onRetry, onSave, onDelete }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<OfferDraft>(EMPTY_DRAFT);
  const [feedback, setFeedback] = useState<Feedback>(null);

  function openCreate() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setModalOpen(true);
  }

  function openEdit(offer: OfferTemplate) {
    setEditingId(offer.id);
    setDraft({
      title: offer.title,
      type: offer.type,
      duration: offer.duration,
      price: offer.price,
      description: offer.description,
      serviceMode: offer.serviceMode ?? '',
      pricingModel: offer.pricingModel ?? '',
      includedSessions: offer.includedSessions,
    });
    setModalOpen(true);
  }

  async function handleDeactivate(offer: OfferTemplate) {
    if (!window.confirm(`Angebot „${offer.title}“ wirklich deaktivieren? Bestehende Kontaktanfragen bleiben erhalten.`)) return;
    const error = await onDelete(offer.id);
    setFeedback(error
      ? { type: 'error', text: error }
      : { type: 'success', text: `Angebot „${offer.title}“ wurde deaktiviert.` });
  }

  return (
    <SectionCard>
      <SectionHeader
        icon={Briefcase}
        title="Angebote"
        description="Leistungen und Preise für dein öffentliches Profil."
        actions={
          <button
            type="button"
            onClick={openCreate}
            disabled={loading || Boolean(loadError)}
            className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-accent-strong"
          >
            <Plus size={14} /> Angebot erstellen
          </button>
        }
      />

      <FeedbackBox feedback={feedback} />

      {loading ? (
        <p className="text-xs text-ink-muted">Angebote werden geladen...</p>
      ) : loadError ? (
        <div role="alert" className="border border-danger-line bg-danger-soft p-4 text-sm text-danger">
          <p>{loadError}</p>
          <button type="button" onClick={onRetry} className="mt-3 min-h-10 rounded-lg border border-danger-line px-3 py-2 text-xs font-semibold">
            Erneut versuchen
          </button>
        </div>
      ) : offers.length === 0 ? (
        <p className="text-xs text-ink-muted">
          Noch keine Angebote. Kunden können dir trotzdem eine allgemeine Kontaktanfrage senden.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="bg-canvas/80 border border-line/80 rounded-xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                      offer.type === 'discovery'
                        ? 'bg-accent-soft text-accent border border-accent/35'
                        : 'bg-surface-soft text-ink-soft border-line-strong'
                    }`}
                  >
                    {offer.type === 'discovery' ? 'Kostenlos (0€)' : 'Bezahlt'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(offer)}
                      className="text-ink-muted hover:text-ink p-1 cursor-pointer"
                      title="Bearbeiten"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeactivate(offer)}
                      className="text-ink-muted hover:text-danger p-1 cursor-pointer"
                      title="Deaktivieren"
                      aria-label={`Angebot ${offer.title} deaktivieren`}
                    >
                      <CircleOff size={14} />
                    </button>
                  </div>
                </div>
                <h3 className="text-sm font-bold text-ink mb-1">{offer.title}</h3>
                <p className="text-ink-muted text-xs mb-4">{offer.description}</p>
                <p className="mb-4 text-xs text-ink-muted">
                  {offer.serviceMode ?? 'Trainingsform noch nicht klassifiziert'}
                  {' · '}
                  {offer.type === 'discovery'
                    ? 'Erstgespräch'
                    : offer.pricingModel === 'single_session'
                      ? 'Preis pro Einheit'
                      : offer.pricingModel === 'monthly'
                        ? 'Monatliche Pauschale'
                        : offer.pricingModel === 'package' && offer.includedSessions
                          ? `Paket mit ${offer.includedSessions} Einheiten`
                          : 'Abrechnung noch nicht klassifiziert'}
                </p>
              </div>
              <div className="pt-3 border-t border-line flex items-center justify-between">
                <div className="text-xs text-ink-soft flex items-center gap-1 tabular-nums">
                  <Clock size={12} className="text-ink-muted" /> {offer.duration} Min.
                </div>
                <div className="text-sm font-bold text-accent tabular-nums">
                  {offer.price === 0 ? '0,00 €' : `${offer.price} €`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <OfferModal
          initial={draft}
          editing={editingId !== null}
          onClose={() => setModalOpen(false)}
          onSubmit={(value) => onSave(value, editingId)}
        />
      )}
    </SectionCard>
  );
}
