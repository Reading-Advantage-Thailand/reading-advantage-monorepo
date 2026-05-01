import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { ClassSelectObjectSchema as ClassSelectObjectSchema } from './objects/ClassSelect.schema';
import { ClassIncludeObjectSchema as ClassIncludeObjectSchema } from './objects/ClassInclude.schema';
import { ClassWhereUniqueInputObjectSchema as ClassWhereUniqueInputObjectSchema } from './objects/ClassWhereUniqueInput.schema';

export const ClassDeleteOneSchema: z.ZodType<Prisma.ClassDeleteArgs> = z.object({ select: ClassSelectObjectSchema.optional(), include: ClassIncludeObjectSchema.optional(), where: ClassWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.ClassDeleteArgs>;

export const ClassDeleteOneZodSchema = z.object({ select: ClassSelectObjectSchema.optional(), include: ClassIncludeObjectSchema.optional(), where: ClassWhereUniqueInputObjectSchema }).strict();