import Link from 'next/link';
import BrandMark from '@/components/BrandMark';
import HomeAuthLinks from '@/components/HomeAuthLinks';

export default function PublicHeader() {
  return (
    <header className="border-b border-line/80 bg-canvas/95">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
        <BrandMark className="text-xl sm:text-2xl" />

        <nav className="order-3 flex w-full items-center gap-5 border-t border-line/70 pt-4 text-sm font-medium text-slate-300 sm:order-2 sm:w-auto sm:border-0 sm:pt-0" aria-label="Hauptnavigation">
          <Link href="/trainer/list" className="transition-colors hover:text-white">
            Trainer finden
          </Link>
          <Link href="/quiz" className="transition-colors hover:text-white">
            Matching
          </Link>
          <Link href="/#ablauf" className="hidden transition-colors hover:text-white md:inline">
            So funktioniert’s
          </Link>
        </nav>

        <div className="order-2 flex items-center gap-3 sm:order-3">
          <HomeAuthLinks />
        </div>
      </div>
    </header>
  );
}
