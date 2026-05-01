import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { sessionCreateManyUserInputObjectSchema as sessionCreateManyUserInputObjectSchema } from './sessionCreateManyUserInput.schema'

const makeSchema = () => z.object({
  data: z.union([z.lazy(() => sessionCreateManyUserInputObjectSchema), z.lazy(() => sessionCreateManyUserInputObjectSchema).array()]),
  skipDuplicates: z.boolean().optional()
}).strict();
export const sessionCreateManyUserInputEnvelopeObjectSchema: z.ZodType<Prisma.sessionCreateManyUserInputEnvelope> = makeSchema() as unknown as z.ZodType<Prisma.sessionCreateManyUserInputEnvelope>;
export const sessionCreateManyUserInputEnvelopeObjectZodSchema = makeSchema();
