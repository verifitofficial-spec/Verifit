'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';
import { registerSchema } from '@/app/lib/validation/authSchemas';
import { FormFieldError } from '@/components/FormError';
import { translateAuthError } from '@/lib/authErrors';
import { useNextParam, withNext } from '@/lib/nextParam';

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  healthConsent?: string;
  terms?: string;
};

function ClientRegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [healthConsent, setHealthConsent] = useState(false);
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const router = useRouter();
  const next = useNextParam();

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
    if (!healthConsent) errors.healthConsent = 'Ohne diese Einwilligung können wir dein Konto nicht anlegen.';
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
        emailRedirectTo: `${window.location.origin}${withNext('/client/login', next)}`,
        data: {
          role: 'client', // wird vom Datenbank-Trigger ausgewertet
          name: result.data.name,
          health_consent_at: acceptedAt,
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

    // Supabase meldet bei bereits registrierter E-Mail (mit E-Mail-Bestätigung) keinen Fehler, aber keine Identitäten.
    if (user.identities && user.identities.length === 0) {
      setErrorMessage('Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich an.');
      setLoading(false);
      return;
    }

    if (authData.session) {
      router.push(next ?? `/client/${user.id}/dashboard`);
      return;
    }

    setInfoMessage(
      'Dein Konto wurde erstellt. Bitte bestätige deine E-Mail-Adresse über den Link in der Nachricht, die wir dir geschickt haben. Danach kannst du dich anmelden' +
        (next ? ' und deine Buchung fortsetzen.' : '.')
    );
    setLoading(false);
  }

  const inputClass = (error?: string) =>
    `w-full bg-slate-950 border rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition ${
      error ? 'border-red-500/60 focus:border-red-500' : 'border-slate-800 focus:border-emerald-500'
    }`;
  const labelClass = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2';

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <header className="flex justify-between items-center px-6 py-6 max-w-7xl mx-auto w-full">
        <Link href="/" className="text-2xl font-black tracking-wider text-emerald-400">
          VERIFIT<span className="text-white">.</span>
        </Link>
        <Link href="/" className="text-sm font-medium text-slate-300 hover:text-white transition">
          &larr; Zurück zur Startseite
        </Link>
      </header>

      <section className="flex flex-col items-center justify-center px-6 py-12 max-w-md mx-auto w-full flex-1">
        <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-2xl font-extrabold mb-2 text-center">Kunden-Registrierung</h1>
          <p className="text-slate-400 text-sm text-center mb-6">
            {next ? 'Erstelle dein Konto, um deine Buchung abzuschließen.' : 'Erstelle dein Konto, um Termine zu buchen.'}
          </p>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
              {errorMessage}
            </div>
          )}
          {infoMessage && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs leading-relaxed">
              {infoMessage}
              <div className="mt-2">
                <Link href={withNext('/client/login', next)} className="underline text-emerald-300">
                  Zum Login
                </Link>
              </div>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4" noValidate>
            <div>
              <label className={labelClass}>Vollständiger Name</label>
              <input type="text" autoComplete="name" placeholder="Max Mustermann" value={name} onChange={(e) => setName(e.target.value)} className={inputClass(fieldErrors.name)} />
              <FormFieldError message={fieldErrors.name} />
            </div>
            <div>
              <label className={labelClass}>E-Mail-Adresse</label>
              <input type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass(fieldErrors.email)} />
              <FormFieldError message={fieldErrors.email} />
            </div>
            <div>
              <label className={labelClass}>Passwort (mind. 8 Zeichen)</label>
              <input type="password" autoComplete="new-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass(fieldErrors.password)} />
              <FormFieldError message={fieldErrors.password} />
            </div>
            <div>
              <label className={labelClass}>Passwort bestätigen</label>
              <input type="password" autoComplete="new-password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass(fieldErrors.confirmPassword)} />
              <FormFieldError message={fieldErrors.confirmPassword} />
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <div className="flex items-start gap-3 text-left">
                  <input
                    type="checkbox"
                    id="healthDataConsent"
                    checked={healthConsent}
                    onChange={(e) => setHealthConsent(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="healthDataConsent" className="text-xs text-slate-400 leading-tight">
                    Ich willige ausdrücklich ein, dass meine sensiblen Gesundheitsdaten (wie Körpergewicht, Stimmung, Schlaf) zur Auswertung und Anpassung meiner Trainingsziele durch VeriFit und verbundene Trainer verarbeitet werden (gemäß Art. 9 DSGVO). Diese Einwilligung kann ich jederzeit widerrufen.
                  </label>
                </div>
                <FormFieldError message={fieldErrors.healthConsent} />
              </div>

              <div>
                <div className="flex items-start gap-3 text-left">
                  <input
                    type="checkbox"
                    id="termsConsent"
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="termsConsent" className="text-xs text-slate-400 leading-tight">
                    Ich habe die{' '}
                    <Link href="/agb" target="_blank" className="text-emerald-400 hover:underline">AGB</Link> und die{' '}
                    <Link href="/datenschutz" target="_blank" className="text-emerald-400 hover:underline">Datenschutzerklärung</Link>{' '}
                    gelesen und akzeptiere sie.
                  </label>
                </div>
                <FormFieldError message={fieldErrors.terms} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3 rounded-xl text-sm transition cursor-pointer disabled:opacity-60 mt-2"
            >
              {loading ? 'Erstelle Konto...' : 'Registrieren'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Bereits ein Konto?{' '}
            <Link href={withNext('/client/login', next)} className="text-emerald-400 hover:underline">
              Jetzt anmelden
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 max-w-7xl mx-auto w-full space-y-2">
        <p>&copy; {new Date().getFullYear()} VeriFit. Alle Rechte vorbehalten.</p>
        <div className="flex justify-center items-center gap-4">
          <Link href="/impressum" className="hover:text-emerald-400 transition">Impressum</Link>
          <Link href="/datenschutz" className="hover:text-emerald-400 transition">Datenschutz</Link>
          <Link href="/agb" className="hover:text-emerald-400 transition">AGB</Link>
        </div>
      </footer>
    </main>
  );
}

export default function ClientRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <ClientRegisterForm />
    </Suspense>
  );
}
