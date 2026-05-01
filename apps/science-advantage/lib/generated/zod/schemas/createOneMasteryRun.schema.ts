import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { MasteryRunSelectObjectSchema as MasteryRunSelectObjectSchema } from './objects/MasteryRunSelect.schema';
import { MasteryRunIncludeObjectSchema as MasteryRunIncludeObjectSchema } from './objects/MasteryRunInclude.schema';
import { MasteryRunCreateInputObjectSchema as MasteryRunCreateInputObjectSchema } from './objects/MasteryRunCreateInput.schema';
import { MasteryRunUncheckedCreateInputObjectSchema as MasteryRunUncheckedCreateInputObjectSchema } from './objects/MasteryRunUncheckedCreateInput.schema';

export const MasteryRunCreateOneSchema: z.ZodType<Prisma.MasteryRunCreateArgs> = z.object({ select: MasteryRunSelectObjectSchema.optional(), include: MasteryRunIncludeObjectSchema.optional(), data: z.union([MasteryRunCreateInputObjectSchema, MasteryRunUncheckedCreateInputObjectSchema]) }).strict() as unknown as z.ZodType<Prisma.MasteryRunCreateArgs>;

export const MasteryRunCreateOneZodSchema = z.object({ select: MasteryRunSelectObjectSchema.optional(), include: MasteryRunIncludeObjectSchema.optional(), data: z.union([MasteryRunCreateInputObjectSchema, MasteryRunUncheckedCreateInputObjectSchema]) }).strict();