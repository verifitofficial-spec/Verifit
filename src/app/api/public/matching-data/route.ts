import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getPublicClient } from '@/app/lib/supabaseServer';
import { isMissingPhase3MetadataError } from '@/lib/matching';

const PUBLIC_TRAINER_COLUMNS =
  'id, name, bio, city, service_mode, specialties, target_levels, qualifications, avatar_url, instagram_url, tiktok_url, hourly_rate, availability_status';
const LEGACY_PUBLIC_TRAINER_COLUMNS =
  'id, name, bio, city, service_mode, specialties, qualifications, avatar_url, instagram_url, tiktok_url, hourly_rate, availability_status';
const MATCHING_OFFER_COLUMNS =
  'id, trainer_id, title, type, duration_minutes, price, description, service_mode, pricing_model, included_sessions';
const LEGACY_MATCHING_OFFER_COLUMNS =
  'id, trainer_id, title, type, duration_minutes, price, description';

const querySchema = z.object({ trainerId: z.string().uuid().optional() }).strict();

function errorResponse() {
  return NextResponse.json(
    { error: 'Matching-Daten konnten nicht geladen werden.' },
    { status: 500 }
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Trainerkennung.' }, { status: 400 });
  }

  const supabase = getPublicClient();

  let trainerQuery = supabase
    .from('trainers')
    .select(PUBLIC_TRAINER_COLUMNS)
    .eq('status', 'approved')
    .order('name', { ascending: true });
  let offerQuery = supabase
    .from('trainer_offers')
    .select(MATCHING_OFFER_COLUMNS)
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  if (parsed.data.trainerId) {
    trainerQuery = trainerQuery.eq('id', parsed.data.trainerId);
    offerQuery = offerQuery.eq('trainer_id', parsed.data.trainerId);
  }

  const [trainerResult, offerResult] = await Promise.all([
    trainerQuery,
    offerQuery,
  ]);

  const metadataErrors = [trainerResult.error, offerResult.error].filter(Boolean);
  if (metadataErrors.length === 0) {
    return NextResponse.json({
      trainers: trainerResult.data ?? [],
      offers: offerResult.data ?? [],
      metadataReady: true,
    });
  }

  if (!metadataErrors.every(isMissingPhase3MetadataError)) {
    console.error('Öffentliche Matching-Daten konnten nicht geladen werden.');
    return errorResponse();
  }

  let legacyTrainerQuery = supabase
      .from('trainers')
      .select(LEGACY_PUBLIC_TRAINER_COLUMNS)
      .eq('status', 'approved')
      .order('name', { ascending: true });
  let legacyOfferQuery = supabase
      .from('trainer_offers')
      .select(LEGACY_MATCHING_OFFER_COLUMNS)
      .eq('is_active', true)
      .order('created_at', { ascending: true });
  if (parsed.data.trainerId) {
    legacyTrainerQuery = legacyTrainerQuery.eq('id', parsed.data.trainerId);
    legacyOfferQuery = legacyOfferQuery.eq('trainer_id', parsed.data.trainerId);
  }

  const [legacyTrainerResult, legacyOfferResult] = await Promise.all([
    legacyTrainerQuery,
    legacyOfferQuery,
  ]);

  if (legacyTrainerResult.error || legacyOfferResult.error) {
    console.error('Öffentliche Legacy-Matching-Daten konnten nicht geladen werden.');
    return errorResponse();
  }

  return NextResponse.json({
    trainers: legacyTrainerResult.data ?? [],
    offers: legacyOfferResult.data ?? [],
    metadataReady: false,
  });
}
