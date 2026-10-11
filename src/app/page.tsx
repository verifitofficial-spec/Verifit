import Link from 'next/link';
import { ArrowRight, BadgeCheck, CalendarCheck, ListChecks, ShieldCheck } from 'lucide-react';
import Footer from '@/components/Footer';
import PublicHeader from '@/components/PublicHeader';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-canvas text-ink">
      <PublicHeader />

      <section className="mx-auto grid w-full max-w-7xl gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:px-10 lg:py-32">
        <div className="max-w-4xl">
          <p className="mb-6 text-sm font-semibold text-emerald-400">Manuell geprüft. Passend vermittelt.</p>
          <h1 className="max-w-4xl text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-8xl">
            Training beginnt mit der richtigen Entscheidung.
          </h1>
          <p className="mt-8 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
            VeriFit bringt dich mit Personal Trainern und Ernährungsberatern zusammen, deren
            Trainerlizenz und Berufshaftpflicht wir manuell prüfen. Du vergleichst Fachgebiete,
            Angebote und freie Termine an einem Ort.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/quiz"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-600"
            >
              Matching starten <ArrowRight size={17} aria-hidden />
            </Link>
            <Link
              href="/trainer/list"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-slate-500 hover:bg-slate-800"
            >
              Trainer direkt ansehen
            </Link>
          </div>
        </div>

        <aside className="border-l border-slate-700 pl-6 sm:pl-8" aria-label="VeriFit Auswahlprozess">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Was VeriFit verbindet</p>
          <dl className="mt-6 divide-y divide-slate-800 border-y border-slate-800">
            <div className="grid grid-cols-[1.8rem_1fr] gap-4 py-5">
              <BadgeCheck className="mt-0.5 text-emerald-400" size={20} aria-hidden />
              <div>
                <dt className="font-semibold text-white">Manuelle Verifizierung</dt>
                <dd className="mt-1 text-sm leading-6 text-slate-400">Trainerlizenz und Berufshaftpflicht werden geprüft.</dd>
              </div>
            </div>
            <div className="grid grid-cols-[1.8rem_1fr] gap-4 py-5">
              <ListChecks className="mt-0.5 text-emerald-400" size={20} aria-hidden />
              <div>
                <dt className="font-semibold text-white">Passendes Matching</dt>
                <dd className="mt-1 text-sm leading-6 text-slate-400">Ziel, Erfahrung, Trainingsform und Budget geben die Richtung vor.</dd>
              </div>
            </div>
            <div className="grid grid-cols-[1.8rem_1fr] gap-4 py-5">
              <CalendarCheck className="mt-0.5 text-emerald-400" size={20} aria-hidden />
              <div>
                <dt className="font-semibold text-white">Konkrete Buchungsanfrage</dt>
                <dd className="mt-1 text-sm leading-6 text-slate-400">Angebot und freien Termin auswählen, dann direkt anfragen.</dd>
              </div>
            </div>
          </dl>
        </aside>
      </section>

      <section id="ablauf" className="border-y border-line bg-surface/45 scroll-mt-8">
        <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="text-sm font-semibold text-emerald-400">Der direkte Weg</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Vom Ziel zum ersten Termin.</h2>
            </div>
            <ol className="divide-y divide-slate-800 border-y border-slate-800">
              {[
                ['01', 'Orientierung schaffen', 'Beantworte vier kurze Fragen zu Erfahrung, Ziel, Trainingsform und Budget.'],
                ['02', 'Trainer vergleichen', 'Prüfe Fachgebiete, Profil, Angebote und tatsächlich hinterlegte freie Termine.'],
                ['03', 'Anfrage senden', 'Wähle ein Angebot und einen Termin. Der Trainer bestätigt oder lehnt deine Anfrage ab.'],
              ].map(([number, title, copy]) => (
                <li key={number} className="grid gap-3 py-6 sm:grid-cols-[3rem_12rem_1fr] sm:items-baseline sm:gap-6">
                  <span className="font-mono text-sm text-emerald-400">{number}</span>
                  <h3 className="font-semibold text-white">{title}</h3>
                  <p className="text-sm leading-6 text-slate-400">{copy}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
        <div className="grid overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 lg:grid-cols-2">
          <div className="p-7 sm:p-10 lg:p-12">
            <p className="text-sm font-semibold text-emerald-400">Für Kunden</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Weniger suchen. Besser entscheiden.</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300">
              Finde Trainer nach den Kriterien, die für dein Training zählen. Buchungen, Pläne,
              Tracking und Chat bleiben anschließend in deinem Kundenbereich zusammen.
            </p>
            <Link href="/quiz" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-emerald-400 hover:text-emerald-300">
              Matching beginnen <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
          <div className="border-t border-slate-800 bg-slate-950/45 p-7 sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
            <p className="text-sm font-semibold text-slate-300">Für Trainer</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Kompetenz sichtbar machen.</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300">
              Reiche deine Nachweise ein, veröffentliche Angebote und freie Termine und betreue
              bestätigte Kunden mit den vorhandenen Planungswerkzeugen.
            </p>
            <Link href="/trainer/register" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-white hover:text-emerald-300">
              Als Trainer registrieren <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:px-10">
          <ShieldCheck className="text-emerald-400" size={34} strokeWidth={1.7} aria-hidden />
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Bereit für eine fundierte Auswahl?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Das Quiz führt dich in wenigen Schritten zu passenden, freigeschalteten Trainerprofilen.</p>
          </div>
          <Link
            href="/quiz"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-600"
          >
            Matching starten <ArrowRight size={17} aria-hidden />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
