'use client';

import { useSearchParams } from 'next/navigation';

/** Erlaubt nur interne Pfade (kein Open-Redirect, kein Admin-Bereich). */
export function sanitizeNext(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  if (value.startsWith('/admin')) return null;
  return value;
}

/** Muss in einer Komponente innerhalb einer <Suspense>-Grenze verwendet werden. */
export function useNextParam(): string | null {
  const searchParams = useSearchParams();
  return sanitizeNext(searchParams.get('next'));
}

export function withNext(path: string, next: string | null): string {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}
