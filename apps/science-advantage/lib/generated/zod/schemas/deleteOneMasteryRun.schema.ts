import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { MasteryRunSelectObjectSchema as MasteryRunSelectObjectSchema } from './objects/MasteryRunSelect.schema';
import { MasteryRunIncludeObjectSchema as MasteryRunIncludeObjectSchema } from './objects/MasteryRunInclude.schema';
import { MasteryRunWhereUniqueInputObjectSchema as MasteryRunWhereUniqueInputObjectSchema } from './objects/MasteryRunWhereUniqueInput.schema';

export const MasteryRunDeleteOneSchema: z.ZodType<Prisma.MasteryRunDeleteArgs> = z.object({ select: MasteryRunSelectObjectSchema.optional(), include: MasteryRunIncludeObjectSchema.optional(), where: MasteryRunWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.MasteryRunDeleteArgs>;

export const MasteryRunDeleteOneZodSchema = z.object({ select: MasteryRunSelectObjectSchema.optional(), include: MasteryRunIncludeObjectSchema.optional(), where: MasteryRunWhereUniqueInputObjectSchema }).strict();