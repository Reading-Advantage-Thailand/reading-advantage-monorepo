import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardMasteryStudentIdStandardIdCompoundUniqueInputObjectSchema as StandardMasteryStudentIdStandardIdCompoundUniqueInputObjectSchema } from './StandardMasteryStudentIdStandardIdCompoundUniqueInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  studentId_standardId: z.lazy(() => StandardMasteryStudentIdStandardIdCompoundUniqueInputObjectSchema).optional()
}).strict();
export const StandardMasteryWhereUniqueInputObjectSchema: z.ZodType<Prisma.StandardMasteryWhereUniqueInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryWhereUniqueInput>;
export const StandardMasteryWhereUniqueInputObjectZodSchema = makeSchema();
