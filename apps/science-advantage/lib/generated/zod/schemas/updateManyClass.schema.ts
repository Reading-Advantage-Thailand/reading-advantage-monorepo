import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { ClassUpdateManyMutationInputObjectSchema as ClassUpdateManyMutationInputObjectSchema } from './objects/ClassUpdateManyMutationInput.schema';
import { ClassWhereInputObjectSchema as ClassWhereInputObjectSchema } from './objects/ClassWhereInput.schema';

export const ClassUpdateManySchema: z.ZodType<Prisma.ClassUpdateManyArgs> = z.object({ data: ClassUpdateManyMutationInputObjectSchema, where: ClassWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.ClassUpdateManyArgs>;

export const ClassUpdateManyZodSchema = z.object({ data: ClassUpdateManyMutationInputObjectSchema, where: ClassWhereInputObjectSchema.optional() }).strict();