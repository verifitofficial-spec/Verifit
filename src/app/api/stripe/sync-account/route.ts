import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { getAdminClient, getRequestAuthentication } from '@/app/lib/supabaseServer';

/**
 * Liest den Status des Stripe-Connect-Kontos direkt bei Stripe und speichert charges_enabled.
 * Funktioniert unabhängig davon, ob der Connect-Webhook (account.updated) eingerichtet ist.
 */
export async function POST(request: Request) {
  const authentication = await getRequestAuthentication(request);
  if (!authentication) {
    return NextResponse.json({ error: 'Bitte melde dich an.' }, { status: 401 });
  }
  if (authentication.role !== 'trainer') {
    return NextResponse.json({ error: 'Nur Trainer dürfen diese Aktion ausführen.' }, { status: 403 });
  }

  const admin = getAdminClient();
  const { data: trainer, error: trainerError } = await admin
    .from('trainers')
    .select('id, stripe_account_id, charges_enabled')
    .eq('id', authentication.user.id)
    .maybeSingle();

  if (trainerError || !trainer) {
    return NextResponse.json({ error: 'Trainerprofil nicht gefunden.' }, { status: 404 });
  }

  if (!trainer.stripe_account_id) {
    return NextResponse.json({ connected: false, charges_enabled: false, changed: false });
  }

  // Bereits aktiv: keine unnötigen Stripe-Aufrufe.
  if (trainer.charges_enabled) {
    return NextResponse.json({ connected: true, charges_enabled: true, changed: false });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json({ error: 'Stripe ist in dieser Umgebung nicht konfiguriert.' }, { status: 503 });
  }

  try {
    const account = await new Stripe(stripeSecretKey).accounts.retrieve(trainer.stripe_account_id);
    const chargesEnabled = Boolean(account.charges_enabled);

    if (chargesEnabled !== Boolean(trainer.charges_enabled)) {
      const { error: updateError } = await admin
        .from('trainers')
        .update({ charges_enabled: chargesEnabled })
        .eq('id', trainer.id);
      if (updateError) {
        return NextResponse.json({ error: 'Stripe-Status konnte nicht gespeichert werden.' }, { status: 500 });
      }
      return NextResponse.json({ connected: true, charges_enabled: chargesEnabled, changed: true });
    }

    return NextResponse.json({ connected: true, charges_enabled: chargesEnabled, changed: false });
  } catch (error) {
    const message = error && typeof error === 'object' && 'message' in error ? String((error as { message: unknown }).message) : 'Unbekannter Fehler';
    console.error('Stripe-Status konnte nicht abgerufen werden:', message);
    return NextResponse.json({ error: `Stripe meldet: ${message}` }, { status: 502 });
  }
}
