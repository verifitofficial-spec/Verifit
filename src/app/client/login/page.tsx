'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';

export default function ClientLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
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

    // Prüfen, ob ein Eintrag in 'clients' mit dieser Auth-ID existiert
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!existingClient) {
      // Falls nur ein alter Eintrag mit abweichender ID existiert, löschen wir diesen nach E-Mail und legen ihn mit der echten Auth-ID an
      await supabase.from('clients').delete().eq('email', user.email);

      const { error: insertError } = await supabase.from('clients').insert([
        {
          id: user.id,
          name: user.email?.split('@')[0] || 'Kunde',
          email: user.email,
        },
      ]);

      if (insertError) {
        setErrorMessage('Fehler beim Synchronisieren des Profils: ' + insertError.message);
        setLoading(false);
        return;
      }
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

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                E-Mail-Adresse
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                required
              />
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3 rounded-xl text-sm transition cursor-pointer"
            >
              {loading ? 'Logge ein...' : 'Anmelden'}
            </button>
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