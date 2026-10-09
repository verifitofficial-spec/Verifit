import { NextResponse } from 'next/server';
import { getResendClient } from '@/app/lib/resend';
import { getAdminClient, getRequestAuthentication } from '@/app/lib/supabaseServer';
import { trainerStatusSchema } from '@/app/lib/validation/adminSchemas';

function escapeHtml(value: string | null) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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

  const admin = getAdminClient();
  const { data: previous } = await admin
    .from('trainers')
    .select('status')
    .eq('id', parsed.data.trainerId)
    .maybeSingle();

  const { data, error } = await admin
    .from('trainers')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.trainerId)
    .select('id, status, name, email')
    .maybeSingle();

  if (error) {
    console.error('Trainerstatus konnte nicht aktualisiert werden');
    return NextResponse.json({ error: 'Status konnte nicht gespeichert werden.' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Trainer nicht gefunden.' }, { status: 404 });
  }

  // Mail nur bei tatsächlicher Änderung; ein Mailfehler macht die Entscheidung nicht rückgängig.
  if (data.email && previous?.status !== data.status) {
    try {
      const name = escapeHtml(data.name || 'Trainer');
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
      const approved = data.status === 'approved';
      await getResendClient().emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: data.email,
        subject: approved ? 'Dein VeriFit-Profil wurde freigeschaltet' : 'Dein VeriFit-Profil konnte nicht freigeschaltet werden',
        html: approved
          ? `<p>Hallo ${name},</p><p>dein Profil wurde geprüft und ist jetzt als <strong>verifiziert</strong> freigeschaltet. Kunden können dich ab sofort finden und buchen.</p>${appUrl ? `<p><a href="${appUrl}/trainer/login">Zum Trainer-Login</a></p>` : ''}`
          : `<p>Hallo ${name},</p><p>dein Profil konnte leider noch nicht freigeschaltet werden. Bitte prüfe deine Angaben und hochgeladenen Dokumente (Lizenz, Berufshaftpflicht) und melde dich bei uns.</p>`,
      });
    } catch {
      console.error('Statusmail an Trainer konnte nicht gesendet werden');
    }
  }

  return NextResponse.json({ trainer: { id: data.id, status: data.status } });
}
