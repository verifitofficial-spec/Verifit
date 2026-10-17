'use client';

import { useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { forgotPasswordSchema } from '@/app/lib/validation/authSchemas';
import { FormFieldError } from '@/components/FormError';
import { translateAuthError } from '@/lib/authErrors';
import AuthShell from '@/components/AuthShell';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError('');
    setErrorMessage('');

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setEmailError(result.error.issues[0]?.message ?? 'Ungültige E-Mail-Adresse');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(result.data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (error) {
      setErrorMessage(translateAuthError(error.message));
      return;
    }
    // Bewusst neutrale Antwort, damit keine Rückschlüsse auf vorhandene Konten möglich sind.
    setSent(true);
  }

  return (
    <AuthShell eyebrow="Kontozugang" title="Passwort zurücksetzen." description="Wir senden dir einen sicheren Link an die E-Mail-Adresse deines Kontos." backHref="/login" backLabel="Zurück zum Login" notes={['Neutrale Antwort zum Schutz deines Kontos', 'Sicherer Link per E-Mail', 'Danach direkt neu anmelden']}>

          {errorMessage && (
            <div className="mb-4 p-3 bg-danger-soft border border-danger-line rounded-xl text-danger text-xs">
              {errorMessage}
            </div>
          )}

          {sent ? (
            <div className="p-3 bg-accent-soft border border-accent/35 rounded-xl text-accent text-xs leading-relaxed">
              Falls ein Konto mit dieser E-Mail-Adresse existiert, haben wir dir einen Link zum Zurücksetzen des Passworts geschickt.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="forgot-password-email" className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
                  E-Mail-Adresse
                </label>
                <input
                  id="forgot-password-email"
                  type="email"
                  aria-describedby={emailError ? 'forgot-password-email-error' : undefined}
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full bg-canvas border rounded-xl px-4 py-3 text-sm text-ink focus:outline-none transition ${
                    emailError ? 'border-danger-line focus:border-danger-line' : 'border-line focus:border-accent'
                  }`}
                />
                <FormFieldError id="forgot-password-email-error" message={emailError} />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent hover:bg-accent-strong text-primary-foreground font-bold py-3 rounded-xl text-sm transition cursor-pointer disabled:opacity-60"
              >
                {loading ? 'Sende Link...' : 'Link zum Zurücksetzen senden'}
              </button>
            </form>
          )}
    </AuthShell>
  );
}
