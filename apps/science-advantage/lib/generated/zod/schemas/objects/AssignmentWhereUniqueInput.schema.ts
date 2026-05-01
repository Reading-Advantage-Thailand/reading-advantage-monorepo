import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AssignmentClassIdLessonIdCompoundUniqueInputObjectSchema as AssignmentClassIdLessonIdCompoundUniqueInputObjectSchema } from './AssignmentClassIdLessonIdCompoundUniqueInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  classId_lessonId: z.lazy(() => AssignmentClassIdLessonIdCompoundUniqueInputObjectSchema).optional()
}).strict();
export const AssignmentWhereUniqueInputObjectSchema: z.ZodType<Prisma.AssignmentWhereUniqueInput> = makeSchema() as unknown as z.ZodType<Prisma.AssignmentWhereUniqueInput>;
export const AssignmentWhereUniqueInputObjectZodSchema = makeSchema();
