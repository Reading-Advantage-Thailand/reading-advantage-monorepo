import type { Prisma } from '@prisma/client';
import * as z from 'zod';
import { sessionWhereInputObjectSchema as sessionWhereInputObjectSchema } from './objects/sessionWhereInput.schema';

export const sessionDeleteManySchema: z.ZodType<Prisma.sessionDeleteManyArgs> = z.object({ where: sessionWhereInputObjectSchema.optional() }).strict() as unknown as z.ZodType<Prisma.sessionDeleteManyArgs>;

export const sessionDeleteManyZodSchema = z.object({ where: sessionWhereInputObjectSchema.optional() }).strict();