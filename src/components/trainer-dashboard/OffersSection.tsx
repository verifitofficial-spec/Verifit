'use client';

import { useState } from 'react';
import { Briefcase, Clock, Edit3, Plus, Trash2 } from 'lucide-react';
import type { Feedback, OfferDraft, OfferTemplate } from '@/lib/trainer-dashboard/types';
import OfferModal from './OfferModal';
import { FeedbackBox, SectionCard, SectionHeader } from './ui';

interface Props {
  offers: OfferTemplate[];
  onSave: (draft: OfferDraft, editingId: string | null) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
}

const EMPTY_DRAFT: OfferDraft = { title: '', type: 'paid', duration: 60, price: 90, description: '' };

export default function OffersSection({ offers, onSave, onDelete }: Props) {
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
    });
    setModalOpen(true);
  }

  async function handleDelete(offer: OfferTemplate) {
    if (!window.confirm(`Angebot „${offer.title}“ wirklich löschen? Bestehende Buchungen bleiben erhalten.`)) return;
    const error = await onDelete(offer.id);
    setFeedback(error ? { type: 'error', text: error } : null);
  }

  return (
    <SectionCard>
      <SectionHeader
        icon={Briefcase}
        title="Angebots-Ersteller"
        description="Erstellung und Verwaltung von Trainer-Paketen und Coaching-Angeboten."
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition cursor-pointer shadow-sm"
          >
            <Plus size={14} /> Angebot erstellen
          </button>
        }
      />

      <FeedbackBox feedback={feedback} />

      {offers.length === 0 ? (
        <p className="text-xs text-slate-500">
          Noch keine Angebote. Ohne aktives Angebot können Kunden keine Termine bei dir anfragen.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      offer.type === 'discovery'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}
                  >
                    {offer.type === 'discovery' ? 'Kostenlos (0€)' : 'Bezahlt'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(offer)}
                      className="text-slate-400 hover:text-white p-1 cursor-pointer"
                      title="Bearbeiten"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(offer)}
                      className="text-slate-400 hover:text-red-400 p-1 cursor-pointer"
                      title="Löschen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <h3 className="text-sm font-bold text-white mb-1">{offer.title}</h3>
                <p className="text-slate-400 text-xs mb-4">{offer.description}</p>
              </div>
              <div className="pt-3 border-t border-slate-900 flex items-center justify-between">
                <div className="text-xs text-slate-300 flex items-center gap-1">
                  <Clock size={12} className="text-slate-400" /> {offer.duration} Min.
                </div>
                <div className="text-sm font-bold text-emerald-400">
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
