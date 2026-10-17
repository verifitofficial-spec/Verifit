import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

export default function AgbPage() {
  return (
    <main className="min-h-screen bg-canvas text-ink flex flex-col justify-between">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-6 max-w-4xl mx-auto w-full border-b border-line">
        <Link href="/" className="text-2xl font-black tracking-wider text-accent">
          VERIFIT<span className="text-ink">.</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <Link href="/" className="text-xs text-ink-muted hover:text-ink transition">Zur Startseite</Link>
        </div>
      </header>

      {/* Content */}
      <section className="max-w-4xl mx-auto px-6 py-12 w-full flex-1 space-y-8">
        <div className="bg-surface border border-line rounded-3xl p-8 shadow-2xl space-y-6">
          <h1 className="text-3xl font-extrabold text-ink">Allgemeine Geschäftsbedingungen & Haftungsausschluss</h1>
          
          <div className="space-y-4 text-ink-soft text-sm leading-relaxed">
            <div>
              <h2 className="text-ink font-bold text-base mb-1">1. Geltungsbereich</h2>
              <p>
                Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für die Nutzung der Vermittlungsplattform VeriFit für digitale Trainingsvermittlung, Buchungen und das Trainer-Matching zwischen Kunden und selbstständigen Trainern.
              </p>
            </div>

            <div>
              <h2 className="text-ink font-bold text-base mb-1">2. Plattformstatus als reiner Vermittler</h2>
              <p>
                VeriFit agiert ausschließlich als technischer Vermittler zwischen Kunden (Fitness-Interessierten) und unabhängigen Personal Trainern. Der Vertrag über die eigentliche Trainingseinheit oder das Coaching kommt direkt zwischen dem Kunden und dem jeweiligen Trainer zustande. VeriFit ist nicht Vertragspartner der gebuchten Trainingseinheiten.
              </p>
            </div>

            <div>
              <h2 className="text-ink font-bold text-base mb-1">3. Haftungsausschluss für Trainingsleistungen</h2>
              <p>
                Da VeriFit als Plattform lediglich vermittelt, wird jegliche Haftung für die Durchführung, Qualität, Schlechtleistung oder etwaige Verletzungen im Rahmen der Trainingseinheiten durch die Trainer ausdrücklich ausgeschlossen. Die Trainer sind eigenverantwortlich für ihre Qualifikationen, Lizenzen und eine gültige Berufshaftpflichtversicherung.
              </p>
            </div>

            <div>
              <h2 className="text-ink font-bold text-base mb-1">4. Zahlungsabwicklung & Stornierung</h2>
              <p>
                Zahlungen werden über den Zahlungsdienstleister Stripe abgewickelt. Es gelten die zum Zeitpunkt der Buchung angegebenen Konditionen und Stornierungsfristen der Trainer bzw. der Plattform.
              </p>
            </div>

            <div>
              <h2 className="text-ink font-bold text-base mb-1">5. Schlussbestimmungen</h2>
              <p>
                Sollten einzelne Bestimmungen dieser AGB unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. Es gilt das Recht der Bundesrepublik Deutschland.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line py-6 text-center text-xs text-ink-muted max-w-4xl mx-auto w-full">
        &copy; {new Date().getFullYear()} VeriFit. Alle Rechte vorbehalten.
      </footer>
    </main>
  );
}
