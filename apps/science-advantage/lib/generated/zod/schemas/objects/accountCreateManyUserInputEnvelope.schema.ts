import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { accountCreateManyUserInputObjectSchema as accountCreateManyUserInputObjectSchema } from './accountCreateManyUserInput.schema'

const makeSchema = () => z.object({
  data: z.union([z.lazy(() => accountCreateManyUserInputObjectSchema), z.lazy(() => accountCreateManyUserInputObjectSchema).array()]),
  skipDuplicates: z.boolean().optional()
}).strict();
export const accountCreateManyUserInputEnvelopeObjectSchema: z.ZodType<Prisma.accountCreateManyUserInputEnvelope> = makeSchema() as unknown as z.ZodType<Prisma.accountCreateManyUserInputEnvelope>;
export const accountCreateManyUserInputEnvelopeObjectZodSchema = makeSchema();
