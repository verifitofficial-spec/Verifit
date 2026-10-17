import Link from 'next/link';

interface Props {
  status: string | null;
  onLogout: () => void;
}

export default function DashboardHeader({ status, onLogout }: Props) {
  const approved = status === 'approved';

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-canvas/80 border-b border-line/80">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-black tracking-wider text-accent flex items-center gap-2">
          VERIFIT<span className="text-ink">.</span>
          <span className="text-xs bg-accent-soft text-accent border border-accent/35 px-2 py-0.5 rounded-md font-semibold">
            Expert Hub
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline-flex text-xs bg-surface/90 border border-line px-3.5 py-1.5 rounded-full text-ink-soft shadow-inner">
            Status:{' '}
            <strong className={`ml-1.5 ${approved ? 'text-accent' : 'text-warning'}`}>
              {approved ? 'Verifiziert ✓' : 'Prüfung ausstehend'}
            </strong>
          </span>
          <button
            onClick={onLogout}
            className="text-xs bg-surface hover:bg-surface-soft text-ink-soft hover:text-ink px-4 py-2 rounded-xl transition font-medium border border-line cursor-pointer shadow-sm"
          >
            Abmelden
          </button>
        </div>
      </div>
    </header>
  );
}
