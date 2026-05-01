import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  studentId: z.string(),
  standardId: z.string()
}).strict();
export const StandardMasteryStudentIdStandardIdCompoundUniqueInputObjectSchema: z.ZodType<Prisma.StandardMasteryStudentIdStandardIdCompoundUniqueInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardMasteryStudentIdStandardIdCompoundUniqueInput>;
export const StandardMasteryStudentIdStandardIdCompoundUniqueInputObjectZodSchema = makeSchema();
