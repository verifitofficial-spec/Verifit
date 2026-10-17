'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import ThemeToggle from '@/components/ThemeToggle';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // 1. Ganz normal einloggen über Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setErrorMsg(authError.message);
      return;
    }

    const user = authData.user;

    if (user) {
      // 2. Prüfen, ob der User in der 'profiles'-Tabelle die Rolle 'admin' hat
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile || profile.role !== 'admin') {
        // Wenn kein Admin: Sofort wieder ausloggen, damit kein unbefugter Zugriff möglich ist!
        await supabase.auth.signOut();
        setErrorMsg('Zugriff verwehrt. Dieser Account hat keine Administrator-Rechte.');
        return;
      }

      // 3. Wenn alles passt, Session erzwingen und ins Admin-Dashboard weiterleiten
      await router.push('/admin');
      router.refresh();
    }
  };

  return (
    <main className="min-h-screen bg-canvas text-ink flex items-center justify-center p-6">
      <ThemeToggle compact className="absolute right-6 top-6" />
      <div className="bg-surface border border-line p-8 rounded-2xl max-w-md w-full space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-accent">VERIFIT ADMIN</h1>
          <p className="text-xs text-ink-muted">Sicherer Zugang für Plattform-Administration</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-danger-soft border border-danger-line text-danger text-xs rounded-xl">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="admin-email" className="text-xs font-semibold text-ink-muted block mb-1">E-Mail-Adresse</label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-canvas border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent text-ink"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="text-xs font-semibold text-ink-muted block mb-1">Passwort</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-canvas border border-line rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent text-ink"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-accent hover:bg-accent-strong text-primary-foreground font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Anmelden
          </button>
        </form>
      </div>
    </main>
  );
}
