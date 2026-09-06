import Link from 'next/link';

export default function RegisterSelectionPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <header className="flex justify-between items-center px-6 py-6 max-w-7xl mx-auto w-full">
        <Link href="/" className="text-2xl font-black tracking-wider text-emerald-400">
          VERIFIT<span className="text-white">.</span>
        </Link>
        <Link href="/" className="text-sm font-medium text-slate-300 hover:text-white transition">
          &larr; Zurück zur Startseite
        </Link>
      </header>

      <section className="flex flex-col items-center justify-center px-6 py-12 max-w-md mx-auto w-full flex-1 space-y-6">
        <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
          <div>
            <h1 className="text-2xl font-extrabold mb-2">Registrieren</h1>
            <p className="text-slate-400 text-sm">Möchtest du Fitness-Kunde werden oder dich als Trainer registrieren?</p>
          </div>

          <div className="space-y-4">
            <Link
              href="/client/register"
              className="block w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-4 rounded-2xl text-sm transition shadow-lg shadow-emerald-500/20"
            >
              Als Kunde registrieren
            </Link>
            <Link
              href="/trainer/register"
              className="block w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-2xl text-sm transition border border-slate-700"
            >
              Als Trainer registrieren
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600 max-w-7xl mx-auto w-full">
        &copy; {new Date().getFullYear()} VeriFit. Alle Rechte vorbehalten.
      </footer>
    </main>
  );
}