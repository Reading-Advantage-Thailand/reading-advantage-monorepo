import { z } from "zod";

/** Fixed quest identifiers for the first cosmetic reward set. */
export const rpgQuestIdSchema = z.enum([
  "first-ward",
  "complete-the-ward",
  "perfect-english-audio",
]);

/** Fixed cosmetic identifiers for the first reward set. */
export const rpgCosmeticIdSchema = z.enum([
  "apprentice-wand",
  "graveyard-staff",
  "echo-staff",
]);

/** Cosmetic slot supported by the first reward set. */
export const rpgCosmeticSlotSchema = z.literal("profile-emblem");

/** Browser-safe cosmetic state. */
export const rpgCosmeticSchema = z.object({
  id: rpgCosmeticIdSchema,
  slot: rpgCosmeticSlotSchema,
  name: z.string().min(1).max(60),
  unlockedAt: z.string().datetime().nullable(),
  equipped: z.boolean(),
}).strict();

/** Browser-safe quest state. */
export const rpgQuestStateSchema = z.object({
  id: rpgQuestIdSchema,
  completed: z.boolean(),
  completedAt: z.string().datetime().nullable(),
  rewardId: rpgCosmeticIdSchema,
}).strict().superRefine((quest, context) => {
  if (quest.completed !== (quest.completedAt !== null)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Completed quest state requires a completion time",
      path: ["completedAt"],
    });
  }
});

/** Complete browser-safe RPG state for the authenticated user. */
export const studentRpgStateSchema = z.object({
  schemaVersion: z.literal(1),
  equippedEmblemId: rpgCosmeticIdSchema.nullable(),
  cosmetics: z.array(rpgCosmeticSchema).length(rpgCosmeticIdSchema.options.length),
  quests: z.array(rpgQuestStateSchema).length(rpgQuestIdSchema.options.length),
}).strict().superRefine((state, context) => {
  const cosmeticIds = new Set(state.cosmetics.map(({ id }) => id));
  const questIds = new Set(state.quests.map(({ id }) => id));
  if (cosmeticIds.size !== rpgCosmeticIdSchema.options.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "RPG state requires each cosmetic exactly once",
      path: ["cosmetics"],
    });
  }
  if (questIds.size !== rpgQuestIdSchema.options.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "RPG state requires each quest exactly once",
      path: ["quests"],
    });
  }
  if (state.equippedEmblemId) {
    const equipped = state.cosmetics.find(({ id }) => id === state.equippedEmblemId);
    if (!equipped?.unlockedAt || !equipped.equipped) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "The equipped emblem must be unlocked and selected",
        path: ["equippedEmblemId"],
      });
    }
  }
  const equippedCount = state.cosmetics.filter(({ equipped }) => equipped).length;
  if (equippedCount !== (state.equippedEmblemId === null ? 0 : 1)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "RPG state must identify one equipped emblem",
      path: ["cosmetics"],
    });
  }
});

/** Strict input for equipping one owned cosmetic. */
export const equipRpgCosmeticInputSchema = z.object({
  cosmeticId: rpgCosmeticIdSchema,
}).strict();

/** Result returned after equipping one owned cosmetic. */
export const equipRpgCosmeticResultSchema = z.object({
  equippedEmblemId: rpgCosmeticIdSchema,
}).strict();

/** Fixed quest identifier. */
export type RpgQuestId = z.infer<typeof rpgQuestIdSchema>;

/** Fixed cosmetic identifier. */
export type RpgCosmeticId = z.infer<typeof rpgCosmeticIdSchema>;

/** Browser-safe cosmetic state. */
export type RpgCosmetic = z.infer<typeof rpgCosmeticSchema>;

/** Browser-safe quest state. */
export type RpgQuestState = z.infer<typeof rpgQuestStateSchema>;

/** Complete RPG state for the authenticated user. */
export type StudentRpgState = z.infer<typeof studentRpgStateSchema>;

/** Input for equipping one owned cosmetic. */
export type EquipRpgCosmeticInput = z.infer<typeof equipRpgCosmeticInputSchema>;

/** Result returned after equipping one owned cosmetic. */
export type EquipRpgCosmeticResult = z.infer<typeof equipRpgCosmeticResultSchema>;
