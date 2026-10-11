'use client';

import { use } from 'react';
import { useTrainerAccount } from '@/hooks/trainer-dashboard/useTrainerAccount';
import { useTrainerSchedule } from '@/hooks/trainer-dashboard/useTrainerSchedule';
import { useClients } from '@/hooks/trainer-dashboard/useClients';
import type { TrainerProfile } from '@/lib/trainer-dashboard/types';
import ProfileSection from '@/components/trainer-dashboard/ProfileSection';
import SpecialtiesSection from '@/components/trainer-dashboard/SpecialtiesSection';
import VerificationSection from '@/components/trainer-dashboard/VerificationSection';
import StripeSection from '@/components/trainer-dashboard/StripeSection';
import OffersSection from '@/components/trainer-dashboard/OffersSection';
import ScheduleSection from '@/components/trainer-dashboard/ScheduleSection';
import WorkoutPlanner from '@/components/trainer-dashboard/WorkoutPlanner';
import NutritionPlanner from '@/components/trainer-dashboard/NutritionPlanner';
import ChatSection from '@/components/trainer-dashboard/ChatSection';
import DeleteAccountCard from '@/components/DeleteAccountCard';
import StripeReturnSync from '@/components/StripeReturnSync';
import Footer from '@/components/Footer';
import { SkeletonBlock } from '@/components/Skeleton';

export default function TrainerDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { trainer, loading, updateTrainer } = useTrainerAccount(id);
  const schedule = useTrainerSchedule(id);
  const clients = useClients();

  if (loading || !trainer) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="w-full max-w-3xl space-y-5 px-6" aria-label="Trainer-Dashboard wird geladen">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-12 w-3/4" />
          <SkeletonBlock className="h-40 w-full" />
        </div>
      </div>
    );
  }

  const profile: TrainerProfile = trainer;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950">
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 w-full flex-1 space-y-10">
        <div className="flex flex-col gap-5 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-400">Expert Hub</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">Dein Coaching im Überblick.</h1>
            <p className="mt-3 text-sm text-slate-400">Profil, Angebote, Termine und Kundenpläne verwalten.</p>
          </div>
          <span
            className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-medium ${
              profile.status === 'approved'
                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
                : 'border-amber-500/25 bg-amber-500/10 text-amber-400'
            }`}
          >
            {profile.status === 'approved' ? 'Verifiziert' : 'Prüfung ausstehend'}
          </span>
        </div>

        <StripeReturnSync />

        <ProfileSection trainer={profile} onChange={updateTrainer} />
        <SpecialtiesSection trainer={profile} onChange={updateTrainer} />
        <VerificationSection trainer={profile} onChange={updateTrainer} />
        <StripeSection trainer={profile} />
        <OffersSection offers={schedule.offers} onSave={schedule.saveOffer} onDelete={schedule.deleteOffer} />
        <ScheduleSection
          slots={schedule.slots}
          activeBookings={schedule.activeBookings}
          pendingCount={schedule.pendingCount}
          bookingBySlot={schedule.bookingBySlot}
          onRespond={schedule.respondToBooking}
          onToggleSlot={schedule.toggleSlot}
        />
        <ChatSection trainerId={profile.id} />
        <WorkoutPlanner trainerId={profile.id} clients={clients} />
        <NutritionPlanner trainerId={profile.id} clients={clients} />
        <DeleteAccountCard role="trainer" />
      </section>

      <Footer />
    </main>
  );
}
