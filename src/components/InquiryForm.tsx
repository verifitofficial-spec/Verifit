'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Send } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { withNext } from '@/lib/nextParam';
import type { AuthRole } from '@/lib/useAuthProfile';

type InquiryOfferOption = {
  id: string;
  title: string;
};

type InquiryResponse = {
  success?: boolean;
  error?: string;
  inquiryId?: string;
  deduplicated?: boolean;
  mailSent?: boolean | null;
};

type PendingInquiry = {
  idempotencyKey: string;
  message: string;
  offerId: string | null;
};

function draftKey(trainerId: string) {
  return `verifit:pendingInquiry:${trainerId}`;
}

function readDraft(trainerId: string, offers: InquiryOfferOption[]): PendingInquiry | null {
  try {
    const raw = sessionStorage.getItem(draftKey(trainerId));
    if (!raw) return null;
    const pending = JSON.parse(raw) as Partial<PendingInquiry>;
    if (typeof pending.message !== 'string' || typeof pending.idempotencyKey !== 'string') return null;
    const offerId = pending.offerId === null || offers.some((offer) => offer.id === pending.offerId)
      ? pending.offerId ?? null
      : null;
    return { idempotencyKey: pending.idempotencyKey, message: pending.message, offerId };
  } catch {
    return null;
  }
}

export default function InquiryForm({
  trainerId,
  trainerName,
  offers,
  authLoading,
  userId,
  role,
  dashboardHref,
  returnPath,
}: {
  trainerId: string;
  trainerName: string;
  offers: InquiryOfferOption[];
  authLoading: boolean;
  userId: string | null;
  role: AuthRole | null;
  dashboardHref: string | null;
  returnPath: string;
}) {
  const [offerId, setOfferId] = useState<string | null>(null);
  const [inquiryMessage, setInquiryMessage] = useState('');
  const idempotencyKeyRef = useRef<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const draft = readDraft(trainerId, offers);
      if (!draft) return;
      setOfferId(draft.offerId);
      setInquiryMessage(draft.message);
      idempotencyKeyRef.current = draft.idempotencyKey;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [offers, trainerId]);

  function persistDraft() {
    const key = idempotencyKeyRef.current ?? crypto.randomUUID();
    idempotencyKeyRef.current = key;
    try {
      sessionStorage.setItem(
        draftKey(trainerId),
        JSON.stringify({ idempotencyKey: key, message: inquiryMessage, offerId } satisfies PendingInquiry)
      );
    } catch {
      // Ohne sessionStorage gilt die Idempotenz weiterhin innerhalb dieses Komponenten-Lebenszyklus.
    }
    return key;
  }

  async function submitInquiry() {
    const trimmedMessage = inquiryMessage.trim();
    if (trimmedMessage.length < 10) {
      setFeedback({ type: 'error', text: 'Bitte beschreibe dein Anliegen in mindestens 10 Zeichen.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    const requestKey = persistDraft();

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setFeedback({ type: 'error', text: 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.' });
        return;
      }

      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          trainerId,
          offerId,
          message: trimmedMessage,
          idempotencyKey: requestKey,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as InquiryResponse;
      if (!response.ok) {
        setFeedback({ type: 'error', text: data.error || 'Deine Anfrage konnte nicht gesendet werden.' });
        return;
      }

      try {
        sessionStorage.removeItem(draftKey(trainerId));
      } catch {
        // Kein weiterer Schritt nötig.
      }
      setInquiryMessage('');
      idempotencyKeyRef.current = null;
      setFeedback({
        type: 'success',
        text: data.deduplicated
          ? 'Deine Anfrage war bereits gespeichert und wurde nicht doppelt angelegt.'
          : data.mailSent === false
            ? 'Deine Anfrage wurde gespeichert. Die E-Mail-Benachrichtigung konnte nicht zugestellt werden.'
            : 'Deine unverbindliche Anfrage wurde gesendet.',
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'Netzwerkfehler. Du kannst denselben Request sicher erneut senden, ohne eine doppelte Anfrage anzulegen.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="anfrage" className="scroll-mt-6 border-t border-line pt-12">
      <p className="text-sm font-semibold text-accent">Unverbindliche Anfrage</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        {trainerName} kennenlernen.
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-ink-muted">
        Sende eine kurze Nachricht. Dabei wird kein Termin reserviert, keine Buchung erstellt und keine Zahlung ausgelöst.
      </p>

      <div className="mt-8 max-w-2xl space-y-5 border-y border-line py-7">
        {offers.length > 0 && (
          <div>
            <label htmlFor="inquiry-offer" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Angebot (optional)
            </label>
            <select
              id="inquiry-offer"
              value={offerId ?? ''}
              onChange={(event) => setOfferId(event.target.value || null)}
              className="w-full rounded-xl border border-line-strong bg-surface px-4 py-3 text-sm text-ink focus:border-accent focus:outline-none"
            >
              <option value="">Allgemeine Anfrage</option>
              {offers.map((offer) => (
                <option key={offer.id} value={offer.id}>{offer.title}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="inquiry-message" className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Deine Nachricht
            </label>
            <span className="text-xs tabular-nums text-ink-muted">{inquiryMessage.length}/1000</span>
          </div>
          <textarea
            id="inquiry-message"
            value={inquiryMessage}
            onChange={(event) => {
              setInquiryMessage(event.target.value);
              setFeedback(null);
            }}
            maxLength={1000}
            rows={6}
            placeholder="Was möchtest du erreichen und wie kann dich der Trainer unterstützen?"
            className="w-full resize-y rounded-xl border border-line-strong bg-surface px-4 py-3 text-sm leading-6 text-ink focus:border-accent focus:outline-none"
          />
        </div>

        {feedback && (
          <div
            role={feedback.type === 'error' ? 'alert' : 'status'}
            className={`border p-4 text-sm ${
              feedback.type === 'error'
                ? 'border-danger-line bg-danger-soft text-danger'
                : 'border-accent/40 bg-accent-soft text-accent'
            }`}
          >
            <p>{feedback.text}</p>
            {feedback.type === 'success' && dashboardHref && (
              <Link href={dashboardHref} className="mt-2 inline-block font-semibold underline">
                Eigene Anfragen ansehen
              </Link>
            )}
          </div>
        )}

        {authLoading ? (
          <p className="text-sm text-ink-muted">Prüfe Anmeldung...</p>
        ) : !userId ? (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-ink-soft">
              Zum Senden brauchst du ein Kunden-Konto. Dein Entwurf bleibt für die Rückkehr in diesem Browser gespeichert.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={withNext('/client/login', returnPath)}
                onClick={persistDraft}
                className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-accent-strong"
              >
                Anmelden
              </Link>
              <Link
                href={withNext('/client/register', returnPath)}
                onClick={persistDraft}
                className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-line-strong bg-surface-soft px-4 py-2.5 text-sm font-bold text-ink hover:bg-surface-hover"
              >
                Registrieren
              </Link>
            </div>
          </div>
        ) : role !== 'client' ? (
          <p className="border border-warning-line bg-warning-soft p-4 text-sm leading-6 text-warning">
            Anfragen können nur mit einem Kunden-Konto gesendet werden.
          </p>
        ) : (
          <button
            type="button"
            disabled={submitting || inquiryMessage.trim().length < 10}
            onClick={() => void submitInquiry()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send size={16} aria-hidden />
            {submitting ? 'Sende Anfrage...' : 'Unverbindlich anfragen'}
          </button>
        )}
      </div>
    </section>
  );
}
