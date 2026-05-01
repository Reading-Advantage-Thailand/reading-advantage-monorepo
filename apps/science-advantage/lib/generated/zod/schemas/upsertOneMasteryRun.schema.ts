import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { MasteryRunSelectObjectSchema as MasteryRunSelectObjectSchema } from './objects/MasteryRunSelect.schema';
import { MasteryRunIncludeObjectSchema as MasteryRunIncludeObjectSchema } from './objects/MasteryRunInclude.schema';
import { MasteryRunWhereUniqueInputObjectSchema as MasteryRunWhereUniqueInputObjectSchema } from './objects/MasteryRunWhereUniqueInput.schema';
import { MasteryRunCreateInputObjectSchema as MasteryRunCreateInputObjectSchema } from './objects/MasteryRunCreateInput.schema';
import { MasteryRunUncheckedCreateInputObjectSchema as MasteryRunUncheckedCreateInputObjectSchema } from './objects/MasteryRunUncheckedCreateInput.schema';
import { MasteryRunUpdateInputObjectSchema as MasteryRunUpdateInputObjectSchema } from './objects/MasteryRunUpdateInput.schema';
import { MasteryRunUncheckedUpdateInputObjectSchema as MasteryRunUncheckedUpdateInputObjectSchema } from './objects/MasteryRunUncheckedUpdateInput.schema';

export const MasteryRunUpsertOneSchema: z.ZodType<Prisma.MasteryRunUpsertArgs> = z.object({ select: MasteryRunSelectObjectSchema.optional(), include: MasteryRunIncludeObjectSchema.optional(), where: MasteryRunWhereUniqueInputObjectSchema, create: z.union([ MasteryRunCreateInputObjectSchema, MasteryRunUncheckedCreateInputObjectSchema ]), update: z.union([ MasteryRunUpdateInputObjectSchema, MasteryRunUncheckedUpdateInputObjectSchema ]) }).strict() as unknown as z.ZodType<Prisma.MasteryRunUpsertArgs>;

export const MasteryRunUpsertOneZodSchema = z.object({ select: MasteryRunSelectObjectSchema.optional(), include: MasteryRunIncludeObjectSchema.optional(), where: MasteryRunWhereUniqueInputObjectSchema, create: z.union([ MasteryRunCreateInputObjectSchema, MasteryRunUncheckedCreateInputObjectSchema ]), update: z.union([ MasteryRunUpdateInputObjectSchema, MasteryRunUncheckedUpdateInputObjectSchema ]) }).strict();