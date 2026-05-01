import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { verificationSelectObjectSchema as verificationSelectObjectSchema } from './objects/verificationSelect.schema';
import { verificationCreateManyInputObjectSchema as verificationCreateManyInputObjectSchema } from './objects/verificationCreateManyInput.schema';

export const verificationCreateManyAndReturnSchema: z.ZodType<Prisma.verificationCreateManyAndReturnArgs> = z.object({ select: verificationSelectObjectSchema.optional(), data: z.union([ verificationCreateManyInputObjectSchema, z.array(verificationCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.verificationCreateManyAndReturnArgs>;

export const verificationCreateManyAndReturnZodSchema = z.object({ select: verificationSelectObjectSchema.optional(), data: z.union([ verificationCreateManyInputObjectSchema, z.array(verificationCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();