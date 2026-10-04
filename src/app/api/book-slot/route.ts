import { NextResponse } from 'next/server';
import { getResendClient } from '@/app/lib/resend';
import { getAdminClient, getRequestAuthentication } from '@/app/lib/supabaseServer';
import { bookSlotSchema } from '@/app/lib/validation/bookingSchemas';

function escapeHtml(value: string | number | null) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendMail(to: string, subject: string, html: string) {
  try {
    const { error } = await getResendClient().emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Resend-Fehler beim Buchungsversand');
    }

    return !error;
  } catch {
    console.error('Mailversand für Buchungsanfrage fehlgeschlagen');
    return false;
  }
}

export async function POST(req: Request) {
  const authentication = await getRequestAuthentication(req);
  if (!authentication) {
    return NextResponse.json({ error: 'Bitte melde dich an.' }, { status: 401 });
  }
  if (authentication.role !== 'client') {
    return NextResponse.json(
      { error: 'Nur Kunden-Konten können Termine anfragen.' },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 });
  }

  const parsed = bookSlotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Ungültige Eingabe' },
      { status: 400 }
    );
  }

  const { slotId, offerId } = parsed.data;
  const admin = getAdminClient();

  const { data: client, error: clientError } = await admin
    .from('clients')
    .select('id, name, email')
    .eq('id', authentication.user.id)
    .maybeSingle();

  if (clientError || !client) {
    return NextResponse.json(
      { error: 'Kundenprofil konnte nicht gefunden werden.' },
      { status: 403 }
    );
  }

  const { data: slot, error: slotError } = await admin
    .from('trainer_slots')
    .select('id, trainer_id, slot_date, slot_time, status')
    .eq('id', slotId)
    .maybeSingle();

  if (slotError) {
    console.error('Slot konnte nicht geladen werden');
    return NextResponse.json({ error: 'Buchung fehlgeschlagen.' }, { status: 500 });
  }
  if (!slot || slot.status !== 'free') {
    return NextResponse.json({ error: 'Termin nicht mehr verfügbar.' }, { status: 409 });
  }

  const { data: offer, error: offerError } = await admin
    .from('trainer_offers')
    .select('id, trainer_id, title, type, duration_minutes, price, is_active')
    .eq('id', offerId)
    .maybeSingle();

  if (offerError || !offer || !offer.is_active || offer.trainer_id !== slot.trainer_id) {
    return NextResponse.json({ error: 'Paket nicht verfügbar.' }, { status: 400 });
  }

  const { data: trainer, error: trainerError } = await admin
    .from('trainers')
    .select('name, email, status, stripe_account_id, charges_enabled')
    .eq('id', slot.trainer_id)
    .maybeSingle();

  if (trainerError || !trainer || trainer.status !== 'approved') {
    return NextResponse.json({ error: 'Trainer nicht verfügbar.' }, { status: 404 });
  }
  if (Number(offer.price) > 0 && (!trainer.stripe_account_id || !trainer.charges_enabled)) {
    return NextResponse.json({ error: 'Dieser Trainer kann derzeit noch keine bezahlten Termine annehmen.' }, { status: 409 });
  }

  const { data: reservedSlots, error: reservationError } = await admin
    .from('trainer_slots')
    .update({ status: 'pending' })
    .eq('id', slot.id)
    .eq('status', 'free')
    .select('id');

  if (reservationError) {
    console.error('Slot-Reservierung fehlgeschlagen');
    return NextResponse.json({ error: 'Buchung fehlgeschlagen.' }, { status: 500 });
  }
  if (!reservedSlots || reservedSlots.length === 0) {
    return NextResponse.json({ error: 'Termin wurde soeben vergeben.' }, { status: 409 });
  }

  const { data: booking, error: bookingError } = await admin
    .from('bookings')
    .insert({
      slot_id: slot.id,
      trainer_id: slot.trainer_id,
      client_id: client.id,
      offer_id: offer.id,
      offer_title: offer.title,
      offer_type: offer.type,
      duration_minutes: offer.duration_minutes,
      price: offer.price,
      slot_date: slot.slot_date,
      slot_time: slot.slot_time,
      client_name: client.name || client.email,
      client_email: client.email,
      status: 'pending',
    })
    .select('id')
    .single();

  if (bookingError || !booking) {
    console.error('Buchung konnte nicht angelegt werden');
    await admin
      .from('trainer_slots')
      .update({ status: 'free' })
      .eq('id', slot.id)
      .eq('status', 'pending');
    return NextResponse.json({ error: 'Buchung fehlgeschlagen.' }, { status: 500 });
  }

  const dateText = escapeHtml(slot.slot_date);
  const timeText = escapeHtml(String(slot.slot_time).slice(0, 5));
  const titleText = escapeHtml(offer.title);
  const clientText = escapeHtml(client.name || client.email);
  const trainerText = escapeHtml(trainer.name || 'Trainer');

  const [trainerMailSent, clientMailSent] = await Promise.all([
    sendMail(
      trainer.email,
      'Neue Buchungsanfrage – VeriFit',
      `<p>Hallo ${trainerText},</p>
       <p>${clientText} hat das Paket <strong>${titleText}</strong> für den ${dateText} um ${timeText} Uhr angefragt.</p>
       <p>Bitte nimm die Anfrage in deinem Dashboard an oder lehne sie ab.</p>`
    ),
    sendMail(
      client.email,
      'Deine Buchungsanfrage – VeriFit',
      `<p>Hallo ${clientText},</p>
       <p>Deine Anfrage für <strong>${titleText}</strong> bei ${trainerText} am ${dateText} um ${timeText} Uhr ist eingegangen.</p>
       <p>Sobald der Trainer zusagt, erhältst du Bescheid${Number(offer.price) > 0 ? ' und kannst im Kunden-Portal bezahlen' : ''}.</p>`
    ),
  ]);

  return NextResponse.json({
    success: true,
    bookingId: booking.id,
    mailSent: trainerMailSent && clientMailSent,
  });
}
