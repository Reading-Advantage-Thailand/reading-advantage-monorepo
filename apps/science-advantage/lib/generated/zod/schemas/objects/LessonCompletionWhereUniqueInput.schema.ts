import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { LessonCompletionStudentIdLessonIdCompoundUniqueInputObjectSchema as LessonCompletionStudentIdLessonIdCompoundUniqueInputObjectSchema } from './LessonCompletionStudentIdLessonIdCompoundUniqueInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  studentId_lessonId: z.lazy(() => LessonCompletionStudentIdLessonIdCompoundUniqueInputObjectSchema).optional()
}).strict();
export const LessonCompletionWhereUniqueInputObjectSchema: z.ZodType<Prisma.LessonCompletionWhereUniqueInput> = makeSchema() as unknown as z.ZodType<Prisma.LessonCompletionWhereUniqueInput>;
export const LessonCompletionWhereUniqueInputObjectZodSchema = makeSchema();
