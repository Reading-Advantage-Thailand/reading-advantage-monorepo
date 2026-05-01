import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { AttemptWhereInputObjectSchema as AttemptWhereInputObjectSchema } from './AttemptWhereInput.schema';
import { AttemptUpdateWithoutMasteryRunInputObjectSchema as AttemptUpdateWithoutMasteryRunInputObjectSchema } from './AttemptUpdateWithoutMasteryRunInput.schema';
import { AttemptUncheckedUpdateWithoutMasteryRunInputObjectSchema as AttemptUncheckedUpdateWithoutMasteryRunInputObjectSchema } from './AttemptUncheckedUpdateWithoutMasteryRunInput.schema'

const makeSchema = () => z.object({
  where: z.lazy(() => AttemptWhereInputObjectSchema).optional(),
  data: z.union([z.lazy(() => AttemptUpdateWithoutMasteryRunInputObjectSchema), z.lazy(() => AttemptUncheckedUpdateWithoutMasteryRunInputObjectSchema)])
}).strict();
export const AttemptUpdateToOneWithWhereWithoutMasteryRunInputObjectSchema: z.ZodType<Prisma.AttemptUpdateToOneWithWhereWithoutMasteryRunInput> = makeSchema() as unknown as z.ZodType<Prisma.AttemptUpdateToOneWithWhereWithoutMasteryRunInput>;
export const AttemptUpdateToOneWithWhereWithoutMasteryRunInputObjectZodSchema = makeSchema();
