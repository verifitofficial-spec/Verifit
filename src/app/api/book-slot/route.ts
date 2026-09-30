import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resend } from '@/app/lib/resend';
import { bookSlotSchema } from '@/app/lib/validation/bookingSchemas';

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendMail(to: string, subject: string, html: string) {
  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to,
      subject,
      html,
    });
    if (error) console.error('Resend-Fehler:', error);
    return !error;
  } catch (err) {
    console.error('Mailversand fehlgeschlagen:', err);
    return false;
  }
}

export async function POST(req: Request) {
  // Initialisierung in der Funktion (konsistent zu checkout/webhook, vermeidet Build-Fehler)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

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
  const { slotId, clientName, clientEmail } = parsed.data;

  // 1. Slot prüfen (serverseitig, kein Vertrauen in Client-Daten)
  const { data: slot } = await supabaseAdmin
    .from('trainer_slots')
    .select('id, trainer_id, title, price, slot_date, slot_time, status')
    .eq('id', slotId)
    .single();

  if (!slot || slot.status !== 'free') {
    return NextResponse.json({ error: 'Termin nicht mehr verfügbar' }, { status: 409 });
  }
  if (slot.price && Number(slot.price) > 0) {
    return NextResponse.json(
      { error: 'Kostenpflichtige Termine bitte über den Checkout buchen' },
      { status: 400 }
    );
  }

  // 2. Trainer laden (E-Mail kommt aus der DB, nicht vom Client) und Freigabe prüfen
  const { data: trainer } = await supabaseAdmin
    .from('trainers')
    .select('name, email, status')
    .eq('id', slot.trainer_id)
    .single();

  if (!trainer || trainer.status !== 'approved') {
    return NextResponse.json({ error: 'Trainer nicht verfügbar' }, { status: 404 });
  }

  // 3. Atomar reservieren: nur wenn der Slot noch 'free' ist
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('trainer_slots')
    .update({ status: 'pending', client_name: clientName, client_email: clientEmail })
    .eq('id', slotId)
    .eq('status', 'free')
    .select('id');

  if (updateError) {
    console.error('Slot-Update fehlgeschlagen:', updateError.message);
    return NextResponse.json({ error: 'Buchung fehlgeschlagen' }, { status: 500 });
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: 'Termin wurde soeben vergeben' }, { status: 409 });
  }

  // 4. E-Mails (Fehler hier brechen die Buchung NICHT ab)
  const dateStr = escapeHtml(String(slot.slot_date));
  const timeStr = escapeHtml(slot.slot_time ? String(slot.slot_time).slice(0, 5) : '--:--');
  const title = escapeHtml(slot.title || 'Trainingseinheit');
  const safeClient = escapeHtml(clientName);
  const safeClientMail = escapeHtml(clientEmail);
  const safeTrainer = escapeHtml(trainer.name || 'Trainer');

  const [trainerMailOk, clientMailOk] = await Promise.all([
    sendMail(
      trainer.email,
      'Neue Buchungsanfrage – VeriFit',
      `<p>Hallo ${safeTrainer},</p>
       <p>${safeClient} (${safeClientMail}) hat eine Anfrage für <strong>${title}</strong> gestellt:</p>
       <p>${dateStr}, ${timeStr} Uhr</p>
       <p>Bitte bestätige oder lehne die Anfrage in deinem Dashboard ab.</p>`
    ),
    sendMail(
      clientEmail,
      'Deine Buchungsanfrage – VeriFit',
      `<p>Hallo ${safeClient},</p>
       <p>deine Anfrage für <strong>${title}</strong> bei ${safeTrainer} am ${dateStr} um ${timeStr} Uhr ist eingegangen.</p>
       <p>Du erhältst Bescheid, sobald der Trainer antwortet.</p>`
    ),
  ]);

  return NextResponse.json({ success: true, mailSent: trainerMailOk && clientMailOk });
}