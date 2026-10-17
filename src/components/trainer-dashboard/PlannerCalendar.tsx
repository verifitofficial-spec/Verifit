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
    <div className="bg-canvas/60 p-5 sm:p-6 rounded-2xl border border-line/80 space-y-4">
      <MonthNav title={title} subtitle={hint} year={year} month={month} onPrev={prev} onNext={next} />

      <div className="grid gap-3 border-y border-line py-4 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <div>
          <label htmlFor={templateId} className="mb-1.5 block text-xs font-semibold text-ink-soft">
            Vorlage auswählen
          </label>
          <select
            id={templateId}
            value={selectedTemplate}
            onChange={(event) => setSelectedTemplate(event.target.value)}
            className="w-full rounded-lg border border-line-strong bg-canvas px-3 py-2.5 text-sm text-ink"
          >
            <option value="">Bitte auswählen</option>
            {templates.map((template) => (
              <option key={template} value={template}>{template}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={dateId} className="mb-1.5 block text-xs font-semibold text-ink-soft">
            Datum
          </label>
          <input
            id={dateId}
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="w-full rounded-lg border border-line-strong bg-canvas px-3 py-2.5 text-sm text-ink tabular-nums"
          />
        </div>
        <button
          type="button"
          disabled={!selectedDate || !selectedTemplate}
          onClick={handleAccessibleAssign}
          className="min-h-11 rounded-lg border border-line-strong bg-surface-soft px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
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
                  ? 'bg-accent/15 border-accent/65 shadow-inner'
                  : 'bg-surface/50 border-line/70 hover:border-line-strong'
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span className="font-bold text-ink-soft">{day}</span>
                {assigned && (
                  <button
                    type="button"
                    onClick={() => onRemove(dateStr)}
                    title="Template entfernen"
                    aria-label={`Vorlage am ${dateStr} entfernen`}
                    className="bg-danger-soft hover:bg-danger-strong text-danger hover:text-danger-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition cursor-pointer"
                  >
                    &times;
                  </button>
                )}
              </div>
              <div className="overflow-hidden">
                {assigned ? (
                  <span
                    className="block text-xs font-semibold text-accent bg-accent-soft px-1.5 py-1 rounded truncate"
                    title={assigned}
                  >
                    {assigned}
                  </span>
                ) : (
                  <span className="text-xs text-ink-muted italic">Noch nicht belegt</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
