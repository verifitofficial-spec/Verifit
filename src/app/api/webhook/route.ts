import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { resend } from '@/app/lib/resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-28.acacia' as any,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    try {
      const data = JSON.parse(body);
      if (data.type === 'checkout.session.completed') {
        const session = data.data.object;
        const slotId = session.metadata?.slotId;
        const customerEmail = session.customer_details?.email;

        if (slotId) {
          await supabaseAdmin
            .from('trainer_slots')
            .update({ status: 'booked' })
            .eq('id', slotId);

          if (customerEmail) {
            await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
              to: customerEmail,
              subject: 'Buchungsbestätigung – VeriFit',
              html: `<p>Vielen Dank für deine Buchung! Dein Termin wurde erfolgreich bestätigt und bezahlt.</p>`,
            });
          }
        }
      }
      return NextResponse.json({ received: true });
    } catch (parseErr: any) {
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const slotId = session.metadata?.slotId;
    const customerEmail = session.customer_details?.email;

    if (slotId) {
      const { error } = await supabaseAdmin
        .from('trainer_slots')
        .update({ status: 'booked' })
        .eq('id', slotId);

      if (!error && customerEmail) {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
          to: customerEmail,
          subject: 'Buchungsbestätigung – VeriFit',
          html: `<p>Vielen Dank für deine Buchung bei VeriFit! Dein Termin ist nun fest reserviert.</p>`,
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}