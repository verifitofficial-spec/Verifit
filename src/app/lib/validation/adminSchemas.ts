import { z } from 'zod';

export const trainerStatusSchema = z.object({
  trainerId: z.string().uuid('Ungültige Trainer-Kennung'),
  status: z.enum(['approved', 'rejected']),
});

export const verificationDocumentSchema = z.object({
  path: z.string().trim().min(1, 'Dokumentpfad fehlt').max(512, 'Dokumentpfad ist zu lang'),
});
