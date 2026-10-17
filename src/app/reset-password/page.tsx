'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';
import { resetPasswordSchema } from '@/app/lib/validation/authSchemas';
import { FormFieldError } from '@/components/FormError';
import { translateAuthError } from '@/lib/authErrors';
import AuthShell from '@/components/AuthShell';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ready, setReady] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [done, setDone] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const router = useRouter();

  useEffect(() => {
    let active = true;

    // Der Link aus der E-Mail erzeugt automatisch eine Recovery-Session.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && active) setReady(true);
    });

    const timer = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (active) setReady((current) => (current === true ? true : Boolean(data.session)));
    }, 800);

    return () => {
      active = false;
      clearTimeout(timer);
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage('');
    setFieldErrors({});

    const result = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const errors: { password?: string; confirmPassword?: string } = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as 'password' | 'confirmPassword';
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: result.data.password });
    if (error) {
      setErrorMessage(translateAuthError(error.message));
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    setDone(true);
    setLoading(false);
    setTimeout(() => router.push('/login'), 2500);
  }

  const inputClass = (error?: string) =>
    `w-full bg-canvas border rounded-xl px-4 py-3 text-sm text-ink focus:outline-none transition ${
      error ? 'border-danger-line focus:border-danger-line' : 'border-line focus:border-accent'
    }`;

  return (
    <AuthShell eyebrow="Kontozugang" title="Neues Passwort festlegen." description="Prüfe deinen Recovery-Link und vergib anschließend ein neues, sicheres Passwort." backHref="/login" backLabel="Zurück zum Login" notes={['Recovery-Link wird automatisch geprüft', 'Mindestens acht Zeichen', 'Anschließend erneute Anmeldung']}>

          {done ? (
            <div className="mt-6 p-3 bg-accent-soft border border-accent/35 rounded-xl text-accent text-xs">
              Dein Passwort wurde geändert. Du wirst zum Login weitergeleitet.
            </div>
          ) : ready === null ? (
            <p className="text-ink-muted text-sm text-center mt-6">Link wird geprüft...</p>
          ) : ready === false ? (
            <div className="mt-6 space-y-4">
              <div className="p-3 bg-danger-soft border border-danger-line rounded-xl text-danger text-xs">
                Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.
              </div>
              <Link
                href="/forgot-password"
                className="block w-full text-center bg-accent hover:bg-accent-strong text-primary-foreground font-bold py-3 rounded-xl text-sm transition"
              >
                Neuen Link anfordern
              </Link>
            </div>
          ) : (
            <>
              <p className="text-ink-muted text-sm text-center mb-6 mt-2">Wähle ein neues Passwort mit mindestens 8 Zeichen.</p>
              {errorMessage && (
                <div className="mb-4 p-3 bg-danger-soft border border-danger-line rounded-xl text-danger text-xs">
                  {errorMessage}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="reset-password" className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Neues Passwort</label>
                  <input id="reset-password" type="password" aria-describedby={fieldErrors.password ? 'reset-password-error' : undefined} autoComplete="new-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass(fieldErrors.password)} />
                  <FormFieldError id="reset-password-error" message={fieldErrors.password} />
                </div>
                <div>
                  <label htmlFor="reset-password-confirm" className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Passwort bestätigen</label>
                  <input id="reset-password-confirm" type="password" aria-describedby={fieldErrors.confirmPassword ? 'reset-password-confirm-error' : undefined} autoComplete="new-password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass(fieldErrors.confirmPassword)} />
                  <FormFieldError id="reset-password-confirm-error" message={fieldErrors.confirmPassword} />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-accent hover:bg-accent-strong text-primary-foreground font-bold py-3 rounded-xl text-sm transition cursor-pointer disabled:opacity-60"
                >
                  {loading ? 'Speichere...' : 'Passwort speichern'}
                </button>
              </form>
            </>
          )}
    </AuthShell>
  );
}
