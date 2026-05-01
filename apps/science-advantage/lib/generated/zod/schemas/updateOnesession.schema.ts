import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { sessionSelectObjectSchema as sessionSelectObjectSchema } from './objects/sessionSelect.schema';
import { sessionIncludeObjectSchema as sessionIncludeObjectSchema } from './objects/sessionInclude.schema';
import { sessionUpdateInputObjectSchema as sessionUpdateInputObjectSchema } from './objects/sessionUpdateInput.schema';
import { sessionUncheckedUpdateInputObjectSchema as sessionUncheckedUpdateInputObjectSchema } from './objects/sessionUncheckedUpdateInput.schema';
import { sessionWhereUniqueInputObjectSchema as sessionWhereUniqueInputObjectSchema } from './objects/sessionWhereUniqueInput.schema';

export const sessionUpdateOneSchema: z.ZodType<Prisma.sessionUpdateArgs> = z.object({ select: sessionSelectObjectSchema.optional(), include: sessionIncludeObjectSchema.optional(), data: z.union([sessionUpdateInputObjectSchema, sessionUncheckedUpdateInputObjectSchema]), where: sessionWhereUniqueInputObjectSchema }).strict() as unknown as z.ZodType<Prisma.sessionUpdateArgs>;

export const sessionUpdateOneZodSchema = z.object({ select: sessionSelectObjectSchema.optional(), include: sessionIncludeObjectSchema.optional(), data: z.union([sessionUpdateInputObjectSchema, sessionUncheckedUpdateInputObjectSchema]), where: sessionWhereUniqueInputObjectSchema }).strict();