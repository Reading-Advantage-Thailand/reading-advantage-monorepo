import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { userWhereUniqueInputObjectSchema as userWhereUniqueInputObjectSchema } from './userWhereUniqueInput.schema';
import { userCreateWithoutGamificationProfileInputObjectSchema as userCreateWithoutGamificationProfileInputObjectSchema } from './userCreateWithoutGamificationProfileInput.schema';
import { userUncheckedCreateWithoutGamificationProfileInputObjectSchema as userUncheckedCreateWithoutGamificationProfileInputObjectSchema } from './userUncheckedCreateWithoutGamificationProfileInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => userWhereUniqueInputObjectSchema),
  create: z.union([z.lazy(() => userCreateWithoutGamificationProfileInputObjectSchema), z.lazy(() => userUncheckedCreateWithoutGamificationProfileInputObjectSchema)])
}).strict();
export const userCreateOrConnectWithoutGamificationProfileInputObjectSchema: z.ZodType<Prisma.userCreateOrConnectWithoutGamificationProfileInput> = makeSchema() as unknown as z.ZodType<Prisma.userCreateOrConnectWithoutGamificationProfileInput>;
export const userCreateOrConnectWithoutGamificationProfileInputObjectZodSchema = makeSchema();
