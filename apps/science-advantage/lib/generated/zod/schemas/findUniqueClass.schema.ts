import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { ClassSelectObjectSchema as ClassSelectObjectSchema } from './objects/ClassSelect.schema';
import { ClassIncludeObjectSchema as ClassIncludeObjectSchema } from './objects/ClassInclude.schema';
import { ClassWhereUniqueInputObjectSchema as ClassWhereUniqueInputObjectSchema } from './objects/ClassWhereUniqueInput.schema';

export const ClassFindUniqueSchema: z.ZodType<Prisma.ClassFindUniqueArgs> = z.object({ select: ClassSelectObjectSchema.optional(), include: ClassIncludeObjectSchema.optional(), where: ClassWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.ClassFindUniqueArgs>;

export const ClassFindUniqueZodSchema = z.object({ select: ClassSelectObjectSchema.optional(), include: ClassIncludeObjectSchema.optional(), where: ClassWhereUniqueInputObjectSchema }).strict();