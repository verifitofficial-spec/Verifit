import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-slate-900 bg-slate-950 py-8 text-xs text-slate-400">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          &copy; {new Date().getFullYear()} VeriFit. Alle Rechte vorbehalten.
        </div>
        <nav className="flex items-center gap-6 font-medium">
          <Link href="/impressum" className="hover:text-emerald-400 transition">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:text-emerald-400 transition">
            Datenschutz
          </Link>
          <Link href="/agb" className="hover:text-emerald-400 transition">
            AGB
          </Link>
        </nav>
      </div>
    </footer>
  );
}