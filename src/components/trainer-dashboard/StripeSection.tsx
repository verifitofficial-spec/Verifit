'use client';

import { useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import type { TrainerProfile } from '@/lib/trainer-dashboard/types';
import { SectionCard, primaryButtonClass } from './ui';

export default function StripeSection({ trainer }: { trainer: TrainerProfile }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleConnect() {
    setLoading(true);
    setMessage('');

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setMessage('Sitzung abgelaufen. Bitte erneut anmelden.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/stripe/connect-link', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = (await response.json().catch(() => ({}))) as { url?: string; error?: string };

      if (!response.ok || !result.url) {
        setMessage(result.error || 'Stripe-Onboarding konnte nicht gestartet werden.');
        setLoading(false);
        return;
      }
      window.location.assign(result.url);
    } catch {
      setMessage('Netzwerkfehler beim Starten des Stripe-Onboardings.');
      setLoading(false);
    }
  }

  return (
    <SectionCard>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Stripe-Auszahlungen</h2>
          <p className="text-slate-400 text-xs">
            Verbinde dein Stripe-Testkonto, damit bezahlte Buchungen später ausgezahlt werden können.
          </p>
        </div>
        <span className={`text-xs font-bold ${trainer.charges_enabled ? 'text-emerald-400' : 'text-amber-400'}`}>
          {trainer.charges_enabled ? 'Aktiv' : 'Noch nicht eingerichtet'}
        </span>
      </div>

      {message && (
        <div className="p-3 rounded-xl text-xs bg-red-500/10 border border-red-500/20 text-red-400">{message}</div>
      )}

      <button
        type="button"
        onClick={handleConnect}
        disabled={loading}
        className={`px-4 py-2.5 text-xs ${primaryButtonClass}`}
      >
        {loading ? 'Öffne Stripe...' : trainer.stripe_account_id ? 'Stripe-Onboarding fortsetzen' : 'Stripe-Testkonto verbinden'}
      </button>
    </SectionCard>
  );
}
