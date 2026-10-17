'use client';

import { CalendarDays } from 'lucide-react';
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
        title="Verfügbarkeit & Termine"
        description="Freie Zeiten festlegen und Buchungsanfragen bearbeiten."
        actions={pendingCount > 0 ? (
          <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-primary-foreground">
            {pendingCount} neue {pendingCount === 1 ? 'Anfrage' : 'Anfragen'}
          </span>
        ) : undefined}
      />

      <BookingRequests bookings={activeBookings} onRespond={onRespond} />
      <SlotCalendar slots={slots} bookingBySlot={bookingBySlot} onToggle={onToggleSlot} />
    </SectionCard>
  );
}
