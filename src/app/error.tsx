'use client';

import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen bg-canvas text-ink flex flex-col justify-between">
      <header className="flex justify-between items-center px-6 py-6 max-w-7xl mx-auto w-full">
        <Link href="/" className="text-2xl font-black tracking-wider text-accent">
          VERIFIT<span className="text-ink">.</span>
        </Link>
        <ThemeToggle compact />
      </header>

      <section className="max-w-2xl mx-auto px-6 py-20 w-full flex-1 flex flex-col items-center text-center justify-center space-y-6">
        <span className="bg-danger-soft text-danger border border-danger-line px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
          Unerwarteter Fehler
        </span>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight">Da ist etwas schiefgelaufen.</h1>
        <p className="text-ink-muted max-w-md text-sm md:text-base">
          Die Seite konnte nicht geladen werden. Bitte versuche es erneut. Bleibt das Problem bestehen, melde dich beim Support.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="bg-accent hover:bg-accent-strong text-primary-foreground font-bold px-8 py-4 rounded-2xl text-base transition cursor-pointer"
          >
            Erneut versuchen
          </button>
          <Link
            href="/"
            className="inline-block bg-surface-soft hover:bg-surface-hover border border-line-strong text-ink font-semibold px-8 py-4 rounded-2xl text-base transition"
          >
            Zur Startseite
          </Link>
        </div>
      </section>

      <footer className="border-t border-line py-6 text-center text-xs text-ink-muted max-w-7xl mx-auto w-full">
        &copy; {new Date().getFullYear()} VeriFit. Alle Rechte vorbehalten.
      </footer>
    </main>
  );
}
