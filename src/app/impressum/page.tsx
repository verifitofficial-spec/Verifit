import Link from 'next/link';

export default function ImpressumPage() {
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
          <h1 className="text-3xl font-extrabold text-white">Impressum</h1>
          
          <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
            <div>
              <h2 className="text-white font-bold text-base mb-1">Angaben gemäß § 5 DDG</h2>
              <p>[Dein Vorname & Nachname oder Firmenname]</p>
              <p>[Straße und Hausnummer]</p>
              <p>[PLZ und Ort]</p>
            </div>

            <div>
              <h2 className="text-white font-bold text-base mb-1">Kontakt</h2>
              <p>Telefon: [Deine Telefonnummer]</p>
              <p>E-Mail: [Deine E-Mail-Adresse]</p>
            </div>

            <div>
              <h2 className="text-white font-bold text-base mb-1">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
              <p>[Dein Vorname & Nachname]</p>
              <p>[Adresse wie oben]</p>
            </div>

            <div>
              <h2 className="text-white font-bold text-base mb-1">Haftungsausschluss (Disclaimer)</h2>
              <p>
                <strong>Haftung für Inhalte:</strong> Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
              </p>
              <p className="mt-2">
                <strong>Haftung für Links:</strong> Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
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