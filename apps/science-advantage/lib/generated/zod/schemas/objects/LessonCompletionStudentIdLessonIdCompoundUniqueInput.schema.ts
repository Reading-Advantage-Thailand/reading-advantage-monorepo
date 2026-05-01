import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  studentId: z.string(),
  lessonId: z.string()
}).strict();
export const LessonCompletionStudentIdLessonIdCompoundUniqueInputObjectSchema: z.ZodType<Prisma.LessonCompletionStudentIdLessonIdCompoundUniqueInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionStudentIdLessonIdCompoundUniqueInput>;
export const LessonCompletionStudentIdLessonIdCompoundUniqueInputObjectZodSchema = makeSchema();
