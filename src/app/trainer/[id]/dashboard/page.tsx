'use client';

import { use } from 'react';
import { useTrainerAccount } from '@/hooks/trainer-dashboard/useTrainerAccount';
import { useTrainerOffers } from '@/hooks/trainer-dashboard/useTrainerOffers';
import type { TrainerProfile } from '@/lib/trainer-dashboard/types';
import ProfileSection from '@/components/trainer-dashboard/ProfileSection';
import SpecialtiesSection from '@/components/trainer-dashboard/SpecialtiesSection';
import VerificationSection from '@/components/trainer-dashboard/VerificationSection';
import OffersSection from '@/components/trainer-dashboard/OffersSection';
import DeleteAccountCard from '@/components/DeleteAccountCard';
import InquiryList from '@/components/InquiryList';
import Footer from '@/components/Footer';
import { SkeletonBlock } from '@/components/Skeleton';

export default function TrainerDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { trainer, loading, error, retry, updateTrainer } = useTrainerAccount(id);
  const offers = useTrainerOffers(id);

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex items-center justify-center">
        <div className="w-full max-w-3xl space-y-5 px-6" aria-label="Trainer-Dashboard wird geladen">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-12 w-3/4" />
          <SkeletonBlock className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (error || !trainer) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-5 text-ink">
        <div role="alert" className="w-full max-w-xl border-y border-danger-line py-8">
          <p className="text-sm font-semibold text-danger">Trainer-Dashboard nicht verfügbar</p>
          <h1 className="mt-3 text-3xl font-bold">Dein Profil konnte nicht geladen werden.</h1>
          <p className="mt-3 text-sm text-ink-muted">{error ?? 'Bitte versuche es erneut.'}</p>
          <button type="button" onClick={retry} className="mt-6 min-h-11 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-primary-foreground">
            Erneut versuchen
          </button>
        </div>
      </main>
    );
  }

  const profile: TrainerProfile = trainer;

  return (
    <main className="min-h-screen bg-canvas text-ink flex flex-col justify-between selection:bg-accent selection:text-primary-foreground">
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full flex-1 space-y-6 sm:py-10">
        <div className="flex flex-col gap-4 pb-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Trainer-Dashboard</h1>
            <p className="mt-2 text-sm text-ink-muted">Profil, Verifizierung, Angebote und Kontaktanfragen.</p>
          </div>
          <span
            className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium ${
              profile.status === 'approved'
                ? 'border-accent/40 bg-accent-soft text-accent'
                : 'border-warning-line bg-warning-soft text-warning'
            }`}
          >
            {profile.status === 'approved' ? 'Verifiziert' : 'Prüfung ausstehend'}
          </span>
        </div>

        <ProfileSection trainer={profile} onChange={updateTrainer} />
        <SpecialtiesSection trainer={profile} onChange={updateTrainer} />
        <VerificationSection trainer={profile} onChange={updateTrainer} />
        <InquiryList audience="trainer" />
        <OffersSection
          offers={offers.offers}
          loading={offers.loading}
          loadError={offers.error}
          onRetry={() => void offers.reload()}
          onSave={offers.saveOffer}
          onDelete={offers.deleteOffer}
        />
        <DeleteAccountCard role="trainer" />
      </section>

      <Footer />
    </main>
  );
}
