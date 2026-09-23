import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { trainerEmail, clientName, clientEmail, slotDate, slotTime, title } = body;

    // 1. Validierung: Prüfen, ob alle Pflichtfelder da sind
    if (!trainerEmail || !clientName || !clientEmail || !slotDate || !slotTime) {
      return NextResponse.json(
        { error: 'Fehlende Pflichtparameter für den E-Mail-Versand.' },
        { status: 400 }
      );
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'VeriFit <onboarding@resend.dev>';

    // 2. E-Mail an den Trainer senden
    const trainerEmailResult = await resend.emails.send({
      from: fromEmail,
      to: [trainerEmail],
      subject: `Neue Buchungsanfrage von ${clientName}!`,
      html: `
        <div style="font-family: sans-serif; color: #333; padding: 20px; background: #f8fafc; border-radius: 10px;">
          <h2 style="color: #059669;">Neue Termin-Anfrage auf VeriFit</h2>
          <p>Du hast eine neue Buchungsanfrage erhalten:</p>
          <ul style="background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; list-style: none;">
            <li><strong>Kunde:</strong> ${clientName} (${clientEmail})</li>
            <li><strong>Termin:</strong> ${slotDate} um ${slotTime} Uhr</li>
            <li><strong>Paket/Zweck:</strong> ${title || 'Standard Training'}</li>
          </ul>
          <p>Logge dich in dein Dashboard ein, um die Anfrage zu bestätigen oder abzulehnen.</p>
        </div>
      `,
    });

    // 3. Optionale Erweiterung: Gleichzeitige Bestätigung an den Kunden
    await resend.emails.send({
      from: fromEmail,
      to: [clientEmail],
      subject: `Deine Buchungsanfrage bei VeriFit ist eingegangen!`,
      html: `
        <div style="font-family: sans-serif; color: #333; padding: 20px; background: #f8fafc; border-radius: 10px;">
          <h2 style="color: #059669;">Anfrage erfolgreich übermittelt</h2>
          <p>Hallo ${clientName},</p>
          <p>vielen Dank für deine Anfrage. Dein Wunschtermin am <strong>${slotDate} um ${slotTime} Uhr</strong> wurde an den Trainer übermittelt.</p>
          <p>Sobald der Trainer den Termin bestätigt, wirst du benachrichtigt.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, data: trainerEmailResult });
  } catch (error: any) {
    console.error('Resend Error:', error);
    return NextResponse.json({ error: error.message || 'Interner Serverfehler beim E-Mail-Versand' }, { status: 500 });
  }
}