import * as z from 'zod';
import type { Prisma } from '@prisma/client';


const makeSchema = () => z.object({
  id: z.string().optional(),
  username: z.string().optional(),
  displayUsername: z.string().optional(),
  email: z.string().optional()
}).strict();
export const userWhereUniqueInputObjectSchema: z.ZodType<Prisma.userWhereUniqueInput> = makeSchema() as unknown as z.ZodType<Prisma.userWhereUniqueInput>;
export const userWhereUniqueInputObjectZodSchema = makeSchema();
