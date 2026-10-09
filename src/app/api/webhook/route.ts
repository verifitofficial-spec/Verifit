import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { finalizePaidBooking } from '@/app/lib/bookingPayments';
import { getAdminClient } from '@/app/lib/supabaseServer';

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json({ error: 'Webhook nicht konfiguriert.' }, { status: 400 });
  }
  const stripe = new Stripe(stripeSecretKey);
  const admin = getAdminClient();
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json({ error: 'Webhook nicht konfiguriert.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    console.error('Webhook-Signaturprüfung fehlgeschlagen');
    return NextResponse.json({ error: 'Ungültige Signatur.' }, { status: 400 });
  }

  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account;
    const { error } = await admin
      .from('trainers')
      .update({ charges_enabled: account.charges_enabled })
      .eq('stripe_account_id', account.id);
    if (error) console.error('Stripe-Connect-Status konnte nicht gespeichert werden');
    return NextResponse.json({ received: true });
  }

  if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;
    if (bookingId) {
      const { data: expiredBooking, error: expiryError } = await admin
        .from('bookings')
        .update({ status: 'expired' })
        .eq('id', bookingId)
        .eq('status', 'accepted')
        .select('slot_id')
        .maybeSingle();
      if (expiryError) console.error('Buchung konnte nach Stripe-Fehler nicht ablaufen');
      if (expiredBooking?.slot_id) {
        await admin
          .from('trainer_slots')
          .update({ status: 'free' })
          .eq('id', expiredBooking.slot_id)
          .eq('status', 'pending');
      }
    }
    return NextResponse.json({ received: true });
  }

  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const result = await finalizePaidBooking(admin, session);
  if (result === 'error') {
    return NextResponse.json({ error: 'Buchung konnte nicht finalisiert werden.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
