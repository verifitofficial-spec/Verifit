import { MONTH_NAMES } from '@/lib/trainer-dashboard/constants';
import { navButtonClass } from './ui';

export function MonthNav({
  title,
  subtitle,
  year,
  month,
  onPrev,
  onNext,
}: {
  title?: string;
  subtitle?: string;
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h3 className="text-sm font-bold tracking-wide text-white">
          {title ? `${title}: ` : ''}
          {MONTH_NAMES[month]} {year}
        </h3>
        {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onPrev} className={navButtonClass}>
          &larr; Zurück
        </button>
        <button type="button" onClick={onNext} className={navButtonClass}>
          Weiter &rarr;
        </button>
      </div>
    </div>
  );
}

export function WeekdayRow() {
  return (
    <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-500 uppercase tracking-wider py-1 border-b border-slate-800/80">
      {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
        <div key={day}>{day}</div>
      ))}
    </div>
  );
}
