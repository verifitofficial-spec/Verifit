'use client';

import { Calendar as CalendarIcon, CalendarDays } from 'lucide-react';
import type { Booking, TrainerSlot } from '@/lib/trainer-dashboard/types';
import BookingRequests from './BookingRequests';
import SlotCalendar from './SlotCalendar';
import { SectionCard, SectionHeader } from './ui';

interface Props {
  slots: TrainerSlot[];
  activeBookings: Booking[];
  pendingCount: number;
  bookingBySlot: Record<string, Booking>;
  onRespond: (bookingId: string, accept: boolean) => Promise<string | null>;
  onToggleSlot: (date: string, hour: string) => Promise<string | null>;
}

export default function ScheduleSection({
  slots,
  activeBookings,
  pendingCount,
  bookingBySlot,
  onRespond,
  onToggleSlot,
}: Props) {
  return (
    <SectionCard>
      <SectionHeader
        icon={CalendarDays}
        title="Terminkalender"
        description="Verwaltung freier Termine, Verfügbarkeiten und Auslastung."
      />

      <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
        <CalendarIcon size={14} /> Anfragen & Termine
        {pendingCount > 0 && (
          <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full">
            {pendingCount} neu
          </span>
        )}
      </div>

      <BookingRequests bookings={activeBookings} onRespond={onRespond} />
      <SlotCalendar slots={slots} bookingBySlot={bookingBySlot} onToggle={onToggleSlot} />
    </SectionCard>
  );
}
