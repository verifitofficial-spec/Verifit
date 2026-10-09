import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { finalizePaidBooking } from '@/app/lib/bookingPayments';
import { getAdminClient, getRequestAuthentication } from '@/app/lib/supabaseServer';

/**
 * Fallback zum Webhook: Der Kunde kommt von Stripe zurück, der Server prüft die Session bei Stripe
 * und bestätigt die Buchung. Dadurch funktioniert die Zahlung auch, wenn der Webhook (noch) nicht eingerichtet ist.
 */
export async function POST(req: Request) {
  const authentication = await getRequestAuthentication(req);
  if (!authentication) {
    return NextResponse.json({ error: 'Bitte melde dich an.' }, { status: 401 });
  }
  if (authentication.role !== 'client') {
    return NextResponse.json({ error: 'Keine Berechtigung.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body.' }, { status: 400 });
  }
  const sessionId =
    body && typeof body === 'object' && typeof (body as { sessionId?: unknown }).sessionId === 'string'
      ? (body as { sessionId: string }).sessionId
      : null;
  if (!sessionId || !sessionId.startsWith('cs_')) {
    return NextResponse.json({ error: 'Ungültige Sitzung.' }, { status: 400 });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json({ error: 'Stripe ist nicht konfiguriert.' }, { status: 503 });
  }

  try {
    const session = await new Stripe(stripeSecretKey).checkout.sessions.retrieve(sessionId);
    const bookingId = session.metadata?.bookingId;
    if (!bookingId) {
      return NextResponse.json({ error: 'Sitzung gehört zu keiner Buchung.' }, { status: 404 });
    }

    const admin = getAdminClient();
    const { data: booking } = await admin
      .from('bookings')
      .select('id, client_id, status')
      .eq('id', bookingId)
      .maybeSingle();

    if (!booking || booking.client_id !== authentication.user.id) {
      return NextResponse.json({ error: 'Buchung nicht gefunden.' }, { status: 404 });
    }

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ status: 'pending' });
    }

    const result = await finalizePaidBooking(admin, session);
    if (result === 'error') {
      return NextResponse.json({ error: 'Buchung konnte nicht bestätigt werden.' }, { status: 500 });
    }
    if (result === 'ignored') {
      // z. B. Zahlungsfrist abgelaufen oder bereits storniert
      return NextResponse.json({ status: booking.status === 'confirmed' ? 'confirmed' : 'pending' });
    }
    return NextResponse.json({ status: 'confirmed' });
  } catch (error) {
    const message = error && typeof error === 'object' && 'message' in error ? String((error as { message: unknown }).message) : 'Unbekannter Fehler';
    console.error('Checkout-Bestätigung fehlgeschlagen:', message);
    return NextResponse.json({ error: 'Zahlung konnte nicht geprüft werden.' }, { status: 502 });
  }
}
