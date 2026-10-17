import Link from 'next/link';
import { CircleAlert } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import Footer from '@/components/Footer';

interface LeadMvpLegacyNoticeProps {
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
}

export default function LeadMvpLegacyNotice({
  title,
  description,
  backHref,
  backLabel,
}: LeadMvpLegacyNoticeProps) {
  return (
    <main className="min-h-screen bg-canvas text-ink flex flex-col justify-between">
      <header className="flex items-center px-6 py-6 max-w-7xl mx-auto w-full">
        <BrandMark />
      </header>

      <section className="max-w-3xl mx-auto px-6 py-20 w-full flex-1 flex flex-col items-start justify-center gap-6">
        <div className="flex items-center gap-3 text-warning">
          <CircleAlert className="h-8 w-8" aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-[0.22em]">Nicht Teil des Pilotbetriebs</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight">{title}</h1>
        <p className="max-w-xl text-ink-muted text-sm md:text-base leading-7">{description}</p>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href={backHref}
            className="inline-block bg-accent hover:bg-accent-strong text-primary-foreground font-bold px-8 py-4 rounded-2xl text-base transition"
          >
            {backLabel}
          </Link>
          <Link
            href="/"
            className="inline-block bg-surface-soft hover:bg-surface-hover border border-line-strong text-ink font-semibold px-8 py-4 rounded-2xl text-base transition"
          >
            Zur Startseite
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
