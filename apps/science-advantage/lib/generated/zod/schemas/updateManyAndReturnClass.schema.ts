import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { ClassSelectObjectSchema as ClassSelectObjectSchema } from './objects/ClassSelect.schema';
import { ClassUpdateManyMutationInputObjectSchema as ClassUpdateManyMutationInputObjectSchema } from './objects/ClassUpdateManyMutationInput.schema';
import { ClassWhereInputObjectSchema as ClassWhereInputObjectSchema } from './objects/ClassWhereInput.schema';

export const ClassUpdateManyAndReturnSchema: z.ZodType<Prisma.ClassUpdateManyAndReturnArgs> = z.object({ select: ClassSelectObjectSchema.optional(), data: ClassUpdateManyMutationInputObjectSchema, where: ClassWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.ClassUpdateManyAndReturnArgs>;

export const ClassUpdateManyAndReturnZodSchema = z.object({ select: ClassSelectObjectSchema.optional(), data: ClassUpdateManyMutationInputObjectSchema, where: ClassWhereInputObjectSchema.optional() }).strict();