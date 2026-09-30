import { NextResponse } from 'next/server';
import { resend } from '@/app/lib/resend';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Hilfsfunktion gegen HTML-Injection
function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(req: Request) {
  try {
    // 1. Auth-Check: Nur eingeloggte Nutzer dürfen Mails senden
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const body = await req.json();
    const { to, clientName, subject, message } = body;

    if (!to || !clientName) {
      return NextResponse.json({ error: 'Fehlende Parameter (to oder clientName)' }, { status: 400 });
    }

    // 2. HTML-Injection verhindern (Inputs bereinigen)
    const safeClientName = escapeHtml(clientName);
    const safeMessage = message ? escapeHtml(message) : '';

    // 3. E-Mail versenden
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to,
      subject: subject || 'Nachricht von VeriFit',
      html: `<p>Hallo ${safeClientName},</p><p>${safeMessage}</p>`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Mail-API Fehler:', error);
    return NextResponse.json({ error: error.message || 'Interner Serverfehler' }, { status: 500 });
  }
}