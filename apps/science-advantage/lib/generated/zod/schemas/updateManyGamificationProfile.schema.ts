import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { GamificationProfileUpdateManyMutationInputObjectSchema as GamificationProfileUpdateManyMutationInputObjectSchema } from './objects/GamificationProfileUpdateManyMutationInput.schema';
import { GamificationProfileWhereInputObjectSchema as GamificationProfileWhereInputObjectSchema } from './objects/GamificationProfileWhereInput.schema';

export const GamificationProfileUpdateManySchema: z.ZodType<Prisma.GamificationProfileUpdateManyArgs> = z.object({ data: GamificationProfileUpdateManyMutationInputObjectSchema, where: GamificationProfileWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.GamificationProfileUpdateManyArgs>;

export const GamificationProfileUpdateManyZodSchema = z.object({ data: GamificationProfileUpdateManyMutationInputObjectSchema, where: GamificationProfileWhereInputObjectSchema.optional() }).strict();