'use client';

import { useMemo, useState } from 'react';
import { useCalendarMonth } from '@/hooks/trainer-dashboard/useCalendarMonth';
import { SLOT_HOURS } from '@/lib/trainer-dashboard/constants';
import { getDaysInMonth, getFirstWeekdayOffset, todayDateStr, toDateStr } from '@/lib/trainer-dashboard/utils';
import type { Booking, Feedback, TrainerSlot } from '@/lib/trainer-dashboard/types';
import { MonthNav, WeekdayRow } from './CalendarParts';
import { FeedbackBox } from './ui';

interface Props {
  slots: TrainerSlot[];
  bookingBySlot: Record<string, Booking>;
  onToggle: (date: string, hour: string) => Promise<string | null>;
}

export default function SlotCalendar({ slots, bookingBySlot, onToggle }: Props) {
  const { year, month, prev, next } = useCalendarMonth();
  const [selectedDate, setSelectedDate] = useState(todayDateStr);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const datesWithSlots = useMemo(() => new Set(slots.map((s) => s.slot_date)), [slots]);

  async function handleToggle(hour: string) {
    setFeedback(null);
    const error = await onToggle(selectedDate, hour);
    if (error) setFeedback({ type: 'error', text: error });
  }

  return (
    <div className="space-y-6 pt-6 border-t border-slate-800/80">
      <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800/80 space-y-4">
        <MonthNav year={year} month={month} onPrev={prev} onNext={next} />
        <WeekdayRow />

        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: getFirstWeekdayOffset(year, month) }).map((_, i) => (
            <div key={`empty-${i}`} className="h-12" />
          ))}

          {Array.from({ length: getDaysInMonth(year, month) }).map((_, i) => {
            const day = i + 1;
            const dateStr = toDateStr(year, month, day);
            const isSelected = selectedDate === dateStr;
            const hasSlots = datesWithSlots.has(dateStr);

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => setSelectedDate(dateStr)}
                className={`h-12 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer border ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-lg shadow-emerald-500/20 scale-105 z-10'
                    : hasSlots
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:border-emerald-500/60'
                    : 'bg-slate-900 text-slate-300 border-slate-800/80 hover:border-slate-700 hover:text-white'
                }`}
              >
                <span>{day}</span>
                {hasSlots && !isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800/80 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Stunden für: <span className="text-emerald-400">{selectedDate}</span>
          </span>
          <span className="text-[11px] text-slate-500">Klicke auf eine Stunde zum Freigeben</span>
        </div>

        <FeedbackBox feedback={feedback} />

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
          {SLOT_HOURS.map((hour) => {
            const slot = slots.find((s) => s.slot_date === selectedDate && s.slot_time.startsWith(hour));
            const booking = slot ? bookingBySlot[slot.id] : undefined;

            const style =
              slot?.status === 'booked'
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : slot?.status === 'pending'
                ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                : slot?.status === 'free'
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700';
            const label =
              slot?.status === 'booked' ? 'Gebucht' : slot?.status === 'pending' ? 'Angefragt' : slot?.status === 'free' ? 'Frei' : 'Inaktiv';

            return (
              <button
                key={hour}
                type="button"
                onClick={() => void handleToggle(hour)}
                className={`p-3 rounded-xl text-xs transition border flex flex-col items-center justify-between gap-1 cursor-pointer ${style}`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="font-bold">{hour} Uhr</span>
                  <span>{slot ? '✓' : '+'}</span>
                </div>
                <span className="text-[9px] uppercase font-semibold">{label}</span>
                {booking && (
                  <div
                    className="w-full text-center text-[9px] text-slate-300 truncate"
                    title={`${booking.client_name} · ${booking.offer_title}`}
                  >
                    {booking.client_name} · {booking.offer_title}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
