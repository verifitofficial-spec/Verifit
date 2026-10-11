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
        className="inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-600"
      >
        Zum Dashboard
      </Link>
    );
  }

  return (
    <>
      <Link href="/login" className="text-sm font-medium text-slate-300 transition-colors hover:text-white">
        Login
      </Link>
      <Link
        href="/register"
        className="inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-600"
      >
        Registrieren
      </Link>
    </>
  );
}
