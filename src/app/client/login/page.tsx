'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';
import { loginSchema } from '@/app/lib/validation/authSchemas';
import { FormFieldError } from '@/components/FormError';

export default function ClientLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage('');
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
      setErrorMessage(error.message);
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
      .single();

    if (profileError || !profileData || profileData.role !== 'client') {
      await supabase.auth.signOut();
      setErrorMessage('Zugriff verwehrt. Dieser Account ist kein Kunden-Konto.');
      setLoading(false);
      return;
    }

    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!existingClient) {
      await supabase.auth.signOut();
      setErrorMessage('Dein Kundenprofil ist noch nicht vollständig angelegt. Bitte kontaktiere den Support.');
      setLoading(false);
      return;
    }

    router.refresh();
    router.push(`/client/${user.id}/dashboard`);
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
          <h1 className="text-2xl font-extrabold mb-2 text-center">Kunden-Login</h1>
          <p className="text-slate-400 text-sm text-center mb-6">Gib deine E-Mail und dein Passwort ein.</p>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4" noValidate>
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
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3 rounded-xl text-sm transition cursor-pointer disabled:opacity-60"
            >
              {loading ? 'Logge ein...' : 'Anmelden'}
            </button>
            <Link href="/forgot-password" className="block text-center text-xs text-emerald-400 hover:underline">
              Passwort vergessen?
            </Link>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Noch kein Konto?{' '}
            <Link href="/client/register" className="text-emerald-400 hover:underline">
              Jetzt registrieren
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
