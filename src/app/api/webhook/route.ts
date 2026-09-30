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
    const slotId = session.metadata?.slotId;

    // Nur bei erfolgreicher Bezahlung und vorhandener slotId fortfahren
    if (session.payment_status !== 'paid' || !slotId) {
      return NextResponse.json({ received: true });
    }

    const customerEmail = session.customer_details?.email || session.customer_email;

    // Idempotentes Update: Nur aktualisieren, wenn der Slot nicht bereits 'booked' ist
    const { data, error } = await supabaseAdmin
      .from('trainer_slots')
      .update({
        status: 'booked',
        client_email: customerEmail ?? null,
      })
      .eq('id', slotId)
      .neq('status', 'booked')
      .select('id');

    if (error) {
      console.error('DB-Fehler beim Webhook-Update:', error.message);
      return NextResponse.json({ error: 'DB-Fehler' }, { status: 500 }); // Stripe führt einen Retry aus
    }

    // E-Mail nur dann versenden, wenn das Update erfolgreich war (verhindert Spam bei Retries)
    if (data && data.length > 0 && customerEmail) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
          to: customerEmail,
          subject: 'Buchungsbestätigung – VeriFit',
          html: '<p>Vielen Dank für deine Buchung bei VeriFit! Dein Termin ist fest reserviert.</p>',
        });
      } catch (mailErr) {
        console.error('Mailversand fehlgeschlagen:', mailErr);
      }
    }
  }

  return NextResponse.json({ received: true });
}