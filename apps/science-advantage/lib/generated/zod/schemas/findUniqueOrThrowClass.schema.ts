import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { ClassSelectObjectSchema as ClassSelectObjectSchema } from './objects/ClassSelect.schema';
import { ClassIncludeObjectSchema as ClassIncludeObjectSchema } from './objects/ClassInclude.schema';
import { ClassWhereUniqueInputObjectSchema as ClassWhereUniqueInputObjectSchema } from './objects/ClassWhereUniqueInput.schema';

export const ClassFindUniqueOrThrowSchema: z.ZodType<Prisma.ClassFindUniqueOrThrowArgs> = z.object({ select: ClassSelectObjectSchema.optional(), include: ClassIncludeObjectSchema.optional(), where: ClassWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.ClassFindUniqueOrThrowArgs>;

export const ClassFindUniqueOrThrowZodSchema = z.object({ select: ClassSelectObjectSchema.optional(), include: ClassIncludeObjectSchema.optional(), where: ClassWhereUniqueInputObjectSchema }).strict();