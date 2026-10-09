import Link from 'next/link';

interface Props {
  status: string | null;
  onLogout: () => void;
}

export default function DashboardHeader({ status, onLogout }: Props) {
  const approved = status === 'approved';

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-black tracking-wider text-emerald-400 flex items-center gap-2">
          VERIFIT<span className="text-white">.</span>
          <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-semibold">
            Expert Hub
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline-flex text-xs bg-slate-900/90 border border-slate-800 px-3.5 py-1.5 rounded-full text-slate-300 shadow-inner">
            Status:{' '}
            <strong className={`ml-1.5 ${approved ? 'text-emerald-400' : 'text-amber-400'}`}>
              {approved ? 'Verifiziert ✓' : 'Prüfung ausstehend'}
            </strong>
          </span>
          <button
            onClick={onLogout}
            className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white px-4 py-2 rounded-xl transition font-medium border border-slate-800 cursor-pointer shadow-sm"
          >
            Abmelden
          </button>
        </div>
      </div>
    </header>
  );
}
