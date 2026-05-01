import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptStudentIdLessonIdAttemptNumberCompoundUniqueInputObjectSchema as AttemptStudentIdLessonIdAttemptNumberCompoundUniqueInputObjectSchema } from './AttemptStudentIdLessonIdAttemptNumberCompoundUniqueInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  studentId_lessonId_attemptNumber: z.lazy(() => AttemptStudentIdLessonIdAttemptNumberCompoundUniqueInputObjectSchema).optional()
}).strict();
export const AttemptWhereUniqueInputObjectSchema: z.ZodType<Prisma.AttemptWhereUniqueInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptWhereUniqueInput>;
export const AttemptWhereUniqueInputObjectZodSchema = makeSchema();
