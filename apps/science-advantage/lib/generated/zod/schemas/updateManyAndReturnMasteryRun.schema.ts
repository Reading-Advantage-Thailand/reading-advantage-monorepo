import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { MasteryRunSelectObjectSchema as MasteryRunSelectObjectSchema } from './objects/MasteryRunSelect.schema';
import { MasteryRunUpdateManyMutationInputObjectSchema as MasteryRunUpdateManyMutationInputObjectSchema } from './objects/MasteryRunUpdateManyMutationInput.schema';
import { MasteryRunWhereInputObjectSchema as MasteryRunWhereInputObjectSchema } from './objects/MasteryRunWhereInput.schema';

export const MasteryRunUpdateManyAndReturnSchema: z.ZodType<Prisma.MasteryRunUpdateManyAndReturnArgs> = z.object({ select: MasteryRunSelectObjectSchema.optional(), data: MasteryRunUpdateManyMutationInputObjectSchema, where: MasteryRunWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.MasteryRunUpdateManyAndReturnArgs>;

export const MasteryRunUpdateManyAndReturnZodSchema = z.object({ select: MasteryRunSelectObjectSchema.optional(), data: MasteryRunUpdateManyMutationInputObjectSchema, where: MasteryRunWhereInputObjectSchema.optional() }).strict();