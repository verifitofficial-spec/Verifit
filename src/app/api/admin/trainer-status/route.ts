import { NextResponse } from 'next/server';
import { getAdminClient, getRequestAuthentication } from '@/app/lib/supabaseServer';
import { trainerStatusSchema } from '@/app/lib/validation/adminSchemas';

export async function POST(req: Request) {
  const authentication = await getRequestAuthentication(req);
  if (!authentication) {
    return NextResponse.json({ error: 'Bitte melde dich an.' }, { status: 401 });
  }
  if (authentication.role !== 'admin') {
    return NextResponse.json({ error: 'Keine Berechtigung.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body.' }, { status: 400 });
  }

  const parsed = trainerStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Ungültige Eingabe.' },
      { status: 400 }
    );
  }

  const { data, error } = await getAdminClient()
    .from('trainers')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.trainerId)
    .select('id, status')
    .maybeSingle();

  if (error) {
    console.error('Trainerstatus konnte nicht aktualisiert werden');
    return NextResponse.json({ error: 'Status konnte nicht gespeichert werden.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Trainer nicht gefunden.' }, { status: 404 });
  }

  return NextResponse.json({ trainer: data });
}
