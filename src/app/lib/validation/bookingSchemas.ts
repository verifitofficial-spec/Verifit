import { z } from 'zod';

const uuidSchema = z.string().uuid('Ungültige Kennung');

export const bookSlotSchema = z.object({
  slotId: uuidSchema,
  offerId: uuidSchema,
});

export const checkoutSchema = z.object({
  bookingId: uuidSchema,
});

export const respondToBookingSchema = z.object({
  bookingId: uuidSchema,
  accept: z.boolean(),
});

export type BookSlotInput = z.infer<typeof bookSlotSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type RespondToBookingInput = z.infer<typeof respondToBookingSchema>;
