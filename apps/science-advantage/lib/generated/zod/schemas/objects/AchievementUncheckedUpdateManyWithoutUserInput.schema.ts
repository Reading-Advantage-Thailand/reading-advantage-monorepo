import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFieldUpdateOperationsInputObjectSchema as StringFieldUpdateOperationsInputObjectSchema } from './StringFieldUpdateOperationsInput.schema';
import { DateTimeFieldUpdateOperationsInputObjectSchema as DateTimeFieldUpdateOperationsInputObjectSchema } from './DateTimeFieldUpdateOperationsInput.schema'

const makeSchema = () => z.object({
  id: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  badgeType: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  unlockedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional()
}).strict();
export const AchievementUncheckedUpdateManyWithoutUserInputObjectSchema: z.ZodType<Prisma.AchievementUncheckedUpdateManyWithoutUserInput> = makeSchema() as unknown as z.ZodType<Prisma.AchievementUncheckedUpdateManyWithoutUserInput>;
export const AchievementUncheckedUpdateManyWithoutUserInputObjectZodSchema = makeSchema();
