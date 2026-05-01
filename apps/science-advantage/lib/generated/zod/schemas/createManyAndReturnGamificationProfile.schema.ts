import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { GamificationProfileSelectObjectSchema as GamificationProfileSelectObjectSchema } from './objects/GamificationProfileSelect.schema';
import { GamificationProfileCreateManyInputObjectSchema as GamificationProfileCreateManyInputObjectSchema } from './objects/GamificationProfileCreateManyInput.schema';

export const GamificationProfileCreateManyAndReturnSchema: z.ZodType<Prisma.GamificationProfileCreateManyAndReturnArgs> = z.object({ select: GamificationProfileSelectObjectSchema.optional(), data: z.union([ GamificationProfileCreateManyInputObjectSchema, z.array(GamificationProfileCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.GamificationProfileCreateManyAndReturnArgs>;

export const GamificationProfileCreateManyAndReturnZodSchema = z.object({ select: GamificationProfileSelectObjectSchema.optional(), data: z.union([ GamificationProfileCreateManyInputObjectSchema, z.array(GamificationProfileCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();