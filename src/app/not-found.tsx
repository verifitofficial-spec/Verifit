import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-canvas text-ink flex flex-col justify-between">
      <header className="flex justify-between items-center px-6 py-6 max-w-7xl mx-auto w-full">
        <Link href="/" className="text-2xl font-black tracking-wider text-accent">
          VERIFIT<span className="text-ink">.</span>
        </Link>
        <ThemeToggle compact />
      </header>

      <section className="max-w-2xl mx-auto px-6 py-20 w-full flex-1 flex flex-col items-center text-center justify-center space-y-6">
        <span className="bg-accent-soft text-accent border border-accent/35 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
          Fehler 404
        </span>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight">
          Diese Seite gibt es nicht.
        </h1>
        <p className="text-ink-muted max-w-md text-sm md:text-base">
          Der gesuchte Inhalt wurde nicht gefunden oder ist nicht mehr verfügbar. Starte stattdessen unser Matching-Quiz und finde deinen passenden Trainer.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/quiz"
            className="inline-block bg-accent hover:bg-accent-strong text-primary-foreground font-bold px-8 py-4 rounded-2xl text-base transition"
          >
            Zum Trainer-Matching &rarr;
          </Link>
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
