import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { StandardMasteryWhereInputObjectSchema as StandardMasteryWhereInputObjectSchema } from './objects/StandardMasteryWhereInput.schema';

export const StandardMasteryDeleteManySchema: z.ZodType<Prisma.StandardMasteryDeleteManyArgs> = z.object({ where: StandardMasteryWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.StandardMasteryDeleteManyArgs>;

export const StandardMasteryDeleteManyZodSchema = z.object({ where: StandardMasteryWhereInputObjectSchema.optional() }).strict();