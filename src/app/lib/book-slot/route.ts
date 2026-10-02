import { NextResponse } from 'next/server';
import { resend } from '@/app/lib/resend';
import { bookSlotSchema } from '@/app/lib/validation/bookingSchemas';
import { getAdminClient, getUserFromRequest } from '@/app/lib/supabaseServer';

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

async function sendMail(to: string, subject: string, html: string) {
  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to, subject, html,
    });
    if (error) console.error('Resend-Fehler:', error);
    return !error;
  } catch (err) {
    console.error('Mailversand fehlgeschlagen:', err);
    return false;
  }
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Bitte melde dich als Kunde an.' }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Ungültiger Request-Body' }, { status: 400 }); }

  const parsed = bookSlotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Ungültige Eingabe' }, { status: 400 });
  }
  const { slotId, offerId } = parsed.data;
  const admin = getAdminClient();

  // Nur Kunden-Konten dürfen buchen
  const { data: client } = await admin.from('clients').select('id, name, email').eq('id', user.id).single();
  if (!client) {
    return NextResponse.json({ error: 'Nur Kunden-Konten können Termine anfragen.' }, { status: 403 });
  }

  const { data: slot } = await admin
    .from('trainer_slots')
    .select('id, trainer_id, slot_date, slot_time, status')
    .eq('id', slotId).single();
  if (!slot || slot.status !== 'free') {
    return NextResponse.json({ error: 'Termin nicht mehr verfügbar' }, { status: 409 });
  }

  // Paket muss zum Trainer des Slots gehören (kein Vertrauen in Client-Daten)
  const { data: offer } = await admin
    .from('trainer_offers')
    .select('id, trainer_id, title, type, duration_minutes, price, is_active')
    .eq('id', offerId).single();
  if (!offer || !offer.is_active || offer.trainer_id !== slot.trainer_id) {
    return NextResponse.json({ error: 'Paket nicht verfügbar' }, { status: 400 });
  }

  const { data: trainer } = await admin
    .from('trainers').select('name, email, status').eq('id', slot.trainer_id).single();
  if (!trainer || trainer.status !== 'approved') {
    return NextResponse.json({ error: 'Trainer nicht verfügbar' }, { status: 404 });
  }

  // Atomar reservieren
  const { data: reserved, error: reserveError } = await admin
    .from('trainer_slots').update({ status: 'pending' })
    .eq('id', slotId).eq('status', 'free').select('id');
  if (reserveError) {
    console.error('Slot-Reservierung fehlgeschlagen:', reserveError.message);
    return NextResponse.json({ error: 'Buchung fehlgeschlagen' }, { status: 500 });
  }
  if (!reserved || reserved.length === 0) {
    return NextResponse.json({ error: 'Termin wurde soeben vergeben' }, { status: 409 });
  }

  const { error: insertError } = await admin.from('bookings').insert({
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
  });
  if (insertError) {
    console.error('Buchung anlegen fehlgeschlagen:', insertError.message);
    await admin.from('trainer_slots').update({ status: 'free' }).eq('id', slot.id); // Rollback
    return NextResponse.json({ error: 'Buchung fehlgeschlagen' }, { status: 500 });
  }

  const dateStr = escapeHtml(String(slot.slot_date));
  const timeStr = escapeHtml(String(slot.slot_time).slice(0, 5));
  const title = escapeHtml(offer.title);
  const safeClient = escapeHtml(client.name || client.email);
  const safeTrainer = escapeHtml(trainer.name || 'Trainer');

  const [trainerOk, clientOk] = await Promise.all([
    sendMail(
      trainer.email,
      'Neue Buchungsanfrage – VeriFit',
      `<p>Hallo ${safeTrainer},</p>
       <p>${safeClient} hat das Paket <strong>${title}</strong> für den ${dateStr} um ${timeStr} Uhr angefragt.</p>
       <p>Bitte nimm die Anfrage in deinem Dashboard an oder lehne sie ab.</p>`
    ),
    sendMail(
      client.email,
      'Deine Buchungsanfrage – VeriFit',
      `<p>Hallo ${safeClient},</p>
       <p>deine Anfrage für <strong>${title}</strong> bei ${safeTrainer} am ${dateStr} um ${timeStr} Uhr ist eingegangen.</p>
       <p>Sobald der Trainer zusagt, erhältst du Bescheid${Number(offer.price) > 0 ? ' und kannst im Kunden-Portal bezahlen' : ''}.</p>`
    ),
  ]);

  return NextResponse.json({ success: true, mailSent: trainerOk && clientOk });
}