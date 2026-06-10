import { z } from "zod";

export const createLicenseInputSchema = z.object({
  key: z.string().min(1),
  schoolName: z.string().min(1),
  maxUsers: z.number().int().min(1),
  licenseType: z.string().optional(),
  expiresAt: z.date().optional(),
});

export type CreateLicenseInput = z.infer<typeof createLicenseInputSchema>;
