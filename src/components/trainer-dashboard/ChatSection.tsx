'use client';

import { User } from 'lucide-react';
import Chat from '@/components/Chat';
import { SectionCard, SectionHeader } from './ui';

export default function ChatSection({ trainerId }: { trainerId: string }) {
  return (
    <SectionCard>
      <SectionHeader icon={User} title="Kundenchat" description="Direkter Kommunikationskanal zu den betreuten Kunden." />
      <Chat currentUserId={trainerId} />
    </SectionCard>
  );
}
