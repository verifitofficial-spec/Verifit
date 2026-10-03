'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    void supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (password.length < 8) {
      setError('Das Passwort muss mindestens 8 Zeichen haben.');
      return;
    }
    if (password !== confirmation) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError('Das Passwort konnte nicht geändert werden. Bitte fordere einen neuen Link an.');
    } else {
      setMessage('Dein Passwort wurde geändert. Du wirst zum Login weitergeleitet.');
      setTimeout(() => router.push('/login'), 1200);
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <header className="flex justify-between items-center px-6 py-6 max-w-7xl mx-auto w-full">
        <Link href="/" className="text-2xl font-black tracking-wider text-emerald-400">VERIFIT<span className="text-white">.</span></Link>
      </header>
      <section className="flex flex-col items-center justify-center px-6 py-12 max-w-md mx-auto w-full flex-1">
        <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-2xl font-extrabold mb-2 text-center">Neues Passwort</h1>
          {!ready ? <p className="text-slate-400 text-sm text-center">Öffne den Link aus deiner E-Mail, um fortzufahren.</p> : (
            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
              {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">{error}</div>}
              {message && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs">{message}</div>}
              <input type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Neues Passwort" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500" />
              <input type="password" required minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Passwort bestätigen" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500" />
              <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3 rounded-xl text-sm disabled:opacity-60">{loading ? 'Speichere...' : 'Passwort speichern'}</button>
            </form>
          )}
        </div>
      </section>
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600 max-w-7xl mx-auto w-full">&copy; {new Date().getFullYear()} VeriFit. Alle Rechte vorbehalten.</footer>
    </main>
  );
}
