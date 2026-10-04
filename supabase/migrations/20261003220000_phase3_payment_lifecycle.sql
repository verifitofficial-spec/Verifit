-- VeriFit Phase 3: payment lifecycle bookkeeping.
-- Staging-only; additive migration, no destructive changes.
-- Rollback hint: archive the new columns before removing them in a separately reviewed migration.

alter table public.bookings
  add column if not exists cancelled_at timestamptz,
  add column if not exists refund_id text,
  add column if not exists refunded_at timestamptz;

create index if not exists bookings_payment_lifecycle_idx
  on public.bookings (status, payment_due_at);

comment on column public.bookings.refund_id is 'Stripe refund id in test mode, if a paid booking was refunded.';
comment on column public.bookings.refunded_at is 'Timestamp at which Stripe confirmed refund creation.';
