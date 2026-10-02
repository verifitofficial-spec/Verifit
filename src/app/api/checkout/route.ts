import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAdminClient, getUserFromRequest } from '@/app/lib/supabaseServer';

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

  try {
    const { bookingId } = await req.json();
    if (!bookingId) return NextResponse.json({ error: 'bookingId fehlt' }, { status: 400 });

    const admin = getAdminClient();
    const { data: booking } = await admin
      .from('bookings')
      .select('id, client_id, client_email, offer_title, price, status, payment_due_at')
      .eq('id', bookingId).single();

    if (!booking || booking.client_id !== user.id || booking.status !== 'accepted') {
      return NextResponse.json({ error: 'Buchung nicht bezahlbar' }, { status: 409 });
    }
    if (booking.payment_due_at && new Date(booking.payment_due_at) < new Date()) {
      return NextResponse.json({ error: 'Die Zahlungsfrist ist abgelaufen' }, { status: 409 });
    }
    if (!booking.price || Number(booking.price) <= 0) {
      return NextResponse.json({ error: 'Kostenlose Buchungen werden nicht bezahlt' }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: booking.client_email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(Number(booking.price) * 100),
          product_data: {
            name: booking.offer_title || 'Trainingseinheit',
            description: 'Verifizierte Trainingseinheit über VeriFit',
          },
        },
      }],
      metadata: { bookingId: booking.id },
      success_url: `${appUrl}/checkout/success`,
      cancel_url: `${appUrl}/client/${user.id}/dashboard?canceled=true`,
    });

    await admin.from('bookings').update({ stripe_session_id: session.id }).eq('id', booking.id);
    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Checkout-Session-Fehler:', error);
    return NextResponse.json({ error: error.message || 'Fehler beim Erstellen der Checkout-Session' }, { status: 500 });
  }
}