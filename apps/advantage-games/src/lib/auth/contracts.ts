import { z } from "zod";

/** Validates the browser's username/password login request. */
export const studentLoginInputSchema = z
  .object({
    username: z.string().trim().min(1).max(100),
    password: z.string().min(1).max(128),
  })
  .strict();

/** Validates the successful portion of the shared login response. */
export const sharedLoginSuccessSchema = z
  .object({
    success: z.literal(true),
    user: z.object({
      id: z.string().min(1),
      role: z.string().min(1),
    }).passthrough(),
  })
  .passthrough();

/** Validates the shared session response fields needed by this host. */
export const sharedSessionResponseSchema = z.object({
  session: z
    .object({
      user: z.object({
        id: z.string().min(1),
        role: z.string().min(1),
      }).passthrough(),
    })
    .passthrough()
    .nullable(),
});

/** A username/password request accepted by the app-local auth client. */
export type StudentLoginInput = z.infer<typeof studentLoginInputSchema>;
