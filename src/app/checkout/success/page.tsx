import LeadMvpLegacyNotice from '@/components/LeadMvpLegacyNotice';

export default function CheckoutSuccessPage() {
  return (
    <LeadMvpLegacyNotice
      title="Zahlungen sind noch nicht freigeschaltet."
      description="Der kontrollierte Pilotbetrieb arbeitet ausschließlich mit unverbindlichen Anfragen. Es wurde über diesen Ablauf keine Zahlung bestätigt oder ein Termin gebucht."
      backHref="/trainer/list"
      backLabel="Trainer ansehen"
    />
  );
}
