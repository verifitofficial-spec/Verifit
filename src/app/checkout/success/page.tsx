import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export default function CheckoutSuccessPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <header className="flex justify-between items-center px-6 py-6 max-w-7xl mx-auto w-full">
        <Link href="/" className="text-2xl font-black tracking-wider text-emerald-400">
          VERIFIT<span className="text-white">.</span>
        </Link>
      </header>

      <section className="max-w-xl mx-auto px-6 py-20 w-full flex-1 flex flex-col items-center text-center justify-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <CheckCircle2 size={32} />
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          Buchung erfolgreich!
        </h1>
        <p className="text-slate-400 text-sm md:text-base">
          Deine Zahlung wurde bestätigt und dein Termin ist reserviert. Du erhältst in Kürze eine Bestätigungsmail mit allen Details.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/"
            className="inline-block bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-8 py-4 rounded-2xl text-base transition shadow-lg shadow-emerald-500/20"
          >
            Zur Startseite
          </Link>
          <Link
            href="/login"
            className="inline-block bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold px-8 py-4 rounded-2xl text-base transition"
          >
            Zum Login
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600 max-w-7xl mx-auto w-full">
        &copy; {new Date().getFullYear()} VeriFit. Alle Rechte vorbehalten.
      </footer>
    </main>
  );
}