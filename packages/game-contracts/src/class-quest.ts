import { z } from "zod";
import { avatarLoadoutSchema, avatarProfileSchema } from "./avatar.js";

// ─── Class Quest (track primary_class_quest_20261005) ───

/** Copy in the two UI languages. */
export const questCopySchema = z.object({ en: z.string().min(1), th: z.string().min(1) }).strict();

/** The three power-ups (FR-6). */
export const questPowerUpSchema = z.enum(["shield", "sharp-blade", "rally-horn"]);

/** The goal kinds (FR-5): existing data only. */
export const questGoalKindSchema = z.enum(["reading-days", "accuracy", "streak", "lesson-steps"]);

/** One goal of a template and the power-up it earns. */
export const questGoalSchema = z.discriminatedUnion("kind", [
  z.object({ key: z.string().min(1), kind: z.literal("reading-days"), days: z.number().int().min(1).max(7), powerUp: questPowerUpSchema }).strict(),
  z.object({ key: z.string().min(1), kind: z.literal("accuracy"), percent: z.number().int().min(1).max(100), minQuestions: z.number().int().min(1), powerUp: questPowerUpSchema }).strict(),
  z.object({ key: z.string().min(1), kind: z.literal("streak"), days: z.number().int().min(1), powerUp: questPowerUpSchema }).strict(),
  z.object({ key: z.string().min(1), kind: z.literal("lesson-steps"), steps: z.number().int().min(1), powerUp: questPowerUpSchema }).strict(),
]);

/** One quest template as the teacher's pick page lists it (FR-1). */
export const questTemplateSchema = z
  .object({
    id: z.string().min(1),
    title: questCopySchema,
    boss: z.object({ artKey: z.string().min(1), name: questCopySchema, hpPerStudent: z.number().int().min(1) }).strict(),
    gameId: z.string().min(1),
    contentMode: z.enum(["vocabulary", "sentence"]),
    goals: z.array(questGoalSchema).min(1).max(3),
  })
  .strict();

/**
 * The quest states (FR-2, FR-7). `open` is the week; `rally`, `play`, and `result` are the
 * battle states the teacher drives; `done` closes the quest. The spec's `battle` is the union
 * of the three battle states.
 */
export const questStatusSchema = z.enum(["open", "rally", "play", "result", "done"]);

/** What the teacher sends to assign a template to a class (FR-2). */
export const assignClassQuestInputSchema = z
  .object({
    templateId: z.string().min(1),
    classId: z.string().uuid(),
    /** The battle date and time. */
    battleAt: z.string().datetime({ offset: true }),
    /** The season start; the Monday 00:00 Asia/Bangkok of the battle week when omitted. */
    startsAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

/** One quest as stored (FR-2). */
export const classQuestSchema = z
  .object({
    id: z.string().uuid(),
    classId: z.string().uuid(),
    templateId: z.string().min(1),
    challengeId: z.string().uuid(),
    status: questStatusSchema,
    /** When the current status began; the countdown of a battle state starts here. */
    statusAt: z.string().datetime(),
    startsAt: z.string().datetime(),
    battleAt: z.string().datetime(),
    bossTarget: z.number().int().min(1),
    createdAt: z.string().datetime(),
  })
  .strict();

/** One earned power-up of a student (FR-6). */
export const questPowerUpRowSchema = z
  .object({
    goalKey: z.string().min(1),
    powerUp: questPowerUpSchema,
    earnedAt: z.string().datetime(),
    usedAt: z.string().datetime().nullable(),
  })
  .strict();

/** The battle heartbeat a phone posts every 10 seconds and after each answer (FR-8). */
export const questHeartbeatInputSchema = z
  .object({
    questId: z.string().uuid(),
    /** The challenge run once the game started; null while the student is present in the rally only. */
    runId: z.string().uuid().nullable(),
    answered: z.number().int().min(0),
    correct: z.number().int().min(0),
    hp: z.number().int().min(0),
    /** The damage the phone counts so far: a preview; the committed value comes from the completion. */
    damage: z.number().int().min(0),
    powerUpsUsed: z.array(questPowerUpSchema).max(3),
  })
  .strict()
  .refine((h) => h.correct <= h.answered, { message: "correct cannot exceed answered", path: ["correct"] });

/** The quest card on the student home (FR-4). */
export const studentQuestCardSchema = z
  .object({
    quest: classQuestSchema,
    title: questCopySchema,
    boss: questTemplateSchema.shape.boss,
    daysLeft: z.number().int().min(0),
    /** Committed damage toward the target. */
    committed: z.number().int().min(0),
    powerUps: z.array(questPowerUpRowSchema),
    goals: z.array(questGoalSchema),
  })
  .strict();

/** The quest card on the teacher dashboard and class page (FR-4). */
export const teacherQuestCardSchema = z
  .object({
    quest: classQuestSchema,
    title: questCopySchema,
    boss: questTemplateSchema.shape.boss,
    daysLeft: z.number().int().min(0),
    committed: z.number().int().min(0),
    rosterSize: z.number().int().min(0),
    /** Students with at least one power-up. */
    studentsWithPowerUps: z.number().int().min(0),
  })
  .strict();

/** One student on the projector dashboard: a portrait with an HP bar, never a score (FR-10). */
export const questDashboardStudentSchema = z
  .object({
    userId: z.string().min(1),
    name: z.string(),
    present: z.boolean(),
    hp: z.number().int().min(0).nullable(),
    /** True when the last heartbeat is older than the stale limit: the bar dims. */
    stale: z.boolean(),
    profile: avatarProfileSchema.nullable(),
    loadout: avatarLoadoutSchema,
  })
  .strict();

/** One line of the hit feed (FR-10): who hit, for how much, when. */
export const questHitSchema = z
  .object({ userId: z.string().min(1), name: z.string(), damage: z.number().int().min(1), at: z.string().datetime() })
  .strict();

/** The projector dashboard state (FR-10, FR-11); polled every few seconds. */
export const questDashboardStateSchema = z
  .object({
    quest: classQuestSchema,
    title: questCopySchema,
    boss: questTemplateSchema.shape.boss,
    target: z.number().int().min(1),
    committed: z.number().int().min(0),
    /** The lighter preview segment from the heartbeats. */
    pending: z.number().int().min(0),
    /** When the current battle state ends, for the countdown; null when the quest is open or done. */
    countdownEndsAt: z.string().datetime().nullable(),
    students: z.array(questDashboardStudentSchema),
    hits: z.array(questHitSchema),
    /** The helpers in play order, shown in the result (never damage order). */
    helpers: z.array(z.object({ userId: z.string().min(1), name: z.string() }).strict()),
    bossFallen: z.boolean(),
  })
  .strict();

/** The battle page state of one phone (FR-9). */
export const questBattleStateSchema = z
  .object({
    quest: classQuestSchema,
    title: questCopySchema,
    boss: questTemplateSchema.shape.boss,
    target: z.number().int().min(1),
    committed: z.number().int().min(0),
    pending: z.number().int().min(0),
    countdownEndsAt: z.string().datetime().nullable(),
    powerUps: z.array(questPowerUpRowSchema),
    /** The student's run for the play state; null before the teacher starts play. */
    runId: z.string().uuid().nullable(),
    /** The student's own latest heartbeat, so a reload keeps the tally; null before the first one. */
    heartbeat: z
      .object({ runId: z.string().uuid().nullable(), answered: z.number().int().min(0), correct: z.number().int().min(0), hp: z.number().int().min(0), damage: z.number().int().min(0), powerUpsUsed: z.array(questPowerUpSchema) })
      .strict()
      .nullable(),
  })
  .strict();

/** What the teacher sends to move the battle on (FR-7). */
export const setQuestStatusInputSchema = z
  .object({ status: z.enum(["rally", "play", "result", "done"]) })
  .strict();

export type QuestCopy = z.infer<typeof questCopySchema>;
export type QuestPowerUp = z.infer<typeof questPowerUpSchema>;
export type QuestGoalKind = z.infer<typeof questGoalKindSchema>;
export type QuestGoal = z.infer<typeof questGoalSchema>;
export type QuestTemplate = z.infer<typeof questTemplateSchema>;
export type QuestStatus = z.infer<typeof questStatusSchema>;
export type AssignClassQuestInput = z.infer<typeof assignClassQuestInputSchema>;
export type ClassQuest = z.infer<typeof classQuestSchema>;
export type QuestPowerUpRow = z.infer<typeof questPowerUpRowSchema>;
export type QuestHeartbeatInput = z.infer<typeof questHeartbeatInputSchema>;
export type StudentQuestCard = z.infer<typeof studentQuestCardSchema>;
export type TeacherQuestCard = z.infer<typeof teacherQuestCardSchema>;
export type QuestDashboardStudent = z.infer<typeof questDashboardStudentSchema>;
export type QuestHit = z.infer<typeof questHitSchema>;
export type QuestDashboardState = z.infer<typeof questDashboardStateSchema>;
export type QuestBattleState = z.infer<typeof questBattleStateSchema>;
export type SetQuestStatusInput = z.infer<typeof setQuestStatusInputSchema>;
