import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { ClassCreateManyTeacherInputObjectSchema as ClassCreateManyTeacherInputObjectSchema } from './ClassCreateManyTeacherInput.schema'

const makeSchema = () => z.object({
  data: z.union([z.lazy(() => ClassCreateManyTeacherInputObjectSchema), z.lazy(() => ClassCreateManyTeacherInputObjectSchema).array()]),
  skipDuplicates: z.boolean().optional()
}).strict();
export const ClassCreateManyTeacherInputEnvelopeObjectSchema: z.ZodType<Prisma.ClassCreateManyTeacherInputEnvelope> = makeSchema() as unknown as z.ZodType<Prisma.ClassCreateManyTeacherInputEnvelope>;
export const ClassCreateManyTeacherInputEnvelopeObjectZodSchema = makeSchema();
