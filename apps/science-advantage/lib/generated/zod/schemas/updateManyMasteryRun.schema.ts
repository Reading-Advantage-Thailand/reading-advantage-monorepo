import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { MasteryRunUpdateManyMutationInputObjectSchema as MasteryRunUpdateManyMutationInputObjectSchema } from './objects/MasteryRunUpdateManyMutationInput.schema';
import { MasteryRunWhereInputObjectSchema as MasteryRunWhereInputObjectSchema } from './objects/MasteryRunWhereInput.schema';

export const MasteryRunUpdateManySchema: z.ZodType<Prisma.MasteryRunUpdateManyArgs> = z.object({ data: MasteryRunUpdateManyMutationInputObjectSchema, where: MasteryRunWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.MasteryRunUpdateManyArgs>;

export const MasteryRunUpdateManyZodSchema = z.object({ data: MasteryRunUpdateManyMutationInputObjectSchema, where: MasteryRunWhereInputObjectSchema.optional() }).strict();