import { NextResponse } from 'next/server';
import { getAdminClient, getRequestAuthentication } from '@/app/lib/supabaseServer';

type AdminClient = ReturnType<typeof getAdminClient>;

async function removeFolder(admin: AdminClient, bucket: string, folder: string): Promise<boolean> {
  const { data: files, error: listError } = await admin.storage.from(bucket).list(folder, { limit: 1000 });
  if (listError) return false;
  if (!files || files.length === 0) return true;
  const { error: removeError } = await admin.storage.from(bucket).remove(files.map((file) => `${folder}/${file.name}`));
  return !removeError;
}

export async function POST(req: Request) {
  const authentication = await getRequestAuthentication(req);
  if (!authentication) {
    return NextResponse.json({ error: 'Bitte melde dich an.' }, { status: 401 });
  }
  if (authentication.role !== 'client' && authentication.role !== 'trainer') {
    return NextResponse.json({ error: 'Dieses Konto kann nicht selbst gelöscht werden.' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || (body as { confirm?: unknown }).confirm !== 'LÖSCHEN') {
    return NextResponse.json({ error: 'Bitte bestätige die Löschung.' }, { status: 400 });
  }

  const admin = getAdminClient();
  const userId = authentication.user.id;
  const role = authentication.role;

  // Kontaktanfragen enthalten personenbezogene Momentaufnahmen. Solange dafür
  // kein freigegebenes Lösch-/Aufbewahrungskonzept vorliegt, muss die Datenbank
  // die Löschung vor jeder destruktiven Storage- oder Auth-Aktion freigeben.
  const { error: deletionCheckError } = await admin.rpc('assert_user_deletion_allowed', { p_user_id: userId });
  if (deletionCheckError) {
    console.error('Kontolöschung wurde durch die Datenbank-Vorprüfung abgelehnt');
    const retentionDecisionRequired = deletionCheckError.message.includes(
      'ACCOUNT_DELETION_REQUIRES_INQUIRY_RETENTION_DECISION'
    );
    return NextResponse.json(
      {
        error: retentionDecisionRequired
          ? 'Das Konto kann derzeit nicht automatisch gelöscht werden, weil Kontaktanfragen vorhanden sind. Bitte kontaktiere den Support.'
          : 'Das Konto konnte nicht für die Löschung geprüft werden.',
      },
      { status: retentionDecisionRequired ? 409 : 500 }
    );
  }

  if (role === 'trainer') {
    const avatarsOk = await removeFolder(admin, 'avatars', userId);
    const docsOk = await removeFolder(admin, 'verification-docs', userId);
    if (!avatarsOk || !docsOk) {
      console.error('Storage-Dateien konnten bei der Kontolöschung nicht entfernt werden');
      return NextResponse.json({ error: 'Hochgeladene Dokumente konnten nicht gelöscht werden.' }, { status: 500 });
    }
  }

  // Die RPC ist die atomare Datenbank-Löschgrenze für alle freigegebenen MVP-Datensätze.
  // Bei einem Fehler bleibt der Auth-Nutzer bestehen, damit keine verwaisten
  // personenbezogenen Datensätze unbemerkt zurückbleiben.
  const { error: deleteDataError } = await admin.rpc('delete_user_data', { p_user_id: userId });
  if (deleteDataError) {
    console.error('Nutzerdaten konnten nicht gelöscht werden:', deleteDataError.message);
    return NextResponse.json({ error: 'Deine Daten konnten nicht gelöscht werden.' }, { status: 500 });
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
  if (deleteUserError) {
    console.error('Auth-Nutzer konnte nicht gelöscht werden:', deleteUserError.message);
    return NextResponse.json(
      { error: 'Deine Daten wurden gelöscht, das Login konnte aber nicht entfernt werden. Bitte kontaktiere den Support.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
