import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  // Initialisierung in die Funktion verschoben, um Build-Fehler zu vermeiden
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { slotId } = await req.json();
    if (!slotId) {
      return NextResponse.json({ error: 'slotId fehlt' }, { status: 400 });
    }

    // Preis und Status IMMER serverseitig aus der Datenbank holen (kein Vertrauen in Client-Daten!)
    const { data: slot, error: slotError } = await supabaseAdmin
      .from('trainer_slots')
      .select('id, title, price, status')
      .eq('id', slotId)
      .single();

    if (slotError || !slot || slot.status !== 'free') {
      return NextResponse.json({ error: 'Slot nicht mehr verfügbar oder ungültig' }, { status: 409 });
    }

    if (!slot.price || slot.price <= 0) {
      return NextResponse.json({ error: 'Kostenlose Slots bitte über den Anfrage-Flow buchen' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: Math.round(Number(slot.price) * 100),
            product_data: {
              name: slot.title || 'Trainingseinheit',
              description: 'Verifizierte Trainingseinheit über VeriFit',
            },
          },
        },
      ],
      metadata: { slotId: slot.id },
      success_url: `${appUrl}/quiz?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/quiz?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Checkout-Session-Fehler:', error);
    return NextResponse.json({ error: error.message || 'Fehler beim Erstellen der Checkout-Session' }, { status: 500 });
  }
}