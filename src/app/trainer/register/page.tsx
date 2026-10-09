'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';
import { registerSchema } from '@/app/lib/validation/authSchemas';
import { FormFieldError } from '@/components/FormError';
import { translateAuthError } from '@/lib/authErrors';

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
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-extrabold mb-2">Trainer Registrierung</h1>
            <p className="text-slate-400 text-sm">Erstelle dein verifiziertes Profil bei VeriFit.</p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
              {errorMessage}
            </div>
          )}
          {infoMessage && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs leading-relaxed">
              {infoMessage}
              <div className="mt-2">
                <Link href="/trainer/login" className="underline text-emerald-300">
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
            <div>
              <label className={labelClass}>Kurzbiografie</label>
              <textarea
                placeholder="Erzähle kurz von deiner Erfahrung..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none h-20"
              />
            </div>

            <div>
              <div className="flex items-start gap-3 text-left">
                <input
                  type="checkbox"
                  id="trainerTerms"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="trainerTerms" className="text-xs text-slate-400 leading-tight">
                  Ich habe die{' '}
                  <Link href="/agb" target="_blank" className="text-emerald-400 hover:underline">AGB</Link> und die{' '}
                  <Link href="/datenschutz" target="_blank" className="text-emerald-400 hover:underline">Datenschutzerklärung</Link>{' '}
                  gelesen und akzeptiere sie. Mir ist bekannt, dass mein Profil erst nach manueller Prüfung durch VeriFit freigeschaltet wird.
                </label>
              </div>
              <FormFieldError message={fieldErrors.terms} />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3 rounded-xl text-sm transition shadow-lg shadow-emerald-500/20 cursor-pointer mt-2 disabled:opacity-60"
            >
              {loading ? 'Registriere...' : 'Konto erstellen'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Bereits ein Konto?{' '}
            <Link href="/trainer/login" className="text-emerald-400 hover:underline">
              Anmelden
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600 max-w-7xl mx-auto w-full">
        &copy; {new Date().getFullYear()} VeriFit. Alle Rechte vorbehalten.
      </footer>
    </main>
  );
}
