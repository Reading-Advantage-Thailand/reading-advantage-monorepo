import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { GamificationProfileCreateManyInputObjectSchema as GamificationProfileCreateManyInputObjectSchema } from './objects/GamificationProfileCreateManyInput.schema';

export const GamificationProfileCreateManySchema: z.ZodType<Prisma.GamificationProfileCreateManyArgs> = z.object({ data: z.union([ GamificationProfileCreateManyInputObjectSchema, z.array(GamificationProfileCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.GamificationProfileCreateManyArgs>;

export const GamificationProfileCreateManyZodSchema = z.object({ data: z.union([ GamificationProfileCreateManyInputObjectSchema, z.array(GamificationProfileCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();