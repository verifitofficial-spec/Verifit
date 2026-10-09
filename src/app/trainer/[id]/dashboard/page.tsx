'use client';

import { use } from 'react';
import { useTrainerAccount } from '@/hooks/trainer-dashboard/useTrainerAccount';
import { useTrainerSchedule } from '@/hooks/trainer-dashboard/useTrainerSchedule';
import { useClients } from '@/hooks/trainer-dashboard/useClients';
import type { TrainerProfile } from '@/lib/trainer-dashboard/types';
import DashboardHeader from '@/components/trainer-dashboard/DashboardHeader';
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

export default function TrainerDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { trainer, loading, updateTrainer, logout } = useTrainerAccount(id);
  const schedule = useTrainerSchedule(id);
  const clients = useClients();

  if (loading || !trainer) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Lade VeriFit Expert Hub...</p>
        </div>
      </div>
    );
  }

  const profile: TrainerProfile = trainer;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950">
      <DashboardHeader status={profile.status} onLogout={logout} />

      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 w-full flex-1 space-y-10">
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

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600 max-w-7xl mx-auto w-full">
        &copy; {new Date().getFullYear()} VeriFit. Alle Rechte vorbehalten.
      </footer>
    </main>
  );
}
