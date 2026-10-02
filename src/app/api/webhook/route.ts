import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { resend } from '@/app/lib/resend';

export async function POST(req: Request) {
  // Initialisierung in die Funktion verschoben, um Build-Fehler zu vermeiden
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json({ error: 'Nicht konfiguriert' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err: any) {
    console.error('Webhook-Signaturprüfung fehlgeschlagen:', err.message);
    return NextResponse.json({ error: 'Ungültige Signatur' }, { status: 400 });
  }

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;

    if (session.payment_status !== 'paid' || !bookingId) {
      return NextResponse.json({ received: true });
    }

    // Idempotent: nur von 'accepted' nach 'confirmed'
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'confirmed',
        paid_at: new Date().toISOString(),
        stripe_session_id: session.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === 'string' ? session.payment_intent : null,
      })
      .eq('id', bookingId)
      .eq('status', 'accepted')
      .select('id, client_email, offer_title, slot_date, slot_time');

    if (error) {
      console.error('DB-Fehler beim Webhook-Update:', error.message);
      return NextResponse.json({ error: 'DB-Fehler' }, { status: 500 }); // Stripe retryt
    }

    if (!data || data.length === 0) {
      // Retry (schon bestätigt) oder Zahlung nach Verfall: im zweiten Fall manuell erstatten
      console.warn('Webhook: keine Buchung im Status accepted für', bookingId);
      return NextResponse.json({ received: true });
    }

    const b = data[0];

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: b.client_email,
        subject: 'Buchungsbestätigung – VeriFit',
        html: `<p>Vielen Dank! Dein Termin <strong>${b.offer_title}</strong> am ${b.slot_date} um ${String(b.slot_time).slice(0, 5)} Uhr ist bezahlt und fest reserviert.</p>`,
      });
    } catch (mailErr) {
      console.error('Mailversand fehlgeschlagen:', mailErr);
    }
  }

  return NextResponse.json({ received: true });
}