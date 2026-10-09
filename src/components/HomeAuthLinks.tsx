'use client';

import Link from 'next/link';
import { useAuthProfile } from '@/lib/useAuthProfile';

export default function HomeAuthLinks() {
  const { loading, homeHref } = useAuthProfile();

  if (loading) return <div className="h-9" aria-hidden />;

  if (homeHref) {
    return (
      <Link
        href={homeHref}
        className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-4 py-2 rounded-xl text-sm transition"
      >
        Zum Dashboard
      </Link>
    );
  }

  return (
    <>
      <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition">
        Login
      </Link>
      <Link
        href="/register"
        className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-4 py-2 rounded-xl text-sm transition"
      >
        Registrieren
      </Link>
    </>
  );
}
