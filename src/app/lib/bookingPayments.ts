import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { getResendClient } from '@/app/lib/resend';

export type FinalizeResult = 'confirmed' | 'already' | 'ignored' | 'error';

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

/**
 * Bestätigt eine bezahlte Buchung (accepted -> confirmed) und bucht den Slot.
 * Wird vom Stripe-Webhook UND von /api/checkout/confirm genutzt; idempotent.
 * E-Mails gehen nur beim tatsächlichen Statuswechsel raus.
 */
export async function finalizePaidBooking(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session
): Promise<FinalizeResult> {
  const bookingId = session.metadata?.bookingId;
  if (session.payment_status !== 'paid' || !bookingId) return 'ignored';

  const { data: confirmedBooking, error: bookingError } = await admin
    .from('bookings')
    .update({
      status: 'confirmed',
      paid_at: new Date().toISOString(),
      stripe_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
    })
    .eq('id', bookingId)
    .eq('status', 'accepted')
    .not('payment_due_at', 'is', null)
    .gte('payment_due_at', new Date().toISOString())
    .select('id, slot_id, trainer_id, client_email, offer_title, slot_date, slot_time')
    .maybeSingle();

  if (bookingError) {
    console.error('Buchung konnte nicht bestätigt werden');
    return 'error';
  }

  if (!confirmedBooking) {
    const { data: existing, error: existingError } = await admin
      .from('bookings')
      .select('status, stripe_session_id, slot_id')
      .eq('id', bookingId)
      .maybeSingle();

    if (existingError) {
      console.error('Bestehende Buchung konnte nicht geladen werden');
      return 'error';
    }
    if (!existing || existing.status !== 'confirmed' || existing.stripe_session_id !== session.id) {
      return 'ignored';
    }
    const booked = await markSlotAsBooked(admin, existing.slot_id);
    if (!booked) {
      console.error('Slot konnte für bereits bestätigte Buchung nicht finalisiert werden');
      return 'error';
    }
    return 'already';
  }

  const slotBooked = await markSlotAsBooked(admin, confirmedBooking.slot_id);
  if (!slotBooked) {
    console.error('Slot konnte nach Zahlung nicht auf gebucht gesetzt werden');
    return 'error';
  }

  const { data: trainer } = await admin
    .from('trainers')
    .select('name, email')
    .eq('id', confirmedBooking.trainer_id)
    .maybeSingle();

  const offerTitle = escapeHtml(confirmedBooking.offer_title || 'Trainingseinheit');
  const dateText = escapeHtml(confirmedBooking.slot_date);
  const timeText = escapeHtml(String(confirmedBooking.slot_time).slice(0, 5));

  try {
    const resend = getResendClient();
    const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const jobs: Promise<unknown>[] = [];

    if (confirmedBooking.client_email) {
      jobs.push(
        resend.emails.send({
          from,
          to: confirmedBooking.client_email,
          subject: 'Buchungsbestätigung – VeriFit',
          html: `<p>Vielen Dank! Dein Termin <strong>${offerTitle}</strong> am ${dateText} um ${timeText} Uhr ist bezahlt und fest reserviert.</p>`,
        })
      );
    }
    if (trainer?.email) {
      jobs.push(
        resend.emails.send({
          from,
          to: trainer.email,
          subject: 'Zahlung eingegangen – VeriFit',
          html: `<p>Hallo ${escapeHtml(trainer.name || 'Trainer')},</p><p>Die Zahlung für <strong>${offerTitle}</strong> am ${dateText} um ${timeText} Uhr ist eingegangen. Der Termin ist verbindlich gebucht.</p>`,
        })
      );
    }
    if (jobs.length > 0) await Promise.all(jobs);
  } catch {
    console.error('Mindestens eine Zahlungsbestätigung konnte nicht versendet werden');
  }

  return 'confirmed';
}
