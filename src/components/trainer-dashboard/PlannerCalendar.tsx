'use client';

import { useCalendarMonth } from '@/hooks/trainer-dashboard/useCalendarMonth';
import { getDaysInMonth, getFirstWeekdayOffset, toDateStr } from '@/lib/trainer-dashboard/utils';
import type { ScheduleMap } from '@/lib/trainer-dashboard/types';
import { MonthNav, WeekdayRow } from './CalendarParts';

interface Props {
  title: string;
  hint: string;
  schedule: ScheduleMap;
  onAssign: (dateStr: string, templateName: string) => void;
  onRemove: (dateStr: string) => void;
}

export default function PlannerCalendar({ title, hint, schedule, onAssign, onRemove }: Props) {
  const { year, month, prev, next } = useCalendarMonth();

  function handleDrop(e: React.DragEvent, dateStr: string) {
    e.preventDefault();
    const templateName = e.dataTransfer.getData('text/plain');
    if (templateName) onAssign(dateStr, templateName);
  }

  return (
    <div className="bg-slate-950/60 p-5 sm:p-6 rounded-2xl border border-slate-800/80 space-y-4">
      <MonthNav title={title} subtitle={hint} year={year} month={month} onPrev={prev} onNext={next} />
      <WeekdayRow />

      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: getFirstWeekdayOffset(year, month) }).map((_, i) => (
          <div key={`empty-${i}`} className="h-20" />
        ))}

        {Array.from({ length: getDaysInMonth(year, month) }).map((_, i) => {
          const day = i + 1;
          const dateStr = toDateStr(year, month, day);
          const assigned = schedule[dateStr];

          return (
            <div
              key={dateStr}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, dateStr)}
              className={`h-20 rounded-xl p-2 text-xs transition flex flex-col justify-between border text-left ${
                assigned
                  ? 'bg-emerald-500/15 border-emerald-500/50 shadow-inner'
                  : 'bg-slate-900/50 border-slate-800/70 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span className="font-bold text-slate-300">{day}</span>
                {assigned && (
                  <button
                    type="button"
                    onClick={() => onRemove(dateStr)}
                    title="Template entfernen"
                    className="bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold transition cursor-pointer"
                  >
                    &times;
                  </button>
                )}
              </div>
              <div className="overflow-hidden">
                {assigned ? (
                  <span
                    className="block text-[9px] font-semibold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded truncate"
                    title={assigned}
                  >
                    {assigned}
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-600 italic">Hierher ziehen</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
