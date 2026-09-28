import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover' as any,
});

export async function POST(req: Request) {
  try {
    const { slotId, title, price, trainerName, clientEmail } = await req.json();

    if (!slotId || !title || price == null) {
      return NextResponse.json(
        { error: 'Fehlende Pflichtparameter (slotId, title oder price).' },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: clientEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `${title}${trainerName ? ` bei ${trainerName}` : ''}`,
              description: 'Verifizierte Trainingseinheit über VeriFit',
            },
            unit_amount: Math.round(Number(price) * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        slotId,
        clientEmail: clientEmail || '',
      },
      success_url: `${appUrl}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/quiz?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Checkout-Session-Fehler:', error);
    return NextResponse.json(
      { error: error.message || 'Fehler beim Erstellen der Checkout-Session' },
      { status: 500 }
    );
  }
}