import LeadMvpLegacyNotice from '@/components/LeadMvpLegacyNotice';

export default async function TrainerClientsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <LeadMvpLegacyNotice
      title="Die Kundenverwaltung folgt später."
      description="Im Lead-MVP verwaltest du ausschließlich eingehende Anfragen in deinem Dashboard. Buchungen, Kundendaten, Tracking und Pläne sind im Pilotbetrieb nicht freigeschaltet."
      backHref={`/trainer/${id}/dashboard`}
      backLabel="Zum Dashboard"
    />
  );
}
