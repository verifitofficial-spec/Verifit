'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';
import { loginSchema } from '@/app/lib/validation/authSchemas';
import { FormFieldError } from '@/components/FormError';
import { translateAuthError } from '@/lib/authErrors';
import AuthShell from '@/components/AuthShell';

export default function TrainerLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [canResend, setCanResend] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');
    setCanResend(false);
    setFieldErrors({});

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errors: { email?: string; password?: string } = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as 'email' | 'password';
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    });

    if (error) {
      setErrorMessage(translateAuthError(error.message));
      setCanResend(error.message.toLowerCase().includes('email not confirmed'));
      setLoading(false);
      return;
    }

    const user = data.user;
    if (!user) {
      setErrorMessage('Benutzer konnte nicht gefunden werden.');
      setLoading(false);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profileData) {
      await supabase.auth.signOut();
      setErrorMessage('Dein Profil konnte nicht geladen werden. Bitte versuche es erneut.');
      setLoading(false);
      return;
    }

    if (profileData.role !== 'trainer') {
      await supabase.auth.signOut();
      setErrorMessage(
        profileData.role === 'client'
          ? 'Dieser Account ist ein Kunden-Konto. Bitte nutze den Kunden-Login.'
          : 'Dieser Account ist kein Trainer-Konto.'
      );
      setLoading(false);
      return;
    }

    // Das Trainerprofil ist über die unveränderliche Auth-ID verknüpft.
    const { data: trainerData } = await supabase.from('trainers').select('id').eq('id', user.id).maybeSingle();

    if (!trainerData) {
      await supabase.auth.signOut();
      setErrorMessage('Zu diesem Account wurde kein Trainerprofil gefunden. Bitte kontaktiere den Support.');
      setLoading(false);
      return;
    }

    router.push(`/trainer/${trainerData.id}/dashboard`);
  }

  async function handleResend() {
    setErrorMessage('');
    setInfoMessage('');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/trainer/login` },
    });
    if (error) setErrorMessage(translateAuthError(error.message));
    else setInfoMessage('Wir haben dir eine neue Bestätigungs-E-Mail geschickt.');
  }

  return (
    <AuthShell eyebrow="Trainerbereich" title="Zurück in dein Coaching." description="Verwalte dein Profil, deine Verfügbarkeit und die Zusammenarbeit mit deinen Kunden.">

          {errorMessage && (
            <div className="mb-4 p-3 bg-danger-soft border border-danger-line rounded-xl text-danger text-xs space-y-2">
              <p>{errorMessage}</p>
              {canResend && (
                <button type="button" onClick={handleResend} className="underline text-danger cursor-pointer">
                  Bestätigungs-E-Mail erneut senden
                </button>
              )}
            </div>
          )}
          {infoMessage && (
            <div className="mb-4 p-3 bg-accent-soft border border-accent/35 rounded-xl text-accent text-xs">
              {infoMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <div>
              <label htmlFor="trainer-login-email" className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
                E-Mail-Adresse
              </label>
              <input
                id="trainer-login-email"
                type="email"
                aria-describedby={fieldErrors.email ? 'trainer-login-email-error' : undefined}
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full bg-canvas border rounded-xl px-4 py-3 text-sm text-ink focus:outline-none transition ${
                  fieldErrors.email ? 'border-danger-line focus:border-danger-line' : 'border-line focus:border-accent'
                }`}
              />
              <FormFieldError id="trainer-login-email-error" message={fieldErrors.email} />
            </div>

            <div>
              <label htmlFor="trainer-login-password" className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
                Passwort
              </label>
              <input
                id="trainer-login-password"
                type="password"
                aria-describedby={fieldErrors.password ? 'trainer-login-password-error' : undefined}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full bg-canvas border rounded-xl px-4 py-3 text-sm text-ink focus:outline-none transition ${
                  fieldErrors.password ? 'border-danger-line focus:border-danger-line' : 'border-line focus:border-accent'
                }`}
              />
              <FormFieldError id="trainer-login-password-error" message={fieldErrors.password} />
              <div className="mt-2 flex justify-end">
                <Link href="/forgot-password" className="inline-flex min-h-11 items-center text-xs text-ink-muted transition hover:text-accent">
                  Passwort vergessen?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-strong text-primary-foreground font-bold py-3 rounded-xl text-sm transition shadow-lg shadow-none cursor-pointer mt-2 disabled:opacity-60"
            >
              {loading ? 'Logge ein...' : 'Anmelden'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-ink-muted">
            Noch kein Konto?{' '}
            <Link href="/trainer/register" className="text-accent hover:underline">
              Jetzt registrieren
            </Link>
          </div>
    </AuthShell>
  );
}
