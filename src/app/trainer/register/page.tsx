'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';
import { registerSchema } from '@/app/lib/validation/authSchemas';
import { FormFieldError } from '@/components/FormError';
import { translateAuthError } from '@/lib/authErrors';
import AuthShell from '@/components/AuthShell';

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
};

export default function TrainerRegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [bio, setBio] = useState('');
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const router = useRouter();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');
    setFieldErrors({});

    const errors: FieldErrors = {};
    const result = registerSchema.safeParse({ name, email, password, confirmPassword });
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (!errors[key]) errors[key] = issue.message;
      }
    }
    if (!terms) errors.terms = 'Bitte bestätige AGB und Datenschutzerklärung.';
    if (!result.success || Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    const acceptedAt = new Date().toISOString();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/trainer/login`,
        data: {
          role: 'trainer', // wird vom Datenbank-Trigger ausgewertet
          name: result.data.name,
          bio,
          terms_accepted_at: acceptedAt,
        },
      },
    });

    if (authError) {
      setErrorMessage(translateAuthError(authError.message));
      setLoading(false);
      return;
    }

    const user = authData.user;
    if (!user) {
      setErrorMessage('Registrierung fehlgeschlagen. Bitte versuche es erneut.');
      setLoading(false);
      return;
    }

    if (user.identities && user.identities.length === 0) {
      setErrorMessage('Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich an.');
      setLoading(false);
      return;
    }

    if (!authData.session) {
      setInfoMessage(
        'Dein Konto wurde erstellt. Bitte bestätige deine E-Mail-Adresse über den Link in der Nachricht, die wir dir geschickt haben, und melde dich danach an.'
      );
      setLoading(false);
      return;
    }

    // Der Auth-Trigger speichert Name und Bio bereits atomar im Trainerprofil.
    router.push(`/trainer/${user.id}/dashboard`);
  }

  const inputClass = (error?: string) =>
    `w-full bg-canvas border rounded-xl px-4 py-3 text-sm text-ink focus:outline-none transition ${
      error ? 'border-danger-line focus:border-danger-line' : 'border-line focus:border-accent'
    }`;
  const labelClass = 'block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2';

  return (
    <AuthShell eyebrow="Trainer werden" title="Expertise, die sichtbar wird." description="Erstelle dein Profil. Nach der manuellen Prüfung kannst du passende Kunden begleiten." notes={['Manuelle Prüfung deiner Nachweise', 'Eigenes Profil und flexible Angebote', 'Klare Vermittlung ohne Leistungsversprechen']}>

          {errorMessage && (
            <div className="mb-4 p-3 bg-danger-soft border border-danger-line rounded-xl text-danger text-xs">
              {errorMessage}
            </div>
          )}
          {infoMessage && (
            <div className="mb-4 p-3 bg-accent-soft border border-accent/35 rounded-xl text-accent text-xs leading-relaxed">
              {infoMessage}
              <div className="mt-2">
                <Link href="/trainer/login" className="underline text-accent">
                  Zum Login
                </Link>
              </div>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4" noValidate>
            <div>
              <label htmlFor="trainer-register-name" className={labelClass}>Vollständiger Name</label>
              <input id="trainer-register-name" type="text" aria-describedby={fieldErrors.name ? 'trainer-register-name-error' : undefined} autoComplete="name" placeholder="Max Mustermann" value={name} onChange={(e) => setName(e.target.value)} className={inputClass(fieldErrors.name)} />
              <FormFieldError id="trainer-register-name-error" message={fieldErrors.name} />
            </div>
            <div>
              <label htmlFor="trainer-register-email" className={labelClass}>E-Mail-Adresse</label>
              <input id="trainer-register-email" type="email" aria-describedby={fieldErrors.email ? 'trainer-register-email-error' : undefined} autoComplete="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass(fieldErrors.email)} />
              <FormFieldError id="trainer-register-email-error" message={fieldErrors.email} />
            </div>
            <div>
              <label htmlFor="trainer-register-password" className={labelClass}>Passwort (mind. 8 Zeichen)</label>
              <input id="trainer-register-password" type="password" aria-describedby={fieldErrors.password ? 'trainer-register-password-error' : undefined} autoComplete="new-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass(fieldErrors.password)} />
              <FormFieldError id="trainer-register-password-error" message={fieldErrors.password} />
            </div>
            <div>
              <label htmlFor="trainer-register-confirm-password" className={labelClass}>Passwort bestätigen</label>
              <input id="trainer-register-confirm-password" type="password" aria-describedby={fieldErrors.confirmPassword ? 'trainer-register-confirm-password-error' : undefined} autoComplete="new-password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass(fieldErrors.confirmPassword)} />
              <FormFieldError id="trainer-register-confirm-password-error" message={fieldErrors.confirmPassword} />
            </div>
            <div>
              <label htmlFor="trainer-register-bio" className={labelClass}>Kurzbiografie</label>
              <textarea
                id="trainer-register-bio"
                placeholder="Erzähle kurz von deiner Erfahrung..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-canvas border border-line rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-accent resize-none h-20"
              />
            </div>

            <div>
              <div className="flex items-start gap-3 text-left">
                <input
                  type="checkbox"
                  id="trainerTerms"
                  aria-describedby={fieldErrors.terms ? 'trainer-register-terms-error' : undefined}
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-line-strong bg-canvas text-accent focus:ring-accent cursor-pointer"
                />
                <label htmlFor="trainerTerms" className="text-xs text-ink-muted leading-tight">
                  Ich habe die{' '}
                  <Link href="/agb" target="_blank" className="text-accent hover:underline">AGB</Link> und die{' '}
                  <Link href="/datenschutz" target="_blank" className="text-accent hover:underline">Datenschutzerklärung</Link>{' '}
                  gelesen und akzeptiere sie. Mir ist bekannt, dass mein Profil erst nach manueller Prüfung durch VeriFit freigeschaltet wird.
                </label>
              </div>
              <FormFieldError id="trainer-register-terms-error" message={fieldErrors.terms} />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-strong text-primary-foreground font-bold py-3 rounded-xl text-sm transition shadow-lg shadow-none cursor-pointer mt-2 disabled:opacity-60"
            >
              {loading ? 'Registriere...' : 'Konto erstellen'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-ink-muted">
            Bereits ein Konto?{' '}
            <Link href="/trainer/login" className="text-accent hover:underline">
              Anmelden
            </Link>
          </div>
    </AuthShell>
  );
}
