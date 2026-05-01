import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { ClassSelectObjectSchema as ClassSelectObjectSchema } from './objects/ClassSelect.schema';
import { ClassIncludeObjectSchema as ClassIncludeObjectSchema } from './objects/ClassInclude.schema';
import { ClassCreateInputObjectSchema as ClassCreateInputObjectSchema } from './objects/ClassCreateInput.schema';
import { ClassUncheckedCreateInputObjectSchema as ClassUncheckedCreateInputObjectSchema } from './objects/ClassUncheckedCreateInput.schema';

export const ClassCreateOneSchema: z.ZodType<Prisma.ClassCreateArgs> = z.object({ select: ClassSelectObjectSchema.optional(), include: ClassIncludeObjectSchema.optional(), data: z.union([ClassCreateInputObjectSchema, ClassUncheckedCreateInputObjectSchema]) }).strict() as unknown as z.ZodType<Prisma.ClassCreateArgs>;

export const ClassCreateOneZodSchema = z.object({ select: ClassSelectObjectSchema.optional(), include: ClassIncludeObjectSchema.optional(), data: z.union([ClassCreateInputObjectSchema, ClassUncheckedCreateInputObjectSchema]) }).strict();