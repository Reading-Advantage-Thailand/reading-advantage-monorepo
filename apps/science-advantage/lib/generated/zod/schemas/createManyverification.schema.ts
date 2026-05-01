import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { verificationCreateManyInputObjectSchema as verificationCreateManyInputObjectSchema } from './objects/verificationCreateManyInput.schema';

export const verificationCreateManySchema: z.ZodType<Prisma.verificationCreateManyArgs> = z.object({ data: z.union([ verificationCreateManyInputObjectSchema, z.array(verificationCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict() as unknown as z.ZodType<Prisma.verificationCreateManyArgs>;

export const verificationCreateManyZodSchema = z.object({ data: z.union([ verificationCreateManyInputObjectSchema, z.array(verificationCreateManyInputObjectSchema) ]), skipDuplicates: z.boolean().optional() }).strict();