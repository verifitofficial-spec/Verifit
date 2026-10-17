import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import Footer from '@/components/Footer';
import ThemeToggle from '@/components/ThemeToggle';

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
  notes?: string[];
};

export default function AuthShell({
  eyebrow,
  title,
  description,
  children,
  backHref = '/',
  backLabel = 'Zurück zur Startseite',
  notes = ['Manuell geprüfte Profile', 'Datenschutz mit klarer Einwilligung', 'Direkter Zugang zu deinem Bereich'],
}: AuthShellProps) {
  return (
    <main className="flex min-h-screen flex-col bg-canvas text-ink">
      <header className="border-b border-line/80">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-5 lg:px-8">
          <BrandMark />
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            <Link href={backHref} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink-soft transition hover:text-ink">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{backLabel}</span>
              <span className="sm:hidden">Zurück</span>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl flex-1 gap-12 px-6 py-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start lg:px-8 lg:py-20">
        <div className="lg:sticky lg:top-10">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">{eyebrow}</p>
          <h1 className="mt-5 max-w-xl text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">{title}</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-ink-muted">{description}</p>
          <ul className="mt-10 space-y-4 border-t border-line pt-8">
            {notes.map((note) => (
              <li key={note} className="flex items-center gap-3 text-sm text-ink-soft">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                {note}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-line pt-8 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
          <div className="w-full max-w-xl">{children}</div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
