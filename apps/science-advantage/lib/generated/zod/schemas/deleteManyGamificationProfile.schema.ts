import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { GamificationProfileWhereInputObjectSchema as GamificationProfileWhereInputObjectSchema } from './objects/GamificationProfileWhereInput.schema';

export const GamificationProfileDeleteManySchema: z.ZodType<Prisma.GamificationProfileDeleteManyArgs> = z.object({ where: GamificationProfileWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.GamificationProfileDeleteManyArgs>;

export const GamificationProfileDeleteManyZodSchema = z.object({ where: GamificationProfileWhereInputObjectSchema.optional() }).strict();