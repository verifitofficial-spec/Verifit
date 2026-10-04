import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { getAdminClient, getRequestAuthentication } from '@/app/lib/supabaseServer';

function getAppointmentDate(date: string, time: string): Date {
  return new Date(`${date}T${String(time).slice(0, 8)}`);
}

export async function POST(request: Request) {
  const authentication = await getRequestAuthentication(request);
  if (!authentication || !['client', 'trainer'].includes(authentication.role || '')) {
    return NextResponse.json({ error: 'Bitte melde dich als Kunde oder Trainer an.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || !('bookingId' in body) || typeof body.bookingId !== 'string') {
    return NextResponse.json({ error: 'bookingId fehlt.' }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .select('id, client_id, trainer_id, slot_id, status, price, stripe_payment_intent_id, slot_date, slot_time')
    .eq('id', body.bookingId)
    .maybeSingle();

  if (bookingError || !booking) return NextResponse.json({ error: 'Buchung nicht gefunden.' }, { status: 404 });
  const ownsBooking = authentication.role === 'client'
    ? booking.client_id === authentication.user.id
    : booking.trainer_id === authentication.user.id;
  if (!ownsBooking) return NextResponse.json({ error: 'Keine Berechtigung für diese Buchung.' }, { status: 403 });
  if (!['pending', 'accepted', 'confirmed'].includes(booking.status)) {
    return NextResponse.json({ error: 'Diese Buchung kann nicht mehr storniert werden.' }, { status: 409 });
  }

  const isPaid = booking.status === 'confirmed' && Number(booking.price) > 0 && Boolean(booking.stripe_payment_intent_id);
  if (isPaid && authentication.role === 'client') {
    const appointment = getAppointmentDate(booking.slot_date, booking.slot_time);
    if (Number.isNaN(appointment.getTime()) || appointment.getTime() - Date.now() < 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: 'Kostenlose Stornierung ist nur bis 24 Stunden vor dem Termin möglich.' }, { status: 409 });
    }
  }

  let refundId: string | null = null;
  if (isPaid) {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) return NextResponse.json({ error: 'Stripe ist in dieser Staging-Umgebung nicht konfiguriert.' }, { status: 503 });
    try {
      const refund = await new Stripe(secret).refunds.create(
        { payment_intent: booking.stripe_payment_intent_id as string, reason: 'requested_by_customer' },
        { idempotencyKey: `verifit-refund-${booking.id}` }
      );
      refundId = refund.id;
    } catch {
      return NextResponse.json({ error: 'Die Zahlung konnte nicht erstattet werden.' }, { status: 502 });
    }
  }

  const { error: updateError } = await admin
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      refund_id: refundId,
      refunded_at: refundId ? new Date().toISOString() : null,
    })
    .eq('id', booking.id)
    .in('status', ['pending', 'accepted', 'confirmed']);
  if (updateError) return NextResponse.json({ error: 'Buchung konnte nicht storniert werden.' }, { status: 500 });

  await admin.from('trainer_slots').update({ status: 'free' }).eq('id', booking.slot_id).in('status', ['pending', 'booked']);
  return NextResponse.json({ success: true, refunded: Boolean(refundId) });
}
