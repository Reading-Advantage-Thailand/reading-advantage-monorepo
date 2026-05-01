import * as z from 'zod';
export const userGroupByResultSchema = z.array(z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  displayUsername: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  image: z.string(),
  gradeLevel: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
  _count: z.object({
    id: z.number(),
    name: z.number(),
    username: z.number(),
    displayUsername: z.number(),
    email: z.number(),
    emailVerified: z.number(),
    image: z.number(),
    role: z.number(),
    gradeLevel: z.number(),
    createdAt: z.number(),
    updatedAt: z.number(),
    account: z.number(),
    session: z.number(),
    taughtClasses: z.number(),
    enrolledClass: z.number(),
    attempts: z.number(),
    lessonCompletions: z.number(),
    masteryRecords: z.number(),
    masteryRuns: z.number(),
    gamificationProfile: z.number(),
    achievements: z.number(),
    assignedLessons: z.number()
  }).optional(),
  _sum: z.object({
    gradeLevel: z.number().nullable()
  }).nullable().optional(),
  _avg: z.object({
    gradeLevel: z.number().nullable()
  }).nullable().optional(),
  _min: z.object({
    id: z.string().nullable(),
    name: z.string().nullable(),
    username: z.string().nullable(),
    displayUsername: z.string().nullable(),
    email: z.string().nullable(),
    image: z.string().nullable(),
    gradeLevel: z.number().int().nullable(),
    createdAt: z.date().nullable(),
    updatedAt: z.date().nullable()
  }).nullable().optional(),
  _max: z.object({
    id: z.string().nullable(),
    name: z.string().nullable(),
    username: z.string().nullable(),
    displayUsername: z.string().nullable(),
    email: z.string().nullable(),
    image: z.string().nullable(),
    gradeLevel: z.number().int().nullable(),
    createdAt: z.date().nullable(),
    updatedAt: z.date().nullable()
  }).nullable().optional()
}));