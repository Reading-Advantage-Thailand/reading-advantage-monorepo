import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  studentId: z.string(),
  lessonId: z.string(),
  attemptNumber: z.number().int()
}).strict();
export const AttemptStudentIdLessonIdAttemptNumberCompoundUniqueInputObjectSchema: z.ZodType<Prisma.AttemptStudentIdLessonIdAttemptNumberCompoundUniqueInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptStudentIdLessonIdAttemptNumberCompoundUniqueInput>;
export const AttemptStudentIdLessonIdAttemptNumberCompoundUniqueInputObjectZodSchema = makeSchema();
