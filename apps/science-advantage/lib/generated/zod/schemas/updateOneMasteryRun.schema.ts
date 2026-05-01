import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { MasteryRunSelectObjectSchema as MasteryRunSelectObjectSchema } from './objects/MasteryRunSelect.schema';
import { MasteryRunIncludeObjectSchema as MasteryRunIncludeObjectSchema } from './objects/MasteryRunInclude.schema';
import { MasteryRunUpdateInputObjectSchema as MasteryRunUpdateInputObjectSchema } from './objects/MasteryRunUpdateInput.schema';
import { MasteryRunUncheckedUpdateInputObjectSchema as MasteryRunUncheckedUpdateInputObjectSchema } from './objects/MasteryRunUncheckedUpdateInput.schema';
import { MasteryRunWhereUniqueInputObjectSchema as MasteryRunWhereUniqueInputObjectSchema } from './objects/MasteryRunWhereUniqueInput.schema';

export const MasteryRunUpdateOneSchema: z.ZodType<Prisma.MasteryRunUpdateArgs> = z.object({ select: MasteryRunSelectObjectSchema.optional(), include: MasteryRunIncludeObjectSchema.optional(), data: z.union([MasteryRunUpdateInputObjectSchema, MasteryRunUncheckedUpdateInputObjectSchema]), where: MasteryRunWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.MasteryRunUpdateArgs>;

export const MasteryRunUpdateOneZodSchema = z.object({ select: MasteryRunSelectObjectSchema.optional(), include: MasteryRunIncludeObjectSchema.optional(), data: z.union([MasteryRunUpdateInputObjectSchema, MasteryRunUncheckedUpdateInputObjectSchema]), where: MasteryRunWhereUniqueInputObjectSchema }).strict();