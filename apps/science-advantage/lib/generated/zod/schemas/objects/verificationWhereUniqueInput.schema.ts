import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.string().optional()
}).strict();
export const verificationWhereUniqueInputObjectSchema: z.ZodType<Prisma.verificationWhereUniqueInput> = makeSchema() as unknown as z.ZodType<Prisma.verificationWhereUniqueInput>;
export const verificationWhereUniqueInputObjectZodSchema = makeSchema();
