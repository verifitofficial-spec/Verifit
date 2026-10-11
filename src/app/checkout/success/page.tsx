'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, CircleAlert, Clock3 } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useAuthProfile } from '@/lib/useAuthProfile';
import BrandMark from '@/components/BrandMark';
import Footer from '@/components/Footer';
import { SkeletonBlock } from '@/components/Skeleton';

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
      <header className="flex items-center px-6 py-6 max-w-7xl mx-auto w-full">
        <BrandMark />
      </header>

      <section className="max-w-3xl mx-auto px-6 py-20 w-full flex-1 flex flex-col items-start justify-center space-y-7">
        {state === 'checking' && (
          <>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-400">Zahlungsstatus</p>
            <SkeletonBlock className="h-12 w-3/4" />
            <SkeletonBlock className="h-5 w-full max-w-xl" />
            <p className="sr-only" aria-live="polite">Zahlung wird bestätigt. Wir prüfen deine Zahlung bei Stripe.</p>
          </>
        )}

        {state === 'confirmed' && (
          <>
            <div className="flex items-center gap-3 text-emerald-400">
              <CheckCircle2 size={32} />
              <span className="text-xs font-bold uppercase tracking-[0.22em]">Bestätigt</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight">Dein Termin steht.</h1>
            <p className="max-w-xl text-slate-400 text-sm md:text-base leading-7">
              Deine Zahlung wurde bestätigt und dein Termin ist reserviert. Du erhältst in Kürze eine Bestätigungsmail mit allen Details.
            </p>
          </>
        )}

        {state === 'processing' && (
          <>
            <Clock3 className="h-8 w-8 text-amber-400" aria-hidden="true" />
            <h1 className="text-4xl md:text-6xl font-black tracking-tight">Zahlung wird verarbeitet.</h1>
            <p className="max-w-xl text-slate-400 text-sm leading-7">
              Deine Zahlung ist bei uns eingegangen, die Bestätigung dauert noch einen Moment. Den aktuellen Status siehst du in deinem Dashboard unter „Deine Buchungen“.
            </p>
          </>
        )}

        {state === 'error' && (
          <>
            <CircleAlert className="h-8 w-8 text-amber-400" aria-hidden="true" />
            <h1 className="text-4xl md:text-6xl font-black tracking-tight">Bitte melde dich an.</h1>
            <p className="max-w-xl text-slate-400 text-sm leading-7">
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

      <Footer />
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
