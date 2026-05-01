import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { ClassSelectObjectSchema as ClassSelectObjectSchema } from './objects/ClassSelect.schema';
import { ClassIncludeObjectSchema as ClassIncludeObjectSchema } from './objects/ClassInclude.schema';
import { ClassWhereUniqueInputObjectSchema as ClassWhereUniqueInputObjectSchema } from './objects/ClassWhereUniqueInput.schema';
import { ClassCreateInputObjectSchema as ClassCreateInputObjectSchema } from './objects/ClassCreateInput.schema';
import { ClassUncheckedCreateInputObjectSchema as ClassUncheckedCreateInputObjectSchema } from './objects/ClassUncheckedCreateInput.schema';
import { ClassUpdateInputObjectSchema as ClassUpdateInputObjectSchema } from './objects/ClassUpdateInput.schema';
import { ClassUncheckedUpdateInputObjectSchema as ClassUncheckedUpdateInputObjectSchema } from './objects/ClassUncheckedUpdateInput.schema';

export const ClassUpsertOneSchema: z.ZodType<Prisma.ClassUpsertArgs> = z.object({ select: ClassSelectObjectSchema.optional(), include: ClassIncludeObjectSchema.optional(), where: ClassWhereUniqueInputObjectSchema, create: z.union([ ClassCreateInputObjectSchema, ClassUncheckedCreateInputObjectSchema ]), update: z.union([ ClassUpdateInputObjectSchema, ClassUncheckedUpdateInputObjectSchema ]) }).strict() as unknown as z.ZodType<Prisma.ClassUpsertArgs>;

export const ClassUpsertOneZodSchema = z.object({ select: ClassSelectObjectSchema.optional(), include: ClassIncludeObjectSchema.optional(), where: ClassWhereUniqueInputObjectSchema, create: z.union([ ClassCreateInputObjectSchema, ClassUncheckedCreateInputObjectSchema ]), update: z.union([ ClassUpdateInputObjectSchema, ClassUncheckedUpdateInputObjectSchema ]) }).strict();