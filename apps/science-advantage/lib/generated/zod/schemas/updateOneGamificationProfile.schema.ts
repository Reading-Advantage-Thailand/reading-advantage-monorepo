import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { GamificationProfileSelectObjectSchema as GamificationProfileSelectObjectSchema } from './objects/GamificationProfileSelect.schema';
import { GamificationProfileIncludeObjectSchema as GamificationProfileIncludeObjectSchema } from './objects/GamificationProfileInclude.schema';
import { GamificationProfileUpdateInputObjectSchema as GamificationProfileUpdateInputObjectSchema } from './objects/GamificationProfileUpdateInput.schema';
import { GamificationProfileUncheckedUpdateInputObjectSchema as GamificationProfileUncheckedUpdateInputObjectSchema } from './objects/GamificationProfileUncheckedUpdateInput.schema';
import { GamificationProfileWhereUniqueInputObjectSchema as GamificationProfileWhereUniqueInputObjectSchema } from './objects/GamificationProfileWhereUniqueInput.schema';

export const GamificationProfileUpdateOneSchema: z.ZodType<Prisma.GamificationProfileUpdateArgs> = z.object({ select: GamificationProfileSelectObjectSchema.optional(), include: GamificationProfileIncludeObjectSchema.optional(), data: z.union([GamificationProfileUpdateInputObjectSchema, GamificationProfileUncheckedUpdateInputObjectSchema]), where: GamificationProfileWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.GamificationProfileUpdateArgs>;

export const GamificationProfileUpdateOneZodSchema = z.object({ select: GamificationProfileSelectObjectSchema.optional(), include: GamificationProfileIncludeObjectSchema.optional(), data: z.union([GamificationProfileUpdateInputObjectSchema, GamificationProfileUncheckedUpdateInputObjectSchema]), where: GamificationProfileWhereUniqueInputObjectSchema }).strict();