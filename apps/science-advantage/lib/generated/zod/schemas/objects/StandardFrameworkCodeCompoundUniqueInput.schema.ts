import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardsAlignmentSchema } from '../enums/StandardsAlignment.schema'

const makeSchema = () => z.object({
  framework: StandardsAlignmentSchema,
  code: z.string()
}).strict();
export const StandardFrameworkCodeCompoundUniqueInputObjectSchema: z.ZodType<Prisma.StandardFrameworkCodeCompoundUniqueInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardFrameworkCodeCompoundUniqueInput>;
export const StandardFrameworkCodeCompoundUniqueInputObjectZodSchema = makeSchema();
