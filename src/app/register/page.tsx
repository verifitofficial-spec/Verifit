'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useNextParam, withNext } from '@/lib/nextParam';
import AuthShell from '@/components/AuthShell';

function RegisterSelection() {
  const next = useNextParam();

  return (
    <AuthShell eyebrow="Registrierung" title="Dein nächster Schritt." description="Starte als Kunde mit deinem passenden Match oder bewirb dich als geprüfter Trainer.">
          <div className="space-y-4" aria-label="Kontotyp auswählen">
            <Link
              href={withNext('/client/register', next)}
              className="block w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-4 rounded-2xl text-sm transition shadow-lg shadow-emerald-500/20"
            >
              Als Kunde registrieren
            </Link>
            <Link
              href="/trainer/register"
              className="block w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-2xl text-sm transition border border-slate-700"
            >
              Als Trainer registrieren
            </Link>
          </div>
    </AuthShell>
  );
}

export default function RegisterSelectionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <RegisterSelection />
    </Suspense>
  );
}
