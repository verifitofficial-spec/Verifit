import type { InquiryStatus } from '@/lib/inquiryCore';

const STATUS_STYLES: Record<InquiryStatus, string> = {
  new: 'border-warning-line bg-warning-soft text-warning',
  viewed: 'border-info-line bg-info-soft text-info',
  contacted: 'border-accent/40 bg-accent-soft text-accent',
  declined: 'border-danger-line bg-danger-soft text-danger',
  closed: 'border-line-strong bg-surface-soft text-ink-soft',
};

const LABELS: Record<InquiryStatus, string> = {
  new: 'Neu',
  viewed: 'Gesehen',
  contacted: 'Kontakt aufgenommen',
  declined: 'Abgelehnt',
  closed: 'Abgeschlossen',
};

export default function InquiryStatusBadge({ status }: { status: InquiryStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
