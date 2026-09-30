import { z } from 'zod';

export const bookSlotSchema = z.object({
  slotId: z.string().min(1, 'slotId fehlt'),
  clientName: z.string().trim().min(2, 'Name muss mindestens 2 Zeichen haben').max(100),
  clientEmail: z.string().trim().toLowerCase().email('Ungültige E-Mail-Adresse').max(254),
});

export type BookSlotInput = z.infer<typeof bookSlotSchema>;