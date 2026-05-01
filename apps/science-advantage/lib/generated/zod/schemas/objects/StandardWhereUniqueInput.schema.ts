import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StandardFrameworkCodeCompoundUniqueInputObjectSchema as StandardFrameworkCodeCompoundUniqueInputObjectSchema } from './StandardFrameworkCodeCompoundUniqueInput.schema'

const makeSchema = () => z.object({
  id: z.string().optional(),
  framework_code: z.lazy(() => StandardFrameworkCodeCompoundUniqueInputObjectSchema).optional()
}).strict();
export const StandardWhereUniqueInputObjectSchema: z.ZodType<Prisma.StandardWhereUniqueInput> = makeSchema() as unknown as z.ZodType<Prisma.StandardWhereUniqueInput>;
export const StandardWhereUniqueInputObjectZodSchema = makeSchema();
