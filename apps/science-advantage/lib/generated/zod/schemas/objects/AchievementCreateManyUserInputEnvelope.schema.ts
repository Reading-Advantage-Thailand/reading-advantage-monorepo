import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AchievementCreateManyUserInputObjectSchema as AchievementCreateManyUserInputObjectSchema } from './AchievementCreateManyUserInput.schema'

const makeSchema = () => z.object({
  data: z.union([z.lazy(() => AchievementCreateManyUserInputObjectSchema), z.lazy(() => AchievementCreateManyUserInputObjectSchema).array()]),
  skipDuplicates: z.boolean().optional()
}).strict();
export const AchievementCreateManyUserInputEnvelopeObjectSchema: z.ZodType<Prisma.AchievementCreateManyUserInputEnvelope> = makeSchema() as unknown as z.ZodType<Prisma.AchievementCreateManyUserInputEnvelope>;
export const AchievementCreateManyUserInputEnvelopeObjectZodSchema = makeSchema();
