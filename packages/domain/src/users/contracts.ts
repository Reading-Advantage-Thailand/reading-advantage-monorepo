import { z } from "zod";

export const getUserInputSchema = z.object({
  id: z.string().min(1),
});

export const listUsersInputSchema = z.object({
  schoolId: z.string().optional(),
  role: z.enum(["INTERN", "STUDENT", "TEACHER", "ADMIN", "SYSTEM"]).optional(),
  limit: z.number().int().min(1),
  offset: z.number().int().min(0),
});

export const updateUserInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  image: z.string().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;
