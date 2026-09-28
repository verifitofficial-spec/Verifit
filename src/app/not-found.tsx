import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <header className="flex justify-between items-center px-6 py-6 max-w-7xl mx-auto w-full">
        <Link href="/" className="text-2xl font-black tracking-wider text-emerald-400">
          VERIFIT<span className="text-white">.</span>
        </Link>
      </header>

      <section className="max-w-2xl mx-auto px-6 py-20 w-full flex-1 flex flex-col items-center text-center justify-center space-y-6">
        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
          Fehler 404
        </span>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight">
          Diese Seite gibt es nicht.
        </h1>
        <p className="text-slate-400 max-w-md text-sm md:text-base">
          Der gesuchte Inhalt wurde nicht gefunden oder ist nicht mehr verfügbar. Starte stattdessen unser Matching-Quiz und finde deinen passenden Trainer.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/quiz"
            className="inline-block bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-8 py-4 rounded-2xl text-base transition shadow-lg shadow-emerald-500/20"
          >
            Zum Trainer-Matching &rarr;
          </Link>
          <Link
            href="/"
            className="inline-block bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold px-8 py-4 rounded-2xl text-base transition"
          >
            Zur Startseite
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600 max-w-7xl mx-auto w-full">
        &copy; {new Date().getFullYear()} VeriFit. Alle Rechte vorbehalten.
      </footer>
    </main>
  );
}