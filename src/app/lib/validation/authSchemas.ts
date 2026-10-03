import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'E-Mail ist erforderlich').email('Ungültige E-Mail-Adresse'),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Name muss mindestens 2 Zeichen haben'),
    email: z.string().min(1, 'E-Mail ist erforderlich').email('Ungültige E-Mail-Adresse'),
    password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen haben'),
    confirmPassword: z.string().min(1, 'Bitte Passwort bestätigen'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwörter stimmen nicht überein',
    path: ['confirmPassword'],
  });

export const trainerProfileSchema = z.object({
  name: z.string().min(2, 'Name muss mindestens 2 Zeichen haben'),
  city: z.string().optional(),
  bio: z.string().max(2000, 'Bio darf maximal 2000 Zeichen haben').optional(),
  packagePrice: z
    .string()
    .optional()
    .refine((val) => !val || !isNaN(parseFloat(val)), 'Preis muss eine Zahl sein'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type TrainerProfileFormValues = z.infer<typeof trainerProfileSchema>;
