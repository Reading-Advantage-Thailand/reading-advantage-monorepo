import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { sessionSelectObjectSchema as sessionSelectObjectSchema } from './objects/sessionSelect.schema';
import { sessionUpdateManyMutationInputObjectSchema as sessionUpdateManyMutationInputObjectSchema } from './objects/sessionUpdateManyMutationInput.schema';
import { sessionWhereInputObjectSchema as sessionWhereInputObjectSchema } from './objects/sessionWhereInput.schema';

export const sessionUpdateManyAndReturnSchema: z.ZodType<Prisma.sessionUpdateManyAndReturnArgs> = z.object({ select: sessionSelectObjectSchema.optional(), data: sessionUpdateManyMutationInputObjectSchema, where: sessionWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.sessionUpdateManyAndReturnArgs>;

export const sessionUpdateManyAndReturnZodSchema = z.object({ select: sessionSelectObjectSchema.optional(), data: sessionUpdateManyMutationInputObjectSchema, where: sessionWhereInputObjectSchema.optional() }).strict();