'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';

type Notice = { type: 'ok' | 'warn'; text: string };

/**
 * Gleicht den Stripe-Connect-Status des Trainers mit Stripe ab (ohne auf Webhooks angewiesen zu sein).
 * Läuft beim Öffnen des Dashboards und zeigt nach der Rückkehr von Stripe eine Rückmeldung.
 */
export default function StripeReturnSync() {
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    let active = true;

    async function sync() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session || !active) return;

      const fromStripe = new URLSearchParams(window.location.search).get('stripe');

      try {
        const response = await fetch('/api/stripe/sync-account', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          changed?: boolean;
          connected?: boolean;
          charges_enabled?: boolean;
        };
        if (!active) return;

        if (!response.ok) {
          if (fromStripe) setNotice({ type: 'warn', text: data.error || 'Stripe-Status konnte nicht geprüft werden.' });
          return;
        }

        if (data.changed) {
          window.location.replace(window.location.pathname);
          return;
        }

        if (fromStripe === 'return') {
          setNotice(
            data.charges_enabled
              ? { type: 'ok', text: 'Dein Stripe-Konto ist aktiv. Du kannst jetzt bezahlte Buchungen annehmen.' }
              : {
                  type: 'warn',
                  text: 'Das Stripe-Onboarding ist noch nicht abgeschlossen. Bitte klicke auf „Stripe-Onboarding fortsetzen“ und vervollständige alle Angaben.',
                }
          );
        } else if (fromStripe === 'refresh') {
          setNotice({
            type: 'warn',
            text: 'Der Stripe-Link ist abgelaufen. Bitte starte das Onboarding erneut.',
          });
        }
      } catch {
        /* Netzwerkfehler: Status wird beim nächsten Öffnen erneut geprüft. */
      }
    }

    sync();
    return () => {
      active = false;
    };
  }, []);

  if (!notice) return null;

  return (
    <div
      className={`p-3.5 rounded-xl text-xs font-medium border ${
        notice.type === 'ok'
          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
          : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
      }`}
    >
      {notice.text}
    </div>
  );
}
