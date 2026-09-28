import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { resend } from '@/app/lib/resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover' as any,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook-Signaturprüfung fehlgeschlagen:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const slotId = session.metadata?.slotId;
    const clientEmailFromMeta = session.metadata?.clientEmail || session.customer_details?.email;

    if (!slotId) {
      console.error('Webhook: checkout.session.completed ohne slotId in metadata', session.id);
      return NextResponse.json({ received: true });
    }

    const { error } = await supabaseAdmin
      .from('trainer_slots')
      .update({
        status: 'booked',
        client_email: clientEmailFromMeta || null,
      })
      .eq('id', slotId);

    if (error) {
      console.error('Fehler beim Aktualisieren des Slot-Status in Supabase:', error.message);
      return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
    }

    if (clientEmailFromMeta) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
          to: clientEmailFromMeta,
          subject: 'Buchungsbestätigung – VeriFit',
          html: `<p>Vielen Dank für deine Buchung bei VeriFit! Dein Termin wurde erfolgreich bestätigt und bezahlt.</p>`,
        });
      } catch (mailErr) {
        console.error('Resend-Fehler nach erfolgreicher Buchung:', mailErr);
      }
    }
  }

  return NextResponse.json({ received: true });
}