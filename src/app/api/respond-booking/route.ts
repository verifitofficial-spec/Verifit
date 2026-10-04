import { NextResponse } from 'next/server';
import { getResendClient } from '@/app/lib/resend';
import {
  getAccessTokenFromRequest,
  getAdminClient,
  getRequestAuthentication,
  getUserClient,
} from '@/app/lib/supabaseServer';
import { respondToBookingSchema } from '@/app/lib/validation/bookingSchemas';

function escapeHtml(value: string | number | null) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function POST(req: Request) {
  const authentication = await getRequestAuthentication(req);
  const accessToken = getAccessTokenFromRequest(req);
  if (!authentication || !accessToken) {
    return NextResponse.json({ error: 'Bitte melde dich an.' }, { status: 401 });
  }
  if (authentication.role !== 'trainer') {
    return NextResponse.json({ error: 'Keine Berechtigung.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body.' }, { status: 400 });
  }

  const parsed = respondToBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Ungültige Eingabe.' },
      { status: 400 }
    );
  }

  const admin = getAdminClient();
  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .select('id, trainer_id, client_id, client_email, offer_title, offer_type, price, status')
    .eq('id', parsed.data.bookingId)
    .maybeSingle();

  if (bookingError) {
    console.error('Buchung konnte nicht zur Antwort geladen werden');
    return NextResponse.json({ error: 'Buchung konnte nicht geladen werden.' }, { status: 500 });
  }
  if (!booking || booking.trainer_id !== authentication.user.id) {
    return NextResponse.json({ error: 'Buchung nicht gefunden.' }, { status: 404 });
  }
  if (booking.status !== 'pending') {
    return NextResponse.json(
      { error: 'Auf diese Buchung kann nicht mehr geantwortet werden.' },
      { status: 409 }
    );
  }

  const { error: responseError } = await getUserClient(accessToken).rpc('respond_to_booking', {
    p_booking_id: booking.id,
    p_accept: parsed.data.accept,
  });

  if (responseError) {
    console.error('Buchungsantwort konnte nicht gespeichert werden');
    return NextResponse.json({ error: 'Buchungsantwort konnte nicht gespeichert werden.' }, { status: 500 });
  }

  const { data: updatedBooking, error: updatedBookingError } = await admin
    .from('bookings')
    .select('status, payment_due_at')
    .eq('id', booking.id)
    .maybeSingle();

  if (updatedBookingError || !updatedBooking) {
    console.error('Aktualisierte Buchung konnte nicht geladen werden');
    return NextResponse.json({ error: 'Buchungsantwort konnte nicht geprüft werden.' }, { status: 500 });
  }

  try {
    const title = escapeHtml(booking.offer_title || 'Trainingseinheit');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const clientPortalUrl = appUrl ? `${appUrl}/client/${booking.client_id}/dashboard` : null;
    let subject: string;
    let html: string;

    if (!parsed.data.accept) {
      subject = 'Buchungsanfrage abgelehnt – VeriFit';
      html = `<p>Deine Anfrage für <strong>${title}</strong> wurde leider abgelehnt. Bitte wähle gern einen anderen freien Termin.</p>`;
    } else if (updatedBooking.status === 'accepted') {
      subject = 'Buchungsanfrage angenommen – Zahlung ausstehend';
      html = `<p>Deine Anfrage für <strong>${title}</strong> wurde angenommen.</p><p>Bitte schließe die Zahlung innerhalb der Zahlungsfrist in deinem Kunden-Portal ab.${clientPortalUrl ? ` <a href="${clientPortalUrl}">Jetzt bezahlen</a>` : ''}</p>`;
    } else {
      subject = 'Buchungsanfrage bestätigt – VeriFit';
      html = `<p>Deine Anfrage für <strong>${title}</strong> wurde bestätigt. Der Termin ist verbindlich reserviert.</p>`;
    }

    await getResendClient().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: booking.client_email,
      subject,
      html,
    });
  } catch {
    console.error('Buchungsantwort-E-Mail konnte nicht versendet werden');
  }

  return NextResponse.json({
    success: true,
    status: updatedBooking.status,
    paymentDueAt: updatedBooking.payment_due_at,
  });
}
