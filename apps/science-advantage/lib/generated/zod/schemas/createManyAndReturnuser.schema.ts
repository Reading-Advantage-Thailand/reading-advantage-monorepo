import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { userSelectObjectSchema as userSelectObjectSchema } from './objects/userSelect.schema';
import { userCreateManyInputObjectSchema as userCreateManyInputObjectSchema } from './objects/userCreateManyInput.schema';

export const userCreateManyAndReturnSchema: z.ZodType<Prisma.userCreateManyAndReturnArgs> = z.object({ select: userSelectObjectSchema.optional(), data: z.union([ userCreateManyInputObjectSchema, z.array(userCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.userCreateManyAndReturnArgs>;

export const userCreateManyAndReturnZodSchema = z.object({ select: userSelectObjectSchema.optional(), data: z.union([ userCreateManyInputObjectSchema, z.array(userCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();