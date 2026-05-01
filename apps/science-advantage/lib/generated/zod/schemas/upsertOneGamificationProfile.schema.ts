import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { GamificationProfileSelectObjectSchema as GamificationProfileSelectObjectSchema } from './objects/GamificationProfileSelect.schema';
import { GamificationProfileIncludeObjectSchema as GamificationProfileIncludeObjectSchema } from './objects/GamificationProfileInclude.schema';
import { GamificationProfileWhereUniqueInputObjectSchema as GamificationProfileWhereUniqueInputObjectSchema } from './objects/GamificationProfileWhereUniqueInput.schema';
import { GamificationProfileCreateInputObjectSchema as GamificationProfileCreateInputObjectSchema } from './objects/GamificationProfileCreateInput.schema';
import { GamificationProfileUncheckedCreateInputObjectSchema as GamificationProfileUncheckedCreateInputObjectSchema } from './objects/GamificationProfileUncheckedCreateInput.schema';
import { GamificationProfileUpdateInputObjectSchema as GamificationProfileUpdateInputObjectSchema } from './objects/GamificationProfileUpdateInput.schema';
import { GamificationProfileUncheckedUpdateInputObjectSchema as GamificationProfileUncheckedUpdateInputObjectSchema } from './objects/GamificationProfileUncheckedUpdateInput.schema';

export const GamificationProfileUpsertOneSchema: z.ZodType<Prisma.GamificationProfileUpsertArgs> = z.object({ select: GamificationProfileSelectObjectSchema.optional(), include: GamificationProfileIncludeObjectSchema.optional(), where: GamificationProfileWhereUniqueInputObjectSchema, create: z.union([ GamificationProfileCreateInputObjectSchema, GamificationProfileUncheckedCreateInputObjectSchema ]), update: z.union([ GamificationProfileUpdateInputObjectSchema, GamificationProfileUncheckedUpdateInputObjectSchema ]) }).strict() as unknown as z.ZodType<Prisma.GamificationProfileUpsertArgs>;

export const GamificationProfileUpsertOneZodSchema = z.object({ select: GamificationProfileSelectObjectSchema.optional(), include: GamificationProfileIncludeObjectSchema.optional(), where: GamificationProfileWhereUniqueInputObjectSchema, create: z.union([ GamificationProfileCreateInputObjectSchema, GamificationProfileUncheckedCreateInputObjectSchema ]), update: z.union([ GamificationProfileUpdateInputObjectSchema, GamificationProfileUncheckedUpdateInputObjectSchema ]) }).strict();