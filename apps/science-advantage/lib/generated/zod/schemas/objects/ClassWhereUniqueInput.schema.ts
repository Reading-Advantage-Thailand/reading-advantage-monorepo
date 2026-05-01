import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.string().optional(),
  joinCode: z.string().optional()
}).strict();
export const ClassWhereUniqueInputObjectSchema: z.ZodType<Prisma.ClassWhereUniqueInput> = makeSchema() as unknown as z.ZodType<Prisma.ClassWhereUniqueInput>;
export const ClassWhereUniqueInputObjectZodSchema = makeSchema();
