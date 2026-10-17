import Link from 'next/link';
import { ArrowRight, BadgeCheck, CalendarCheck, ListChecks } from 'lucide-react';
import Footer from '@/components/Footer';
import PublicHeader from '@/components/PublicHeader';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-canvas text-ink">
      <PublicHeader />

      <section className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-10 lg:py-24">
        <div className="max-w-4xl">
          <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            Training beginnt mit der richtigen Entscheidung.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-ink-soft sm:text-lg">
            Finde manuell geprüfte Personal Trainer und Ernährungsberater, passend zu deinem Ziel,
            deinem Trainingsalltag und deinem Budget.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/quiz"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-accent-strong"
            >
              Matching starten <ArrowRight size={17} aria-hidden />
            </Link>
            <Link
              href="/trainer/list"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-line-strong bg-surface px-6 py-3 text-sm font-semibold text-ink transition-colors hover:border-slate-500 hover:bg-surface-soft"
            >
              Trainer direkt ansehen
            </Link>
          </div>
        </div>

        <aside className="border-l border-line-strong pl-6 sm:pl-8" aria-label="VeriFit Auswahlprozess">
          <dl className="divide-y divide-line border-y border-line">
            <div className="grid grid-cols-[1.8rem_1fr] gap-4 py-5">
              <BadgeCheck className="mt-0.5 text-accent" size={20} aria-hidden />
              <div>
                <dt className="font-semibold text-ink">Manuelle Verifizierung</dt>
                <dd className="mt-1 text-sm leading-6 text-ink-muted">Trainerlizenz und Berufshaftpflicht werden geprüft.</dd>
              </div>
            </div>
            <div className="grid grid-cols-[1.8rem_1fr] gap-4 py-5">
              <ListChecks className="mt-0.5 text-accent" size={20} aria-hidden />
              <div>
                <dt className="font-semibold text-ink">Passendes Matching</dt>
                <dd className="mt-1 text-sm leading-6 text-ink-muted">Ziel, Erfahrung, Trainingsform und Budget geben die Richtung vor.</dd>
              </div>
            </div>
            <div className="grid grid-cols-[1.8rem_1fr] gap-4 py-5">
              <CalendarCheck className="mt-0.5 text-accent" size={20} aria-hidden />
              <div>
                <dt className="font-semibold text-ink">Unverbindliche Kontaktanfrage</dt>
                <dd className="mt-1 text-sm leading-6 text-ink-muted">Profil und Angebot auswählen, dann geschützt Kontakt aufnehmen.</dd>
              </div>
            </div>
          </dl>
        </aside>
      </section>

      <section id="ablauf" className="border-y border-line bg-surface/45 scroll-mt-8">
        <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 sm:py-16 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Vom Ziel zum passenden Kontakt.</h2>
            </div>
            <ol className="divide-y divide-line border-y border-line">
              {[
                ['01', 'Orientierung schaffen', 'Beantworte fünf kurze Fragen zu Erfahrung, Ziel, Trainingsform, Umfang und Budget.'],
                ['02', 'Trainer vergleichen', 'Prüfe Fachgebiete, Profile, Angebote und Preise freigegebener Trainer.'],
                ['03', 'Anfrage senden', 'Wähle optional ein Angebot und sende eine unverbindliche Kontaktanfrage.'],
              ].map(([number, title, copy]) => (
                <li key={number} className="grid gap-3 py-6 sm:grid-cols-[3rem_12rem_1fr] sm:items-baseline sm:gap-6">
                  <span className="font-mono text-sm text-accent">{number}</span>
                  <h3 className="font-semibold text-ink">{title}</h3>
                  <p className="text-sm leading-6 text-ink-muted">{copy}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 sm:py-20 lg:px-10">
        <div className="grid overflow-hidden rounded-2xl border border-line bg-surface lg:grid-cols-2">
          <div className="p-7 sm:p-10 lg:p-12">
            <h2 className="text-3xl font-semibold tracking-tight">Weniger suchen. Besser entscheiden.</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-ink-soft">
              Finde Trainer nach den Kriterien, die für dein Training zählen, und behalte den
              Bearbeitungsstand deiner Kontaktanfragen im Kundenbereich im Blick.
            </p>
          </div>
          <div className="border-t border-line bg-canvas/45 p-7 sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
            <h2 className="text-3xl font-semibold tracking-tight">Kompetenz sichtbar machen.</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-ink-soft">
              Reiche deine Nachweise ein, pflege dein Profil und deine Angebote und bearbeite
              eingehende Kontaktanfragen übersichtlich an einem Ort.
            </p>
            <Link href="/trainer/register" className="mt-8 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-ink hover:text-accent">
              Als Trainer registrieren <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
