import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getResendClient } from '@/app/lib/resend';
import { getAdminClient } from '@/app/lib/supabaseServer';

function escapeHtml(value: string | number | null) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function markSlotAsBooked(admin: SupabaseClient, slotId: string | null) {
  if (!slotId) return false;

  const { data: updatedSlots, error: updateError } = await admin
    .from('trainer_slots')
    .update({ status: 'booked' })
    .eq('id', slotId)
    .eq('status', 'pending')
    .select('id');

  if (updateError) return false;
  if (updatedSlots && updatedSlots.length > 0) return true;

  const { data: slot, error: slotError } = await admin
    .from('trainer_slots')
    .select('status')
    .eq('id', slotId)
    .maybeSingle();

  return !slotError && slot?.status === 'booked';
}

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json({ error: 'Webhook nicht konfiguriert.' }, { status: 400 });
  }
  const stripe = new Stripe(stripeSecretKey);
  const admin = getAdminClient();
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json({ error: 'Webhook nicht konfiguriert.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    console.error('Webhook-Signaturprüfung fehlgeschlagen');
    return NextResponse.json({ error: 'Ungültige Signatur.' }, { status: 400 });
  }

  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account;
    const { error } = await admin
      .from('trainers')
      .update({ charges_enabled: account.charges_enabled })
      .eq('stripe_account_id', account.id);
    if (error) console.error('Stripe-Connect-Status konnte nicht gespeichert werden');
    return NextResponse.json({ received: true });
  }

  if (
    event.type === 'checkout.session.expired' ||
    event.type === 'checkout.session.async_payment_failed'
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;
    if (bookingId) {
      const { data: expiredBooking, error: expiryError } = await admin
        .from('bookings')
        .update({ status: 'expired' })
        .eq('id', bookingId)
        .eq('status', 'accepted')
        .select('slot_id')
        .maybeSingle();
      if (expiryError) console.error('Buchung konnte nach Stripe-Fehler nicht ablaufen');
      if (expiredBooking?.slot_id) {
        await admin.from('trainer_slots').update({ status: 'free' }).eq('id', expiredBooking.slot_id).eq('status', 'pending');
      }
    }
    return NextResponse.json({ received: true });
  }

  if (
    event.type !== 'checkout.session.completed' &&
    event.type !== 'checkout.session.async_payment_succeeded'
  ) {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const bookingId = session.metadata?.bookingId;
  if (session.payment_status !== 'paid' || !bookingId) {
    return NextResponse.json({ received: true });
  }

  const { data: confirmedBooking, error: bookingError } = await admin
    .from('bookings')
    .update({
      status: 'confirmed',
      paid_at: new Date().toISOString(),
      stripe_session_id: session.id,
      stripe_payment_intent_id:
        typeof session.payment_intent === 'string' ? session.payment_intent : null,
    })
    .eq('id', bookingId)
    .eq('status', 'accepted')
    .not('payment_due_at', 'is', null)
    .gte('payment_due_at', new Date().toISOString())
    .select('id, slot_id, trainer_id, client_email, offer_title, slot_date, slot_time')
    .maybeSingle();

  if (bookingError) {
    console.error('Buchung konnte im Webhook nicht bestätigt werden');
    return NextResponse.json({ error: 'Buchung konnte nicht bestätigt werden.' }, { status: 500 });
  }

  if (!confirmedBooking) {
    const { data: existingBooking, error: existingBookingError } = await admin
      .from('bookings')
      .select('status, stripe_session_id, slot_id')
      .eq('id', bookingId)
      .maybeSingle();

    if (existingBookingError) {
      console.error('Bestehende Buchung konnte im Webhook nicht geladen werden');
      return NextResponse.json({ error: 'Buchung konnte nicht geprüft werden.' }, { status: 500 });
    }

    if (
      !existingBooking ||
      existingBooking.status !== 'confirmed' ||
      existingBooking.stripe_session_id !== session.id
    ) {
      return NextResponse.json({ received: true });
    }

    const slotBooked = await markSlotAsBooked(admin, existingBooking.slot_id);
    if (!slotBooked) {
      console.error('Slot konnte für bereits bestätigte Buchung nicht finalisiert werden');
      return NextResponse.json({ error: 'Slot konnte nicht finalisiert werden.' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
  }

  const slotBooked = await markSlotAsBooked(admin, confirmedBooking.slot_id);
  if (!slotBooked) {
    console.error('Slot konnte nach Zahlung nicht auf gebucht gesetzt werden');
    return NextResponse.json({ error: 'Slot konnte nicht finalisiert werden.' }, { status: 500 });
  }

  const { data: trainer, error: trainerError } = await admin
    .from('trainers')
    .select('name, email')
    .eq('id', confirmedBooking.trainer_id)
    .maybeSingle();

  if (trainerError) {
    console.error('Trainer konnte für Zahlungsbestätigung nicht geladen werden');
  }

  const offerTitle = escapeHtml(confirmedBooking.offer_title || 'Trainingseinheit');
  const dateText = escapeHtml(confirmedBooking.slot_date);
  const timeText = escapeHtml(String(confirmedBooking.slot_time).slice(0, 5));
  try {
    const resend = getResendClient();
    const emailJobs: Promise<unknown>[] = [];

    if (confirmedBooking.client_email) {
      emailJobs.push(
        resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
          to: confirmedBooking.client_email,
          subject: 'Buchungsbestätigung – VeriFit',
          html: `<p>Vielen Dank! Dein Termin <strong>${offerTitle}</strong> am ${dateText} um ${timeText} Uhr ist bezahlt und fest reserviert.</p>`,
        })
      );
    }

    if (trainer?.email) {
      emailJobs.push(
        resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
          to: trainer.email,
          subject: 'Zahlung eingegangen – VeriFit',
          html: `<p>Hallo ${escapeHtml(trainer.name || 'Trainer')},</p><p>Die Zahlung für <strong>${offerTitle}</strong> am ${dateText} um ${timeText} Uhr ist eingegangen. Der Termin ist verbindlich gebucht.</p>`,
        })
      );
    }

    if (emailJobs.length > 0) {
      await Promise.all(emailJobs);
    }
  } catch {
    console.error('Mindestens eine Zahlungsbestätigung konnte nicht versendet werden');
  }

  return NextResponse.json({ received: true });
}
