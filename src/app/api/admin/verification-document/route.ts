import { NextResponse } from 'next/server';
import { getAdminClient, getRequestAuthentication } from '@/app/lib/supabaseServer';
import { verificationDocumentSchema } from '@/app/lib/validation/adminSchemas';

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

  const parsed = verificationDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Ungültige Eingabe.' },
      { status: 400 }
    );
  }

  const admin = getAdminClient();
  const { data: licenseOwner, error: licenseError } = await admin
    .from('trainers')
    .select('id')
    .eq('license_document_path', parsed.data.path)
    .maybeSingle();

  if (licenseError) {
    console.error('Lizenzdokument konnte nicht geprüft werden');
    return NextResponse.json({ error: 'Dokument konnte nicht geladen werden.' }, { status: 500 });
  }

  let documentOwner = licenseOwner;
  if (!documentOwner) {
    const { data: insuranceOwner, error: insuranceError } = await admin
      .from('trainers')
      .select('id')
      .eq('insurance_document_path', parsed.data.path)
      .maybeSingle();

    if (insuranceError) {
      console.error('Versicherungsdokument konnte nicht geprüft werden');
      return NextResponse.json({ error: 'Dokument konnte nicht geladen werden.' }, { status: 500 });
    }

    documentOwner = insuranceOwner;
  }

  if (!documentOwner) {
    return NextResponse.json({ error: 'Dokument nicht gefunden.' }, { status: 404 });
  }

  const { data, error } = await admin.storage
    .from('verification-docs')
    .createSignedUrl(parsed.data.path, 60);

  if (error || !data) {
    console.error('Signierte Dokument-URL konnte nicht erstellt werden');
    return NextResponse.json({ error: 'Dokument konnte nicht geladen werden.' }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl });
}
