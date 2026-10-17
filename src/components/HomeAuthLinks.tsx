'use client';

import Link from 'next/link';
import { useAuthProfile } from '@/lib/useAuthProfile';

export default function HomeAuthLinks() {
  const { loading, homeHref } = useAuthProfile();

  if (loading) return <div className="h-10 w-28" aria-hidden />;

  if (homeHref) {
    return (
      <Link
        href={homeHref}
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-accent-strong"
      >
        Zum Dashboard
      </Link>
    );
  }

  return (
    <>
      <Link href="/login" className="inline-flex min-h-11 items-center text-sm font-medium text-ink-soft transition-colors hover:text-ink">
        Login
      </Link>
      <Link
        href="/register"
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-accent-strong"
      >
        Registrieren
      </Link>
    </>
  );
}
