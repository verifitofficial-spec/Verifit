'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';
import { registerSchema } from '@/app/lib/validation/authSchemas';
import { FormFieldError } from '@/components/FormError';

export default function ClientRegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string; confirmPassword?: string }>({});
  const router = useRouter();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage('');
    setFieldErrors({});

    const result = registerSchema.safeParse({ name, email, password, confirmPassword });
    if (!result.success) {
      const errors: { name?: string; email?: string; password?: string; confirmPassword?: string } = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as 'name' | 'email' | 'password' | 'confirmPassword';
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: {
        data: {
          role: 'client', // Übergibt die Rolle an den Datenbank-Trigger für die profiles-Tabelle
        },
      },
    });

    if (authError) {
      setErrorMessage(authError.message);
      setLoading(false);
      return;
    }

    const user = authData.user;

    if (user && authData.session) {
      // Der Auth-Trigger legt das Kundenprofil atomar an.
      const { error: profileError } = await supabase
        .from('clients')
        .update({ name: result.data.name })
        .eq('id', user.id);
      if (profileError) {
        setErrorMessage('Konto erstellt, aber das Profil konnte nicht gespeichert werden: ' + profileError.message);
        setLoading(false);
        return;
      }
      router.push(`/client/${user.id}/dashboard`);
    } else if (user) {
      setErrorMessage('Konto erstellt. Bitte bestätige zuerst deine E-Mail-Adresse und melde dich danach an.');
      setLoading(false);
    } else {
      setErrorMessage('Registrierung fehlgeschlagen.');
      setLoading(false);
    }
  }

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
          <p className="text-slate-400 text-sm text-center mb-6">Erstelle dein Konto, um Termine zu buchen.</p>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Vollständiger Name
              </label>
              <input
                type="text"
                placeholder="Max Mustermann"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full bg-slate-950 border rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition ${
                  fieldErrors.name ? 'border-red-500/60 focus:border-red-500' : 'border-slate-800 focus:border-emerald-500'
                }`}
              />
              <FormFieldError message={fieldErrors.name} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                E-Mail-Adresse
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full bg-slate-950 border rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition ${
                  fieldErrors.email ? 'border-red-500/60 focus:border-red-500' : 'border-slate-800 focus:border-emerald-500'
                }`}
              />
              <FormFieldError message={fieldErrors.email} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Passwort
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full bg-slate-950 border rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition ${
                  fieldErrors.password ? 'border-red-500/60 focus:border-red-500' : 'border-slate-800 focus:border-emerald-500'
                }`}
              />
              <FormFieldError message={fieldErrors.password} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Passwort bestätigen
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full bg-slate-950 border rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition ${
                  fieldErrors.confirmPassword ? 'border-red-500/60 focus:border-red-500' : 'border-slate-800 focus:border-emerald-500'
                }`}
              />
              <FormFieldError message={fieldErrors.confirmPassword} />
            </div>

            {/* DSGVO-Einwilligung für Gesundheitsdaten */}
            <div className="flex items-start gap-3 mt-4 mb-6 text-left">
              <input
                type="checkbox"
                id="healthDataConsent"
                name="healthDataConsent"
                required
                className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="healthDataConsent" className="text-xs text-slate-400 leading-tight">
                Ich willige ausdrücklich ein, dass meine sensiblen Gesundheitsdaten (wie Körpergewicht, Stimmung, Schlaf) zur Auswertung und Anpassung meiner Trainingsziele durch VeriFit und verbundene Trainer verarbeitet werden (gemäß Art. 9 DSGVO). Diese Einwilligung kann ich jederzeit widerrufen.
              </label>
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
            <Link href="/client/login" className="text-emerald-400 hover:underline">
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
