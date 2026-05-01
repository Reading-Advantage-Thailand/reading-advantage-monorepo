import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { GamificationProfileSelectObjectSchema as GamificationProfileSelectObjectSchema } from './objects/GamificationProfileSelect.schema';
import { GamificationProfileIncludeObjectSchema as GamificationProfileIncludeObjectSchema } from './objects/GamificationProfileInclude.schema';
import { GamificationProfileWhereUniqueInputObjectSchema as GamificationProfileWhereUniqueInputObjectSchema } from './objects/GamificationProfileWhereUniqueInput.schema';

export const GamificationProfileFindUniqueOrThrowSchema: z.ZodType<Prisma.GamificationProfileFindUniqueOrThrowArgs> = z.object({ select: GamificationProfileSelectObjectSchema.optional(), include: GamificationProfileIncludeObjectSchema.optional(), where: GamificationProfileWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.GamificationProfileFindUniqueOrThrowArgs>;

export const GamificationProfileFindUniqueOrThrowZodSchema = z.object({ select: GamificationProfileSelectObjectSchema.optional(), include: GamificationProfileIncludeObjectSchema.optional(), where: GamificationProfileWhereUniqueInputObjectSchema }).strict();