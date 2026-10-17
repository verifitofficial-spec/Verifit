import Link from 'next/link';
import BrandMark from '@/components/BrandMark';
import ThemeToggle from '@/components/ThemeToggle';

export default function Footer() {
  return (
    <footer className="border-t border-line bg-canvas text-sm text-ink-muted">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 sm:px-8 md:grid-cols-[1fr_auto] md:items-end lg:px-10">
        <div className="space-y-3">
          <BrandMark className="text-lg" />
          <p className="max-w-md leading-relaxed">
            Vermittlung für manuell geprüfte Personal Trainer und Ernährungsberater.
          </p>
          <p className="text-xs text-ink-muted">
            &copy; {new Date().getFullYear()} VeriFit. Alle Rechte vorbehalten.
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 font-medium" aria-label="Rechtliche Hinweise">
          <ThemeToggle compact />
          <Link href="/impressum" className="inline-flex min-h-11 items-center transition-colors hover:text-accent">
            Impressum
          </Link>
          <Link href="/datenschutz" className="inline-flex min-h-11 items-center transition-colors hover:text-accent">
            Datenschutz
          </Link>
          <Link href="/agb" className="inline-flex min-h-11 items-center transition-colors hover:text-accent">
            AGB
          </Link>
        </nav>
      </div>
    </footer>
  );
}
