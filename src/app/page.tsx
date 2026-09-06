import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <header className="flex justify-between items-center px-6 py-6 max-w-7xl mx-auto w-full">
        <Link href="/" className="text-2xl font-black tracking-wider text-emerald-400">
          VERIFIT<span className="text-white">.</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition">
            Login
          </Link>
          <Link href="/register" className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-4 py-2 rounded-xl text-sm transition">
            Registrieren
          </Link>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-6 py-20 w-full flex-1 flex flex-col items-center text-center justify-center space-y-6">
        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
          Geprüfte Qualität & Exzellenz
        </span>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight">
          Finde den perfekten Personal Trainer.
        </h1>
        <p className="text-slate-400 max-w-lg text-sm md:text-base">
          Kein Chaos, keine falschen Versprechungen. Starte das Quiz und entdecke handverlesene, verifizierte Experten, die zu deinen Zielen passen.
        </p>
        <div>
          <Link
            href="/quiz"
            className="inline-block bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-8 py-4 rounded-2xl text-base transition shadow-lg shadow-emerald-500/20"
          >
            Zum Trainer-Matching &rarr;
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600 max-w-7xl mx-auto w-full">
        &copy; {new Date().getFullYear()} VeriFit. Alle Rechte vorbehalten.
      </footer>
    </main>
  );
}