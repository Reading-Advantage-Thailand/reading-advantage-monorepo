import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { ClassSelectObjectSchema as ClassSelectObjectSchema } from './objects/ClassSelect.schema';
import { ClassIncludeObjectSchema as ClassIncludeObjectSchema } from './objects/ClassInclude.schema';
import { ClassUpdateInputObjectSchema as ClassUpdateInputObjectSchema } from './objects/ClassUpdateInput.schema';
import { ClassUncheckedUpdateInputObjectSchema as ClassUncheckedUpdateInputObjectSchema } from './objects/ClassUncheckedUpdateInput.schema';
import { ClassWhereUniqueInputObjectSchema as ClassWhereUniqueInputObjectSchema } from './objects/ClassWhereUniqueInput.schema';

export const ClassUpdateOneSchema: z.ZodType<Prisma.ClassUpdateArgs> = z.object({ select: ClassSelectObjectSchema.optional(), include: ClassIncludeObjectSchema.optional(), data: z.union([ClassUpdateInputObjectSchema, ClassUncheckedUpdateInputObjectSchema]), where: ClassWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.ClassUpdateArgs>;

export const ClassUpdateOneZodSchema = z.object({ select: ClassSelectObjectSchema.optional(), include: ClassIncludeObjectSchema.optional(), data: z.union([ClassUpdateInputObjectSchema, ClassUncheckedUpdateInputObjectSchema]), where: ClassWhereUniqueInputObjectSchema }).strict();