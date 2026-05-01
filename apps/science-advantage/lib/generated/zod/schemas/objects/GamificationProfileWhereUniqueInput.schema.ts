import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.string().optional(),
  userId: z.string().optional()
}).strict();
export const GamificationProfileWhereUniqueInputObjectSchema: z.ZodType<Prisma.GamificationProfileWhereUniqueInput> = makeSchema() as unknown as z.ZodType<Prisma.GamificationProfileWhereUniqueInput>;
export const GamificationProfileWhereUniqueInputObjectZodSchema = makeSchema();
