'use client';

import { useCallback, useEffect, useState } from 'react';
import { Mail, MessageSquareText, RefreshCw } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import InquiryStatusBadge from '@/components/InquiryStatusBadge';
import { getAllowedInquiryTransitions, type InquiryStatus } from '@/lib/inquiryCore';

type InquiryDto = {
  id: string;
  trainerId: string;
  offerId: string | null;
  trainerName: string;
  offerTitle: string | null;
  message: string;
  status: InquiryStatus;
  createdAt: string;
  updatedAt: string;
  statusChangedAt: string;
  client?: { name: string; email: string };
  history: Array<{
    fromStatus: InquiryStatus | null;
    toStatus: InquiryStatus;
    actorRole: 'client' | 'trainer' | 'admin';
    changedAt: string;
  }>;
};

type InquiryListResponse = {
  inquiries?: InquiryDto[];
  error?: string;
};

const ACTION_LABELS: Partial<Record<InquiryStatus, string>> = {
  viewed: 'Als gesehen markieren',
  contacted: 'Kontakt aufgenommen',
  declined: 'Ablehnen',
  closed: 'Abschließen',
};

const STATUS_LABELS: Record<InquiryStatus, string> = {
  new: 'Neu',
  viewed: 'Gesehen',
  contacted: 'Kontakt aufgenommen',
  declined: 'Abgelehnt',
  closed: 'Abgeschlossen',
};

export default function InquiryList({ audience }: { audience: 'client' | 'trainer' }) {
  const [inquiries, setInquiries] = useState<InquiryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setError('Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/inquiries', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = (await response.json().catch(() => ({}))) as InquiryListResponse;
      if (!response.ok) {
        setError(data.error || 'Anfragen konnten nicht geladen werden.');
        return;
      }
      setInquiries(data.inquiries ?? []);
    } catch {
      setError('Netzwerkfehler beim Laden der Anfragen.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function updateStatus(inquiryId: string, status: InquiryStatus) {
    setBusyId(inquiryId);
    setError(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setError('Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.');
      setBusyId(null);
      return;
    }

    try {
      const response = await fetch('/api/inquiries', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ inquiryId, status }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error || 'Status konnte nicht geändert werden.');
        return;
      }
      await load();
    } catch {
      setError('Netzwerkfehler beim Aktualisieren der Anfrage.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section id="anfragen" className="scroll-mt-6 space-y-5 border-t border-line py-7">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <MessageSquareText className="text-accent" size={20} aria-hidden />
          <div>
            <h2 className="text-xl font-bold text-ink">
              {audience === 'trainer' ? 'Eingehende Anfragen' : 'Deine unverbindlichen Anfragen'}
            </h2>
            <p className="mt-0.5 text-sm text-ink-muted">
              {audience === 'trainer'
                ? 'Nur an dich gerichtete Anfragen werden hier angezeigt.'
                : 'Hier siehst du den aktuellen Bearbeitungsstand.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface-soft px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-surface-hover disabled:opacity-60"
        >
          <RefreshCw size={14} aria-hidden /> Aktualisieren
        </button>
      </div>

      {error && <div role="alert" className="border border-danger-line bg-danger-soft p-4 text-sm text-danger">{error}</div>}

      {loading ? (
        <p className="text-sm text-ink-muted">Anfragen werden geladen...</p>
      ) : inquiries.length === 0 ? (
        <p className="border-y border-line py-6 text-sm text-ink-muted">Noch keine unverbindlichen Anfragen vorhanden.</p>
      ) : (
        <div className="space-y-4">
          {inquiries.map((inquiry) => {
            const actions = audience === 'trainer' ? getAllowedInquiryTransitions(inquiry.status) : [];
            return (
              <article key={inquiry.id} className="rounded-2xl border border-line bg-canvas p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <InquiryStatusBadge status={inquiry.status} />
                      <span className="text-xs text-ink-muted">
                        {new Date(inquiry.createdAt).toLocaleString('de-DE')}
                      </span>
                    </div>
                    <h3 className="mt-3 font-semibold text-ink">
                      {audience === 'trainer' ? inquiry.client?.name || 'Kunde' : inquiry.trainerName}
                    </h3>
                    <p className="mt-1 text-xs text-ink-muted">
                      {inquiry.offerTitle ? `Angebot: ${inquiry.offerTitle}` : 'Allgemeine Anfrage'}
                    </p>
                  </div>
                  {audience === 'trainer' && inquiry.client?.email && (
                    <a
                      href={`mailto:${inquiry.client.email}`}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 py-2 text-xs font-semibold text-ink-soft hover:text-ink"
                    >
                      <Mail size={14} aria-hidden /> E-Mail schreiben
                    </a>
                  )}
                </div>

                <p className="mt-4 whitespace-pre-line rounded-xl border border-line bg-surface p-4 text-sm leading-6 text-ink-soft">
                  {inquiry.message}
                </p>

                {audience === 'trainer' && actions.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {actions.map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={busyId === inquiry.id}
                        onClick={() => void updateStatus(inquiry.id, status)}
                        className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-60 ${
                          status === 'declined'
                            ? 'border-danger-line bg-danger-soft text-danger'
                            : status === 'viewed' || status === 'contacted'
                              ? 'border-accent/40 bg-accent-soft text-accent'
                              : 'border-line-strong bg-surface-soft text-ink-soft'
                        }`}
                      >
                        {ACTION_LABELS[status]}
                      </button>
                    ))}
                  </div>
                )}

                {inquiry.history.length > 1 && (
                  <details className="mt-4 border-t border-line pt-3 text-xs text-ink-muted">
                    <summary className="cursor-pointer font-medium hover:text-ink">Statusverlauf</summary>
                    <ol className="mt-2 space-y-1">
                      {inquiry.history.map((event, index) => (
                        <li key={`${event.changedAt}-${index}`}>
                          {new Date(event.changedAt).toLocaleString('de-DE')}: {STATUS_LABELS[event.toStatus]}
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
