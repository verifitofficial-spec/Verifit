'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import AuthShell from '@/components/AuthShell';
import { useNextParam, withNext } from '@/lib/nextParam';

function LoginSelection() {
  const next = useNextParam();

  return (
    <AuthShell eyebrow="Anmelden" title="Dein Bereich. Deine Fortschritte." description="Wähle den passenden Zugang und arbeite dort weiter, wo du aufgehört hast.">
          <div className="space-y-4" aria-label="Zugang auswählen">
            <Link
              href={withNext('/client/login', next)}
              className="block w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-4 rounded-2xl text-sm transition shadow-lg shadow-emerald-500/20"
            >
              Als Kunde anmelden
            </Link>
            <Link
              href="/trainer/login"
              className="block w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-2xl text-sm transition border border-slate-700"
            >
              Als Trainer anmelden
            </Link>
          </div>
    </AuthShell>
  );
}

export default function LoginSelectionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <LoginSelection />
    </Suspense>
  );
}
