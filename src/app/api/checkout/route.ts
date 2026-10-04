import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAdminClient, getRequestAuthentication } from '@/app/lib/supabaseServer';
import { checkoutSchema } from '@/app/lib/validation/bookingSchemas';

export async function POST(req: Request) {
  const authentication = await getRequestAuthentication(req);
  if (!authentication) {
    return NextResponse.json({ error: 'Bitte melde dich an.' }, { status: 401 });
  }
  if (authentication.role !== 'client') {
    return NextResponse.json(
      { error: 'Nur Kunden-Konten können Buchungen bezahlen.' },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Ungültige Eingabe' },
      { status: 400 }
    );
  }

  try {
    const admin = getAdminClient();
    const { data: booking, error: bookingError } = await admin
      .from('bookings')
      .select('id, client_id, trainer_id, client_email, offer_id, offer_title, price, status, payment_due_at')
      .eq('id', parsed.data.bookingId)
      .maybeSingle();

    if (bookingError) {
      console.error('Buchung konnte nicht für Checkout geladen werden:', bookingError);
      return NextResponse.json({ error: 'Checkout konnte nicht gestartet werden.' }, { status: 500 });
    }
    if (!booking || booking.client_id !== authentication.user.id || booking.status !== 'accepted') {
      return NextResponse.json({ error: 'Buchung nicht bezahlbar.' }, { status: 409 });
    }
    if (!booking.payment_due_at) {
      return NextResponse.json({ error: 'Für diese Buchung fehlt eine Zahlungsfrist.' }, { status: 409 });
    }

    const paymentDueAt = new Date(booking.payment_due_at);
    const now = new Date();
    if (Number.isNaN(paymentDueAt.getTime()) || paymentDueAt < now) {
      return NextResponse.json({ error: 'Die Zahlungsfrist ist abgelaufen.' }, { status: 409 });
    }

    const checkoutExpiresAt = Math.floor(paymentDueAt.getTime() / 1000);
    if (checkoutExpiresAt < Math.floor(now.getTime() / 1000) + 30 * 60) {
      return NextResponse.json(
        { error: 'Die Zahlungsfrist ist zu nah. Bitte kontaktiere den Support.' },
        { status: 409 }
      );
    }
    if (!booking.price || Number(booking.price) <= 0) {
      return NextResponse.json(
        { error: 'Kostenlose Buchungen werden nicht bezahlt.' },
        { status: 400 }
      );
    }

    const { data: trainer, error: trainerError } = await admin
      .from('trainers')
      .select('stripe_account_id, charges_enabled, status')
      .eq('id', booking.trainer_id)
      .maybeSingle();
    if (trainerError || !trainer || trainer.status !== 'approved' || !trainer.stripe_account_id || !trainer.charges_enabled) {
      return NextResponse.json({ error: 'Der Trainer hat Stripe Connect noch nicht vollständig eingerichtet.' }, { status: 409 });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY fehlt in den Umgebungsvariablen.');
      return NextResponse.json({ error: 'Server-Konfigurationsfehler.' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const amountInCents = Math.round(Number(booking.price) * 100);
    const platformFeePercent = Math.min(50, Math.max(0, Number(process.env.PLATFORM_FEE_PERCENT || '15')));
    const applicationFeeAmount = Math.round(amountInCents * platformFeePercent / 100);

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer_email: booking.client_email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'eur',
              unit_amount: amountInCents,
              product_data: {
                name: booking.offer_title || 'Trainingseinheit',
                description: 'Verifizierte Trainingseinheit über VeriFit',
              },
            },
          },
        ],
        payment_intent_data: {
          application_fee_amount: applicationFeeAmount,
          transfer_data: { destination: trainer.stripe_account_id },
        },
        metadata: { 
          bookingId: booking.id,
          offerId: booking.offer_id || '' 
        },
        expires_at: checkoutExpiresAt,
        success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/client/${authentication.user.id}/dashboard?canceled=true`,
      },
      { idempotencyKey: `verifit-booking-${booking.id}` }
    );

    if (!session.url) {
      console.error('Stripe lieferte keine Checkout-URL');
      return NextResponse.json({ error: 'Checkout konnte nicht gestartet werden.' }, { status: 500 });
    }

    const { error: updateError } = await admin
      .from('bookings')
      .update({ stripe_session_id: session.id })
      .eq('id', booking.id)
      .eq('status', 'accepted');

    if (updateError) {
      console.error('Stripe-Session konnte nicht an Buchung gespeichert werden:', updateError);
      return NextResponse.json({ error: 'Checkout konnte nicht gestartet werden.' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error(
      'Checkout-Session konnte nicht erstellt werden:',
      error instanceof Error ? error.message : 'Unbekannter Fehler'
    );
    return NextResponse.json({ error: 'Checkout konnte nicht gestartet werden.' }, { status: 500 });
  }
}
