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
              className="block w-full bg-accent hover:bg-accent-strong text-primary-foreground font-bold py-4 rounded-2xl text-sm transition"
            >
              Als Kunde registrieren
            </Link>
            <Link
              href="/trainer/register"
              className="block w-full bg-surface-soft hover:bg-surface-hover text-ink font-bold py-4 rounded-2xl text-sm transition border border-line-strong"
            >
              Als Trainer registrieren
            </Link>
          </div>
    </AuthShell>
  );
}

export default function RegisterSelectionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <RegisterSelection />
    </Suspense>
  );
}
