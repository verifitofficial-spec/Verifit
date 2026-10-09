import type { LucideIcon } from 'lucide-react';
import { XCircle } from 'lucide-react';
import type { Feedback } from '@/lib/trainer-dashboard/types';

export const inputClass =
  'w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition shadow-inner';
export const smallInputClass =
  'w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500';
export const labelClass = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2';
export const primaryButtonClass =
  'bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-60';
export const navButtonClass =
  'bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer';

export function SectionCard({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <div
      id={id}
      className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6 scroll-mt-6"
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  icon: Icon,
  title,
  description,
  level = 2,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  level?: 1 | 2;
  actions?: React.ReactNode;
}) {
  const Heading = level === 1 ? 'h1' : 'h2';
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/80 pb-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
          <Icon size={20} />
        </div>
        <div>
          <Heading className="text-lg font-bold text-white tracking-tight">{title}</Heading>
          {description && <p className="text-slate-400 text-xs">{description}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}

export function FeedbackBox({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <div
      className={`p-3.5 rounded-xl text-xs font-medium border ${
        feedback.type === 'error'
          ? 'bg-red-500/10 border-red-500/25 text-red-400'
          : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
      }`}
    >
      {feedback.text}
    </div>
  );
}

export function ModalShell({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition cursor-pointer"
          aria-label="Schließen"
        >
          <XCircle size={20} />
        </button>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-xs text-slate-400 mb-6">{description}</p>
        {children}
      </div>
    </div>
  );
}
