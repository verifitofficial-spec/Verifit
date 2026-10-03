'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';
import { registerSchema } from '@/app/lib/validation/authSchemas';
import { FormFieldError } from '@/components/FormError';

export default function TrainerRegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [bio, setBio] = useState('');
  const [termsConsent, setTermsConsent] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
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

    if (!termsConsent || !privacyConsent) {
      setErrorMessage('Bitte bestätige alle erforderlichen Einwilligungen.');
      return;
    }

    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: {
        data: {
          role: 'trainer',
          name: result.data.name,
          bio,
          consents: {
            terms: termsConsent,
            privacy: privacyConsent,
            version: '2026-10-01',
          },
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
      router.push(`/trainer/${user.id}/dashboard`);
    } else if (user) {
      setErrorMessage('Registrierung erfolgreich. Bitte bestätige zuerst deine E-Mail-Adresse.');
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
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-extrabold mb-2">Trainer Registrierung</h1>
            <p className="text-slate-400 text-sm">Erstelle dein verifiziertes Profil bei VeriFit.</p>
          </div>

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

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Kurzbiografie
              </label>
              <textarea
                placeholder="Erzähle kurz von deiner Erfahrung..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none h-20"
              />
            </div>
            <label className="flex items-start gap-3 text-xs text-slate-400 leading-tight">
              <input type="checkbox" required checked={termsConsent} onChange={(event) => setTermsConsent(event.target.checked)} className="mt-1 w-4 h-4" />
              <span>Ich bestätige, die AGB gelesen zu haben. <em>{/* VOM ANWALT PRÜFEN */}</em></span>
            </label>
            <label className="flex items-start gap-3 text-xs text-slate-400 leading-tight">
              <input type="checkbox" required checked={privacyConsent} onChange={(event) => setPrivacyConsent(event.target.checked)} className="mt-1 w-4 h-4" />
              <span>Ich bestätige, die Datenschutzerklärung gelesen zu haben. <em>{/* VOM ANWALT PRÜFEN */}</em></span>
            </label>

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
