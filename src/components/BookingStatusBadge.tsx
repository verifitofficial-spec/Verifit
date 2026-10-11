import type { BookingStatus } from '@/lib/trainer-dashboard/types';

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: 'border-amber-500/25 bg-amber-500/10 text-amber-400',
  accepted: 'border-blue-500/25 bg-blue-500/10 text-blue-400',
  confirmed: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400',
  declined: 'border-red-500/25 bg-red-500/10 text-red-400',
  cancelled: 'border-slate-700 bg-slate-800 text-slate-300',
  expired: 'border-slate-700 bg-slate-800 text-slate-300',
};

const CLIENT_LABELS: Record<BookingStatus, string> = {
  pending: 'Anfrage ausstehend',
  accepted: 'Zahlung ausstehend',
  confirmed: 'Verbindlich bestätigt',
  declined: 'Abgelehnt',
  cancelled: 'Storniert',
  expired: 'Zahlungsfrist abgelaufen',
};

const TRAINER_LABELS: Record<BookingStatus, string> = {
  pending: 'Neue Anfrage',
  accepted: 'Wartet auf Zahlung',
  confirmed: 'Bestätigt',
  declined: 'Abgelehnt',
  cancelled: 'Storniert',
  expired: 'Zahlungsfrist abgelaufen',
};

interface BookingStatusBadgeProps {
  status: BookingStatus;
  audience: 'client' | 'trainer';
  paid?: boolean;
}

export default function BookingStatusBadge({ status, audience, paid = false }: BookingStatusBadgeProps) {
  const labels = audience === 'client' ? CLIENT_LABELS : TRAINER_LABELS;
  const label = audience === 'trainer' && status === 'confirmed' && paid ? 'Bezahlt' : labels[status];

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {label}
    </span>
  );
}
