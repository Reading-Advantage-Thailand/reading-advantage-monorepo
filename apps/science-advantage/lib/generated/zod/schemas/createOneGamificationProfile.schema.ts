import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { GamificationProfileSelectObjectSchema as GamificationProfileSelectObjectSchema } from './objects/GamificationProfileSelect.schema';
import { GamificationProfileIncludeObjectSchema as GamificationProfileIncludeObjectSchema } from './objects/GamificationProfileInclude.schema';
import { GamificationProfileCreateInputObjectSchema as GamificationProfileCreateInputObjectSchema } from './objects/GamificationProfileCreateInput.schema';
import { GamificationProfileUncheckedCreateInputObjectSchema as GamificationProfileUncheckedCreateInputObjectSchema } from './objects/GamificationProfileUncheckedCreateInput.schema';

export const GamificationProfileCreateOneSchema: z.ZodType<Prisma.GamificationProfileCreateArgs> = z.object({ select: GamificationProfileSelectObjectSchema.optional(), include: GamificationProfileIncludeObjectSchema.optional(), data: z.union([GamificationProfileCreateInputObjectSchema, GamificationProfileUncheckedCreateInputObjectSchema]) }).strict() as unknown as z.ZodType<Prisma.GamificationProfileCreateArgs>;

export const GamificationProfileCreateOneZodSchema = z.object({ select: GamificationProfileSelectObjectSchema.optional(), include: GamificationProfileIncludeObjectSchema.optional(), data: z.union([GamificationProfileCreateInputObjectSchema, GamificationProfileUncheckedCreateInputObjectSchema]) }).strict();