import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { GamificationProfileSelectObjectSchema as GamificationProfileSelectObjectSchema } from './objects/GamificationProfileSelect.schema';
import { GamificationProfileUpdateManyMutationInputObjectSchema as GamificationProfileUpdateManyMutationInputObjectSchema } from './objects/GamificationProfileUpdateManyMutationInput.schema';
import { GamificationProfileWhereInputObjectSchema as GamificationProfileWhereInputObjectSchema } from './objects/GamificationProfileWhereInput.schema';

export const GamificationProfileUpdateManyAndReturnSchema: z.ZodType<Prisma.GamificationProfileUpdateManyAndReturnArgs> = z.object({ select: GamificationProfileSelectObjectSchema.optional(), data: GamificationProfileUpdateManyMutationInputObjectSchema, where: GamificationProfileWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.GamificationProfileUpdateManyAndReturnArgs>;

export const GamificationProfileUpdateManyAndReturnZodSchema = z.object({ select: GamificationProfileSelectObjectSchema.optional(), data: GamificationProfileUpdateManyMutationInputObjectSchema, where: GamificationProfileWhereInputObjectSchema.optional() }).strict();