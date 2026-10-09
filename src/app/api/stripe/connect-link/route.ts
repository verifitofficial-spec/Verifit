import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { getAdminClient, getRequestAuthentication } from '@/app/lib/supabaseServer';

function resolveAppUrl(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, '');
  return new URL(request.url).origin;
}

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return 'Unbekannter Fehler';
}

function errorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error && typeof (error as { code: unknown }).code === 'string') {
    return (error as { code: string }).code;
  }
  return undefined;
}

export async function POST(request: Request) {
  const authentication = await getRequestAuthentication(request);
  if (!authentication) {
    return NextResponse.json({ error: 'Bitte melde dich an.' }, { status: 401 });
  }
  if (authentication.role !== 'trainer') {
    return NextResponse.json({ error: 'Nur Trainer dürfen Stripe Connect einrichten.' }, { status: 403 });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: 'Stripe ist in dieser Umgebung nicht konfiguriert (STRIPE_SECRET_KEY fehlt).' },
      { status: 503 }
    );
  }

  const admin = getAdminClient();
  const { data: trainer, error: trainerError } = await admin
    .from('trainers')
    .select('id, email, name, stripe_account_id')
    .eq('id', authentication.user.id)
    .maybeSingle();

  if (trainerError || !trainer) {
    return NextResponse.json({ error: 'Trainerprofil nicht gefunden.' }, { status: 404 });
  }

  const stripe = new Stripe(stripeSecretKey);
  const appUrl = resolveAppUrl(request);

  try {
    let accountId: string | null = trainer.stripe_account_id;

    // Ein gespeichertes Konto, das bei Stripe nicht mehr existiert, wird neu angelegt.
    if (accountId) {
      try {
        await stripe.accounts.retrieve(accountId);
      } catch (error) {
        if (errorCode(error) === 'resource_missing' || errorMessage(error).toLowerCase().includes('no such account')) {
          accountId = null;
        } else {
          throw error;
        }
      }
    }

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'DE',
        email: trainer.email || authentication.user.email || undefined,
        business_type: 'individual',
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        metadata: { verifit_trainer_id: trainer.id },
      });
      accountId = account.id;

      const { error: saveError } = await admin
        .from('trainers')
        .update({ stripe_account_id: accountId, charges_enabled: false })
        .eq('id', trainer.id);
      if (saveError) {
        return NextResponse.json({ error: 'Stripe-Konto konnte nicht gespeichert werden.' }, { status: 500 });
      }
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      type: 'account_onboarding',
      refresh_url: `${appUrl}/trainer/${trainer.id}/dashboard?stripe=refresh`,
      return_url: `${appUrl}/trainer/${trainer.id}/dashboard?stripe=return`,
    });

    return NextResponse.json({ url: link.url });
  } catch (error) {
    console.error('Stripe-Connect-Onboarding fehlgeschlagen:', errorMessage(error));
    return NextResponse.json(
      { error: `Stripe meldet: ${errorMessage(error)}` },
      { status: 502 }
    );
  }
}
