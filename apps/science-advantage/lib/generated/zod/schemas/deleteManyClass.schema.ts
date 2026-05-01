import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { ClassWhereInputObjectSchema as ClassWhereInputObjectSchema } from './objects/ClassWhereInput.schema';

export const ClassDeleteManySchema: z.ZodType<Prisma.ClassDeleteManyArgs> = z.object({ where: ClassWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.ClassDeleteManyArgs>;

export const ClassDeleteManyZodSchema = z.object({ where: ClassWhereInputObjectSchema.optional() }).strict();