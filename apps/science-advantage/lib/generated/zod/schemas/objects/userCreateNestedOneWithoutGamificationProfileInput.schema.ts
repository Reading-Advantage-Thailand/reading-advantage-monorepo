import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userCreateWithoutGamificationProfileInputObjectSchema as userCreateWithoutGamificationProfileInputObjectSchema } from './userCreateWithoutGamificationProfileInput.schema';
import { userUncheckedCreateWithoutGamificationProfileInputObjectSchema as userUncheckedCreateWithoutGamificationProfileInputObjectSchema } from './userUncheckedCreateWithoutGamificationProfileInput.schema';
import { userCreateOrConnectWithoutGamificationProfileInputObjectSchema as userCreateOrConnectWithoutGamificationProfileInputObjectSchema } from './userCreateOrConnectWithoutGamificationProfileInput.schema';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema'

const makeSchema = () => z.object({
  create: z.union([z.lazy(() => userCreateWithoutGamificationProfileInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutGamificationProfileInputObjectSchema)]).optional(),
  connectOrCreate: z.lazy(() => userCreateOrConnectWithoutGamificationProfileInputObjectSchema).optional(),
  connect: z.lazy(() => userWhereUniqueInputObjectSchema).optional()
}).strict();
export const userCreateNestedOneWithoutGamificationProfileInputObjectSchema: z.ZodType<Prisma.userCreateNestedOneWithoutGamificationProfileInput> = makeSchema() as unknown as z.ZodType<Prisma.userCreateNestedOneWithoutGamificationProfileInput>;
export const userCreateNestedOneWithoutGamificationProfileInputObjectZodSchema = makeSchema();
