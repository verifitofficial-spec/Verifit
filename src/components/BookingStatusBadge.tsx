import type { BookingStatus } from '@/lib/trainer-dashboard/types';

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: 'border-warning-line bg-warning-soft text-warning',
  accepted: 'border-info-line bg-info-soft text-info',
  confirmed: 'border-accent/40 bg-accent-soft text-accent',
  declined: 'border-danger-line bg-danger-soft text-danger',
  cancelled: 'border-line-strong bg-surface-soft text-ink-soft',
  expired: 'border-line-strong bg-surface-soft text-ink-soft',
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
