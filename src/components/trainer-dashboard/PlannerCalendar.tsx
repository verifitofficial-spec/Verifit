'use client';

import { useId, useState } from 'react';
import { useCalendarMonth } from '@/hooks/trainer-dashboard/useCalendarMonth';
import { getDaysInMonth, getFirstWeekdayOffset, toDateStr } from '@/lib/trainer-dashboard/utils';
import type { ScheduleMap } from '@/lib/trainer-dashboard/types';
import { MonthNav, WeekdayRow } from './CalendarParts';

interface Props {
  title: string;
  hint: string;
  schedule: ScheduleMap;
  templates: string[];
  onAssign: (dateStr: string, templateName: string) => void;
  onRemove: (dateStr: string) => void;
}

export default function PlannerCalendar({ title, hint, schedule, templates, onAssign, onRemove }: Props) {
  const { year, month, prev, next } = useCalendarMonth();
  const templateId = useId();
  const dateId = useId();
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  function handleDrop(e: React.DragEvent, dateStr: string) {
    e.preventDefault();
    const templateName = e.dataTransfer.getData('text/plain');
    if (templateName) onAssign(dateStr, templateName);
  }

  function handleAccessibleAssign() {
    if (selectedDate && selectedTemplate) onAssign(selectedDate, selectedTemplate);
  }

  return (
    <div className="bg-slate-950/60 p-5 sm:p-6 rounded-2xl border border-slate-800/80 space-y-4">
      <MonthNav title={title} subtitle={hint} year={year} month={month} onPrev={prev} onNext={next} />

      <div className="grid gap-3 border-y border-slate-800 py-4 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <div>
          <label htmlFor={templateId} className="mb-1.5 block text-xs font-semibold text-slate-300">
            Vorlage auswählen
          </label>
          <select
            id={templateId}
            value={selectedTemplate}
            onChange={(event) => setSelectedTemplate(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
          >
            <option value="">Bitte auswählen</option>
            {templates.map((template) => (
              <option key={template} value={template}>{template}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={dateId} className="mb-1.5 block text-xs font-semibold text-slate-300">
            Datum
          </label>
          <input
            id={dateId}
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white tabular-nums"
          />
        </div>
        <button
          type="button"
          disabled={!selectedDate || !selectedTemplate}
          onClick={handleAccessibleAssign}
          className="min-h-11 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Zuweisen
        </button>
      </div>

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
                    aria-label={`Vorlage am ${dateStr} entfernen`}
                    className="bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition cursor-pointer"
                  >
                    &times;
                  </button>
                )}
              </div>
              <div className="overflow-hidden">
                {assigned ? (
                  <span
                    className="block text-xs font-semibold text-emerald-300 bg-emerald-500/20 px-1.5 py-1 rounded truncate"
                    title={assigned}
                  >
                    {assigned}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 italic">Noch nicht belegt</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
