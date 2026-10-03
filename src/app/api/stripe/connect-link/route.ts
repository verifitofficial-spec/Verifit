import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { getAdminClient, getRequestAuthentication } from '@/app/lib/supabaseServer';

export async function POST(request: Request) {
  const authentication = await getRequestAuthentication(request);
  if (!authentication || authentication.role !== 'trainer') {
    return NextResponse.json({ error: 'Nur Trainer dürfen Stripe Connect einrichten.' }, { status: 403 });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (!stripeSecretKey || !appUrl) {
    return NextResponse.json({ error: 'Stripe-Connect ist in dieser Staging-Umgebung nicht vollständig konfiguriert.' }, { status: 503 });
  }

  const admin = getAdminClient();
  const { data: trainer, error: trainerError } = await admin
    .from('trainers')
    .select('id, email, stripe_account_id')
    .eq('id', authentication.user.id)
    .maybeSingle();

  if (trainerError || !trainer) {
    return NextResponse.json({ error: 'Trainerprofil nicht gefunden.' }, { status: 404 });
  }

  const stripe = new Stripe(stripeSecretKey);
  let accountId = trainer.stripe_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'DE',
      email: trainer.email || authentication.user.email || undefined,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    });
    accountId = account.id;
    const { error: saveError } = await admin
      .from('trainers')
      .update({ stripe_account_id: accountId })
      .eq('id', authentication.user.id);
    if (saveError) return NextResponse.json({ error: 'Stripe-Konto konnte nicht gespeichert werden.' }, { status: 500 });
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    refresh_url: `${appUrl}/trainer/${authentication.user.id}/dashboard?stripe=refresh`,
    return_url: `${appUrl}/trainer/${authentication.user.id}/dashboard?stripe=return`,
  });

  return NextResponse.json({ url: link.url });
}
