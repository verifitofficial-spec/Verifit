/** Übersetzt Supabase-Auth-Fehlermeldungen in verständliches Deutsch. */
export function translateAuthError(message: string | null | undefined): string {
  const m = (message || '').toLowerCase();
  if (!m) return 'Es ist ein unbekannter Fehler aufgetreten. Bitte versuche es erneut.';

  if (m.includes('invalid login credentials')) return 'E-Mail oder Passwort ist falsch.';
  if (m.includes('email not confirmed')) {
    return 'Deine E-Mail-Adresse ist noch nicht bestätigt. Bitte klicke auf den Link in der Bestätigungs-E-Mail.';
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich an.';
  }
  if (m.includes('password should be at least') || m.includes('password is too short')) {
    return 'Das Passwort ist zu kurz. Bitte verwende mindestens 8 Zeichen.';
  }
  if (m.includes('weak') && m.includes('password')) {
    return 'Dieses Passwort ist zu unsicher. Bitte wähle ein stärkeres Passwort.';
  }
  if (m.includes('same password') || m.includes('different from the old password')) {
    return 'Das neue Passwort muss sich vom bisherigen unterscheiden.';
  }
  if (m.includes('rate limit') || m.includes('too many requests') || m.includes('security purposes')) {
    return 'Zu viele Versuche. Bitte warte einen Moment und versuche es dann erneut.';
  }
  if (m.includes('invalid email') || m.includes('unable to validate email')) {
    return 'Bitte gib eine gültige E-Mail-Adresse ein.';
  }
  if (m.includes('signup is disabled') || m.includes('signups not allowed')) {
    return 'Die Registrierung ist derzeit nicht möglich.';
  }
  if (m.includes('database error saving new user')) {
    return 'Dein Konto konnte nicht angelegt werden. Bitte versuche es später erneut oder kontaktiere den Support.';
  }
  if (m.includes('failed to fetch') || m.includes('network')) {
    return 'Netzwerkfehler. Bitte prüfe deine Internetverbindung und versuche es erneut.';
  }
  if (m.includes('jwt') || m.includes('session') || m.includes('token has expired') || m.includes('expired')) {
    return 'Deine Sitzung bzw. der Link ist abgelaufen. Bitte melde dich erneut an oder fordere einen neuen Link an.';
  }
  return `Es ist ein Fehler aufgetreten: ${message}`;
}
