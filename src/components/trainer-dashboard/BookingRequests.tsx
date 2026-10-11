'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon, CheckCircle, Clock, DollarSign, User, XCircle } from 'lucide-react';
import { formatDateDE } from '@/lib/trainer-dashboard/utils';
import type { Booking, Feedback } from '@/lib/trainer-dashboard/types';
import BookingStatusBadge from '@/components/BookingStatusBadge';
import { FeedbackBox } from './ui';

interface Props {
  bookings: Booking[];
  onRespond: (bookingId: string, accept: boolean) => Promise<string | null>;
}

export default function BookingRequests({ bookings, onRespond }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function respond(bookingId: string, accept: boolean) {
    setBusyId(bookingId);
    setFeedback(null);
    const error = await onRespond(bookingId, accept);
    setBusyId(null);
    if (error) setFeedback({ type: 'error', text: error });
  }

  return (
    <div className="space-y-4">
      <FeedbackBox feedback={feedback} />

      {bookings.length === 0 ? (
        <div className="text-center py-10 bg-slate-950/60 rounded-2xl border border-slate-800/80">
          <CalendarIcon className="mx-auto h-8 w-8 text-slate-600 mb-2" />
          <p className="text-slate-400 text-xs">Noch keine Anfragen oder Termine.</p>
        </div>
      ) : (
        bookings.map((booking) => {
          return (
            <div
              key={booking.id}
              className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                      booking.offer_type === 'discovery'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {booking.offer_type === 'discovery' ? 'Kostenlos' : 'Kostenpflichtig'}
                  </span>
                  <BookingStatusBadge status={booking.status} audience="trainer" paid={booking.price > 0} />
                </div>
                <h3 className="text-sm font-bold text-white">{booking.offer_title}</h3>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 tabular-nums">
                  <span className="flex items-center gap-1 text-emerald-300 font-medium">
                    <User size={12} /> {booking.client_name}
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <CalendarIcon size={12} /> {formatDateDE(booking.slot_date)}, {booking.slot_time.slice(0, 5)} Uhr
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Clock size={12} /> {booking.duration_minutes} Min.
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-emerald-400">
                    <DollarSign size={12} /> {booking.price > 0 ? `${booking.price} €` : '0 €'}
                  </span>
                </div>
              </div>

              {booking.status === 'pending' && (
                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    type="button"
                    disabled={busyId === booking.id}
                    onClick={() => void respond(booking.id, true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer disabled:opacity-60"
                  >
                    <CheckCircle size={12} /> Annehmen
                  </button>
                  <button
                    type="button"
                    disabled={busyId === booking.id}
                    onClick={() => void respond(booking.id, false)}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer disabled:opacity-60"
                  >
                    <XCircle size={12} /> Ablehnen
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
