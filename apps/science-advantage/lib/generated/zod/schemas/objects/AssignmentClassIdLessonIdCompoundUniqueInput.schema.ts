import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  classId: z.string(),
  lessonId: z.string()
}).strict();
export const AssignmentClassIdLessonIdCompoundUniqueInputObjectSchema: z.ZodType<Prisma.AssignmentClassIdLessonIdCompoundUniqueInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentClassIdLessonIdCompoundUniqueInput>;
export const AssignmentClassIdLessonIdCompoundUniqueInputObjectZodSchema = makeSchema();
