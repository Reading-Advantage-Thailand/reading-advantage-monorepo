import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptCreateManyLessonInputObjectSchema as AttemptCreateManyLessonInputObjectSchema } from './AttemptCreateManyLessonInput.schema'

const makeSchema = () => z.object({
  data: z.union([z.lazy(() => AttemptCreateManyLessonInputObjectSchema), z.lazy(() => AttemptCreateManyLessonInputObjectSchema).array()]),
  skipDuplicates: z.boolean().optional()
}).strict();
export const AttemptCreateManyLessonInputEnvelopeObjectSchema: z.ZodType<Prisma.AttemptCreateManyLessonInputEnvelope> = makeSchema() as unknown as z.ZodType<Prisma.AttemptCreateManyLessonInputEnvelope>;
export const AttemptCreateManyLessonInputEnvelopeObjectZodSchema = makeSchema();
