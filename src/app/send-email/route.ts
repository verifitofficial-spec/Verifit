import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { trainerEmail, clientName, clientEmail, slotDate, slotTime, title } = await request.json();

    const data = await resend.emails.send({
      from: 'VeriFit <onboarding@resend.dev>', // Für den Start (später eigene Domain)
      to: [trainerEmail],
      subject: `Neue Buchungsanfrage von ${clientName}!`,
      html: `
        <div style="font-family: sans-serif; color: #333; padding: 20px; background: #f8fafc; border-radius: 10px;">
          <h2 style="color: #059669;">Neue Termin-Anfrage auf VeriFit</h2>
          <p>Du hast eine neue Buchungsanfrage erhalten:</p>
          <ul style="background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; list-style: none;">
            <li><strong>Kunde:</strong> ${clientName} (${clientEmail})</li>
            <li><strong>Termin:</strong> ${slotDate} um ${slotTime} Uhr</li>
            <li><strong>Paket/Zweck:</strong> ${title}</li>
          </ul>
          <p>Logge dich in dein Dashboard ein, um die Anfrage zu bestätigen oder abzulehnen.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}