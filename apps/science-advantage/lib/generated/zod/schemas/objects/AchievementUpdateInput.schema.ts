import * as z from 'zod';
import type { Prisma } from '@prisma/client';
import { StringFieldUpdateOperationsInputObjectSchema as StringFieldUpdateOperationsInputObjectSchema } from './StringFieldUpdateOperationsInput.schema';
import { DateTimeFieldUpdateOperationsInputObjectSchema as DateTimeFieldUpdateOperationsInputObjectSchema } from './DateTimeFieldUpdateOperationsInput.schema';
import { userUpdateOneRequiredWithoutAchievementsNestedInputObjectSchema as userUpdateOneRequiredWithoutAchievementsNestedInputObjectSchema } from './userUpdateOneRequiredWithoutAchievementsNestedInput.schema'

const makeSchema = () => z.object({
  id: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  badgeType: z.union([z.string(), z.lazy(() => StringFieldUpdateOperationsInputObjectSchema)]).optional(),
  unlockedAt: z.union([z.coerce.date(), z.lazy(() => DateTimeFieldUpdateOperationsInputObjectSchema)]).optional(),
  user: z.lazy(() => userUpdateOneRequiredWithoutAchievementsNestedInputObjectSchema).optional()
}).strict();
export const AchievementUpdateInputObjectSchema: z.ZodType<Prisma.AchievementUpdateInput> = makeSchema() as unknown as z.ZodType<Prisma.AchievementUpdateInput>;
export const AchievementUpdateInputObjectZodSchema = makeSchema();
