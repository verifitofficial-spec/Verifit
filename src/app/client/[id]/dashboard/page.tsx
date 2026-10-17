'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DeleteAccountCard from '@/components/DeleteAccountCard';
import Footer from '@/components/Footer';
import InquiryList from '@/components/InquiryList';
import { SkeletonBlock } from '@/components/Skeleton';
import { supabase } from '@/app/lib/supabase';
import { useAuthProfile } from '@/lib/useAuthProfile';

type ClientProfile = {
  id: string;
  name: string | null;
  email: string;
};

export default function ClientDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = use(params);
  const router = useRouter();
  const auth = useAuthProfile();
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.userId) {
      router.replace(`/client/login?next=${encodeURIComponent(`/client/${clientId}/dashboard`)}`);
      return;
    }
    if (auth.userId !== clientId || auth.role !== 'client') {
      router.replace(auth.homeHref ?? '/');
      return;
    }

    let active = true;
    async function loadClient() {
      const { data, error: loadError } = await supabase
        .from('clients')
        .select('id, name, email')
        .eq('id', clientId)
        .maybeSingle();
      if (!active) return;
      if (loadError || !data) {
        setError('Dein Profil konnte nicht geladen werden.');
      } else {
        setClient(data as ClientProfile);
      }
      setLoading(false);
    }
    void loadClient();
    return () => {
      active = false;
    };
  }, [auth.homeHref, auth.loading, auth.role, auth.userId, clientId, router]);

  if (auth.loading || loading) {
    return (
      <main className="min-h-screen bg-canvas text-ink">
        <div className="mx-auto w-full max-w-5xl space-y-5 px-5 py-16 sm:px-8">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-12 w-3/4" />
          <SkeletonBlock className="h-40 w-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-canvas text-ink flex flex-col justify-between">
      <section className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-5 py-12 sm:px-8 sm:py-16">
        <div>
          <p className="text-sm font-semibold text-accent">Kundenbereich</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            {client?.name ? `Hallo, ${client.name}` : 'Dein VeriFit-Konto'}
          </h1>
          <p className="mt-3 text-sm text-ink-muted">
            Verwalte hier deine unverbindlichen Kontaktanfragen und dein Konto.
          </p>
        </div>

        {error && <div role="alert" className="border border-danger-line bg-danger-soft p-4 text-sm text-danger">{error}</div>}

        <InquiryList audience="client" />
        <DeleteAccountCard role="client" />
      </section>
      <Footer />
    </main>
  );
}
