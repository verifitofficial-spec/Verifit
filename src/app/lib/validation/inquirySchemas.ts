import { z } from 'zod';
import { INQUIRY_STATUSES } from '@/lib/inquiryCore';

const uuidSchema = z.string().uuid('Ungültige Kennung');

export const createInquirySchema = z
  .object({
    trainerId: uuidSchema,
    offerId: uuidSchema.nullable().optional(),
    message: z
      .string()
      .trim()
      .min(10, 'Deine Nachricht muss mindestens 10 Zeichen enthalten.')
      .max(1000, 'Deine Nachricht darf maximal 1000 Zeichen enthalten.'),
    idempotencyKey: uuidSchema,
  })
  .strict();

export const inquiryQuerySchema = z
  .object({
    inquiryId: uuidSchema.optional(),
  })
  .strict();

export const updateInquiryStatusSchema = z
  .object({
    inquiryId: uuidSchema,
    status: z.enum(INQUIRY_STATUSES),
  })
  .strict();

export type CreateInquiryInput = z.infer<typeof createInquirySchema>;
export type UpdateInquiryStatusInput = z.infer<typeof updateInquiryStatusSchema>;
