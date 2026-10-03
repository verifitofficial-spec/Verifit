'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError('Die E-Mail konnte nicht versendet werden. Bitte prüfe die Adresse und versuche es erneut.');
    } else {
      setMessage('Falls ein Konto zu dieser Adresse existiert, erhältst du eine E-Mail mit weiteren Schritten.');
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <header className="flex justify-between items-center px-6 py-6 max-w-7xl mx-auto w-full">
        <Link href="/" className="text-2xl font-black tracking-wider text-emerald-400">VERIFIT<span className="text-white">.</span></Link>
        <Link href="/login" className="text-sm text-slate-300 hover:text-white">&larr; Zurück zum Login</Link>
      </header>
      <section className="flex flex-col items-center justify-center px-6 py-12 max-w-md mx-auto w-full flex-1">
        <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-2xl font-extrabold mb-2 text-center">Passwort zurücksetzen</h1>
          <p className="text-slate-400 text-sm text-center mb-6">Gib deine E-Mail-Adresse ein. Wir senden dir einen sicheren Link.</p>
          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">{error}</div>}
          {message && <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs">{message}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500" />
            <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3 rounded-xl text-sm disabled:opacity-60">{loading ? 'Sende E-Mail...' : 'Link senden'}</button>
          </form>
        </div>
      </section>
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600 max-w-7xl mx-auto w-full">&copy; {new Date().getFullYear()} VeriFit. Alle Rechte vorbehalten.</footer>
    </main>
  );
}
