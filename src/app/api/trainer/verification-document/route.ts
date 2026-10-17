import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminClient, getRequestAuthentication } from '@/app/lib/supabaseServer';
import { isOwnedVerificationDocumentPath } from '@/lib/verificationDocuments';

const BUCKET = 'verification-docs';

const documentPathSchema = z.object({
  kind: z.enum(['license', 'insurance']),
  path: z.string().trim().min(1, 'Dokumentpfad fehlt').max(512, 'Dokumentpfad ist zu lang').nullable(),
});

export async function POST(request: Request) {
  const authentication = await getRequestAuthentication(request);
  if (!authentication) {
    return NextResponse.json({ error: 'Bitte melde dich an.' }, { status: 401 });
  }
  if (authentication.role !== 'trainer') {
    return NextResponse.json({ error: 'Nur Trainer dürfen Verifizierungsdokumente verwalten.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body.' }, { status: 400 });
  }

  const parsed = documentPathSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Ungültige Eingabe.' },
      { status: 400 }
    );
  }

  const { kind, path } = parsed.data;
  const trainerId = authentication.user.id;
  const admin = getAdminClient();

  if (path) {
    if (!isOwnedVerificationDocumentPath(trainerId, kind, path)) {
      return NextResponse.json({ error: 'Ungültiger Dokumentpfad.' }, { status: 400 });
    }

    const fileName = path.slice(`${trainerId}/`.length);
    const { data: objects, error: storageError } = await admin.storage
      .from(BUCKET)
      .list(trainerId, { search: fileName, limit: 10 });

    if (storageError) {
      console.error('Verifizierungsdokument konnte nicht geprüft werden');
      return NextResponse.json({ error: 'Dokument konnte nicht geprüft werden.' }, { status: 500 });
    }
    if (!objects?.some((object) => object.name === fileName)) {
      return NextResponse.json({ error: 'Dokument wurde im geschützten Speicher nicht gefunden.' }, { status: 400 });
    }
  }

  const field = kind === 'license' ? 'license_document_path' : 'insurance_document_path';
  const { data: trainer, error } = await admin
    .from('trainers')
    .update({ [field]: path })
    .eq('id', trainerId)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('Dokumentpfad konnte nicht gespeichert werden');
    return NextResponse.json({ error: 'Dokumentpfad konnte nicht gespeichert werden.' }, { status: 500 });
  }
  if (!trainer) {
    return NextResponse.json({ error: 'Trainerprofil nicht gefunden.' }, { status: 404 });
  }

  return NextResponse.json({ path });
}
