import 'server-only';

import { Resend } from 'resend';

export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY ist nicht konfiguriert.');
  }

  return new Resend(apiKey);
}
