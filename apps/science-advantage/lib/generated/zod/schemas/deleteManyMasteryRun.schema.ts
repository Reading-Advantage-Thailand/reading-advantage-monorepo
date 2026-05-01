import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { MasteryRunWhereInputObjectSchema as MasteryRunWhereInputObjectSchema } from './objects/MasteryRunWhereInput.schema';

export const MasteryRunDeleteManySchema: z.ZodType<Prisma.MasteryRunDeleteManyArgs> = z.object({ where: MasteryRunWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.MasteryRunDeleteManyArgs>;

export const MasteryRunDeleteManyZodSchema = z.object({ where: MasteryRunWhereInputObjectSchema.optional() }).strict();