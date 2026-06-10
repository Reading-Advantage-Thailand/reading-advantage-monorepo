import { z } from "zod";

/**
 * Input schema for retrieving a gamification profile.
 */
export const getGamificationProfileInputSchema = z.object({
  userId: z.string().min(1),
});

export type GetGamificationProfileInput = z.infer<typeof getGamificationProfileInputSchema>;

/**
 * Output schema for a gamification profile.
 */
export const gamificationProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  schoolId: z.string(),
  xp: z.number(),
  level: z.number(),
  streak: z.number(),
  lastActiveAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type GamificationProfile = z.infer<typeof gamificationProfileSchema>;

/**
 * Input schema for updating a gamification profile's XP.
 */
export const updateGamificationXpInputSchema = z.object({
  userId: z.string().min(1),
  xp: z.number().int().min(0),
});

export type UpdateGamificationXpInput = z.infer<typeof updateGamificationXpInputSchema>;
