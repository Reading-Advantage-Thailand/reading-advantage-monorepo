import * as z from 'zod';
export const GamificationProfileGroupByResultSchema = z.array(z.object({
  id: z.string(),
  userId: z.string(),
  xp: z.number().int(),
  level: z.number().int(),
  streak: z.number().int(),
  lastActiveAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
  _count: z.object({
    id: z.number(),
    userId: z.number(),
    xp: z.number(),
    level: z.number(),
    streak: z.number(),
    lastActiveAt: z.number(),
    createdAt: z.number(),
    updatedAt: z.number(),
    user: z.number()
  }).optional(),
  _sum: z.object({
    xp: z.number().nullable(),
    level: z.number().nullable(),
    streak: z.number().nullable()
  }).nullable().optional(),
  _avg: z.object({
    xp: z.number().nullable(),
    level: z.number().nullable(),
    streak: z.number().nullable()
  }).nullable().optional(),
  _min: z.object({
    id: z.string().nullable(),
    userId: z.string().nullable(),
    xp: z.number().int().nullable(),
    level: z.number().int().nullable(),
    streak: z.number().int().nullable(),
    lastActiveAt: z.date().nullable(),
    createdAt: z.date().nullable(),
    updatedAt: z.date().nullable()
  }).nullable().optional(),
  _max: z.object({
    id: z.string().nullable(),
    userId: z.string().nullable(),
    xp: z.number().int().nullable(),
    level: z.number().int().nullable(),
    streak: z.number().int().nullable(),
    lastActiveAt: z.date().nullable(),
    createdAt: z.date().nullable(),
    updatedAt: z.date().nullable()
  }).nullable().optional()
}));