'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useAuthProfile } from '@/lib/useAuthProfile';

type State = 'checking' | 'confirmed' | 'processing' | 'error';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function SuccessContent() {
  const sessionId = useSearchParams().get('session_id');
  const { homeHref } = useAuthProfile();
  const [state, setState] = useState<State>(sessionId ? 'checking' : 'confirmed');

  useEffect(() => {
    if (!sessionId) return;
    let active = true;

    async function confirm() {
      for (let attempt = 0; attempt < 4; attempt++) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!active) return;
        if (!session) {
          setState('error');
          return;
        }

        try {
          const response = await fetch('/api/checkout/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ sessionId }),
          });
          const data = (await response.json().catch(() => ({}))) as { status?: string };
          if (!active) return;
          if (response.ok && data.status === 'confirmed') {
            setState('confirmed');
            return;
          }
        } catch {
          /* nächster Versuch */
        }
        await sleep(2000);
      }
      if (active) setState('processing');
    }

    confirm();
    return () => {
      active = false;
    };
  }, [sessionId]);

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      <header className="flex justify-between items-center px-6 py-6 max-w-7xl mx-auto w-full">
        <Link href="/" className="text-2xl font-black tracking-wider text-emerald-400">
          VERIFIT<span className="text-white">.</span>
        </Link>
      </header>

      <section className="max-w-xl mx-auto px-6 py-20 w-full flex-1 flex flex-col items-center text-center justify-center space-y-6">
        {state === 'checking' && (
          <>
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <h1 className="text-2xl font-black tracking-tight">Zahlung wird bestätigt...</h1>
            <p className="text-slate-400 text-sm">Einen Moment bitte, wir prüfen deine Zahlung bei Stripe.</p>
          </>
        )}

        {state === 'confirmed' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 size={32} />
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Buchung erfolgreich!</h1>
            <p className="text-slate-400 text-sm md:text-base">
              Deine Zahlung wurde bestätigt und dein Termin ist reserviert. Du erhältst in Kürze eine Bestätigungsmail mit allen Details.
            </p>
          </>
        )}

        {state === 'processing' && (
          <>
            <h1 className="text-2xl font-black tracking-tight">Zahlung wird verarbeitet</h1>
            <p className="text-slate-400 text-sm">
              Deine Zahlung ist bei uns eingegangen, die Bestätigung dauert noch einen Moment. Den aktuellen Status siehst du in deinem Dashboard unter „Deine Buchungen“.
            </p>
          </>
        )}

        {state === 'error' && (
          <>
            <h1 className="text-2xl font-black tracking-tight">Bitte melde dich an</h1>
            <p className="text-slate-400 text-sm">
              Wir konnten deine Sitzung nicht finden. Nach dem Login siehst du den Status deiner Buchung im Dashboard.
            </p>
          </>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href={homeHref ?? '/login'}
            className="inline-block bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-8 py-4 rounded-2xl text-base transition shadow-lg shadow-emerald-500/20"
          >
            {homeHref ? 'Zum Dashboard' : 'Zum Login'}
          </Link>
          <Link
            href="/"
            className="inline-block bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold px-8 py-4 rounded-2xl text-base transition"
          >
            Zur Startseite
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600 max-w-7xl mx-auto w-full">
        &copy; {new Date().getFullYear()} VeriFit. Alle Rechte vorbehalten.
      </footer>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <SuccessContent />
    </Suspense>
  );
}
