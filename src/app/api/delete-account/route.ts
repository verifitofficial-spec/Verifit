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
  const column = role === 'client' ? 'client_id' : 'trainer_id';
  const today = new Date().toISOString().slice(0, 10);

  const { data: bookings, error: bookingsError } = await admin
    .from('bookings')
    .select('id, slot_id, status, price, slot_date')
    .eq(column, userId)
    .in('status', ['pending', 'accepted', 'confirmed']);

  if (bookingsError) {
    console.error('Buchungen für Kontolöschung konnten nicht geladen werden');
    return NextResponse.json({ error: 'Das Konto konnte nicht gelöscht werden.' }, { status: 500 });
  }

  // Bezahlte, zukünftige Termine müssen zuerst regulär storniert werden (Refund-Regeln).
  const blocking = (bookings ?? []).filter(
    (b) => b.status === 'confirmed' && Number(b.price) > 0 && String(b.slot_date) >= today
  );
  if (blocking.length > 0) {
    return NextResponse.json(
      {
        error:
          'Es gibt noch bezahlte, bevorstehende Termine. Bitte storniere diese zuerst (Rückerstattung gemäß Stornoregeln) und lösche dein Konto danach.',
      },
      { status: 409 }
    );
  }

  // Offene Anfragen, unbezahlte Zusagen und zukünftige kostenlose Termine werden storniert.
  const toCancel = (bookings ?? []).filter(
    (b) => b.status === 'pending' || b.status === 'accepted' || String(b.slot_date) >= today
  );
  if (toCancel.length > 0) {
    const { error: cancelError } = await admin
      .from('bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .in('id', toCancel.map((b) => b.id));
    if (cancelError) {
      console.error('Buchungen konnten vor der Kontolöschung nicht storniert werden');
      return NextResponse.json({ error: 'Offene Buchungen konnten nicht storniert werden.' }, { status: 500 });
    }
    const slotIds = toCancel.map((b) => b.slot_id).filter((id): id is string => Boolean(id));
    if (slotIds.length > 0) {
      await admin.from('trainer_slots').update({ status: 'free' }).in('id', slotIds).in('status', ['pending', 'booked']);
    }
  }

  if (role === 'trainer') {
    const avatarsOk = await removeFolder(admin, 'avatars', userId);
    const docsOk = await removeFolder(admin, 'verification-docs', userId);
    if (!avatarsOk || !docsOk) {
      console.error('Storage-Dateien konnten bei der Kontolöschung nicht entfernt werden');
      return NextResponse.json({ error: 'Hochgeladene Dokumente konnten nicht gelöscht werden.' }, { status: 500 });
    }
  }

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
