import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { sessionUpdateManyMutationInputObjectSchema as sessionUpdateManyMutationInputObjectSchema } from './objects/sessionUpdateManyMutationInput.schema';
import { sessionWhereInputObjectSchema as sessionWhereInputObjectSchema } from './objects/sessionWhereInput.schema';

export const sessionUpdateManySchema: z.ZodType<Prisma.sessionUpdateManyArgs> = z.object({ data: sessionUpdateManyMutationInputObjectSchema, where: sessionWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.sessionUpdateManyArgs>;

export const sessionUpdateManyZodSchema = z.object({ data: sessionUpdateManyMutationInputObjectSchema, where: sessionWhereInputObjectSchema.optional() }).strict();