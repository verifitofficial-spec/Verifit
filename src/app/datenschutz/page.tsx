import Link from 'next/link';

export default function DatenschutzPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-6 max-w-7xl mx-auto w-full">
        <Link href="/" className="text-2xl font-black tracking-wider text-emerald-400">
          VERIFIT<span className="text-white">.</span>
        </Link>
        <Link href="/" className="text-sm font-medium text-slate-300 hover:text-white transition">
          &larr; Zurück zur Startseite
        </Link>
      </header>

      {/* Content */}
      <section className="max-w-4xl mx-auto px-6 py-12 w-full flex-1 space-y-8">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <h1 className="text-3xl font-extrabold text-white">Datenschutzerklärung</h1>
          
          <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
            <div>
              <h2 className="text-white font-bold text-base mb-1">1. Datenschutz auf einen Blick</h2>
              <h3 className="text-slate-200 font-semibold text-xs mt-2 uppercase tracking-wider">Allgemeine Hinweise</h3>
              <p>
                Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
              </p>
            </div>

            <div>
              <h2 className="text-white font-bold text-base mb-1">2. Hosting & Datenerfassung</h2>
              <p>
                Diese Website wird extern gehostet (z.B. Vercel). Die personenbezogenen Daten, die auf dieser Website erfasst werden, werden auf den Servern des Hosters gespeichert. Hierbei kann es sich v.a. um IP-Adressen, Kontaktanfragen, Meta- und Kommunikationsdaten handeln.
              </p>
              <p className="mt-2">
                <strong>Datenbank & Auth (Supabase):</strong> Wir nutzen Supabase für die sichere Benutzerverwaltung und Datenspeicherung (Hosting-Standort Frankfurt / EU).
              </p>
            </div>

            <div>
              <h2 className="text-white font-bold text-base mb-1">3. Verarbeitung besonderer Kategorien von Daten (Gesundheitsdaten)</h2>
              <p>
                Im Rahmen unseres Angebots erheben und verarbeiten wir von Ihnen ggf. freiwillig gemachte Angaben zu Ihren Fitnesszielen, Körperwerten, Gewichten oder allgemeinen gesundheitlichen Voraussetzungen (Art. 9 DSGVO). Dies erfolgt ausschließlich auf Grundlage Ihrer ausdrücklichen Einwilligung, die Sie bei der Registrierung erteilen.
              </p>
            </div>

            <div>
              <h2 className="text-white font-bold text-base mb-1">4. Zahlungsabwicklung (Stripe)</h2>
              <p>
                Zur Abwicklung von Zahlungen nutzen wir den Zahlungsdienstleister Stripe. Bei Bezahlung werden Ihre Zahlungsdaten direkt an Stripe übermittelt. Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung). Weitere Details entnehmen Sie der Datenschutzerklärung von Stripe.
              </p>
            </div>

            <div>
              <h2 className="text-white font-bold text-base mb-1">5. E-Mail-Versand (Resend)</h2>
              <p>
                Für den automatisierten Versand von Benachrichtigungen und Buchungsbestätigungen nutzen wir den Dienst Resend. Ihre E-Mail-Adresse und relevanten Buchungsdaten werden hierfür verarbeitet.
              </p>
            </div>

            <div>
              <h2 className="text-white font-bold text-base mb-1">6. Ihre Rechte</h2>
              <p>
                Sie haben jederzeit das Recht auf unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen Daten, deren Herkunft und Empfänger und den Zweck der Datenverarbeitung sowie ein Recht auf Berichtigung oder Löschung dieser Daten.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 max-w-7xl mx-auto w-full space-y-2">
        <p>&copy; {new Date().getFullYear()} VeriFit. Alle Rechte vorbehalten.</p>
        <div className="flex justify-center items-center gap-4">
          <Link href="/impressum" className="hover:text-emerald-400 transition">Impressum</Link>
          <Link href="/datenschutz" className="hover:text-emerald-400 transition">Datenschutz</Link>
          <Link href="/agb" className="hover:text-emerald-400 transition">AGB</Link>
        </div>
      </footer>
    </main>
  );
}