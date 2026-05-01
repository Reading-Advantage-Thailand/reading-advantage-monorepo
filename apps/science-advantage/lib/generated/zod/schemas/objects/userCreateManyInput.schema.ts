import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { UserRoleSchema } from '../enums/UserRole.schema'

const makeSchema = () => z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  displayUsername: z.string(),
  email: z.string().optional().nullable(),
  emailVerified: z.boolean().optional(),
  image: z.string().optional().nullable(),
  role: UserRoleSchema.optional(),
  gradeLevel: z.number().int().optional().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
}).strict();
export const userCreateManyInputObjectSchema: z.ZodType<Prisma.userCreateManyInput> = makeSchema() as unknown as z.ZodType<Prisma.userCreateManyInput>;
export const userCreateManyInputObjectZodSchema = makeSchema();
