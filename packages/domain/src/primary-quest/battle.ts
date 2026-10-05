/**
 * The Class Quest battle (track primary_class_quest_20261005, FR-7 to FR-11): the teacher drives
 * rally, play, result, and done; phones post heartbeats; the dashboard reads the class state.
 * The committed damage comes from the verified completions through the contribution path; the
 * heartbeats are a preview and the presence signal.
 */
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { gameChallengeRuns, primaryClassQuest, primaryClassQuestHeartbeat, primaryClassQuestPowerUp, primaryGpLedger } from "@reading-advantage/db/schema";
import {
  questHeartbeatInputSchema,
  setQuestStatusInputSchema,
  type ClassQuest,
  type QuestBattleState,
  type QuestDashboardState,
  type QuestHeartbeatInput,
  type SetQuestStatusInput,
} from "@reading-advantage/game-contracts";
import { getClassAvatars } from "../primary-avatar/shop.js";
import { managedClass, type Ctx } from "../primary-books/class-books.js";
import { QuestError } from "./errors.js";
import { BATTLE_GP, BOSS_FALLEN_GP, HEARTBEAT_STALE_SECONDS, PLAY_MINUTES, RALLY_MINUTES, RESULT_MINUTES, STUDENT_HP } from "./rules.js";
import { committedDamage, questById, studentClassIds, studentPowerUps, studentQuest, toPowerUp, toQuest, type Raw } from "./season.js";

type QuestRow = typeof primaryClassQuest.$inferSelect;
type HeartbeatRow = typeof primaryClassQuestHeartbeat.$inferSelect;

/** The quest states in order; a transition moves one step forward or repeats the current state. */
const ORDER: ClassQuest["status"][] = ["open", "rally", "play", "result", "done"];
/** Minutes of each battle state, for the countdown. */
const STATE_MINUTES: Partial<Record<ClassQuest["status"], number>> = { rally: RALLY_MINUTES, play: PLAY_MINUTES, result: RESULT_MINUTES };

/**
 * When the current battle state ends, for the countdown.
 * @param quest The quest row.
 * @returns The end instant, or null when the quest is open or done.
 */
export function countdownEndsAt(quest: Pick<QuestRow, "status" | "statusAt">): Date | null {
  const minutes = STATE_MINUTES[quest.status as ClassQuest["status"]];
  return minutes === undefined ? null : new Date(quest.statusAt.getTime() + minutes * 60_000);
}

/**
 * The pending damage preview: the heartbeat damage of students whose completion is not committed yet.
 * @param beats The latest heartbeats.
 * @param committedUsers The students with a committed hit.
 * @returns The preview total.
 */
export function pendingDamage(beats: readonly Pick<HeartbeatRow, "userId" | "damage">[], committedUsers: ReadonlySet<string>): number {
  return beats.reduce((sum, beat) => sum + (committedUsers.has(beat.userId) ? 0 : Math.max(0, beat.damage)), 0);
}

/**
 * Moves the battle on (FR-7): open → rally → play → result → done. The same state again is a
 * no-op, so a double tap or a refresh changes nothing; a step back or a skip is refused.
 * Entering `result` posts the GP rewards (FR-11), once per participant.
 * @param ctx The database and the teacher.
 * @param questId The quest.
 * @param input The target state.
 * @returns The quest after the transition.
 * @throws {QuestError} NOT_FOUND, or BAD_STATE for a step back or a skip.
 * @throws {AuthError} FORBIDDEN when the user does not teach the class.
 */
export async function setQuestStatus(ctx: Ctx, questId: string, input: SetQuestStatusInput): Promise<ClassQuest> {
  const { status } = setQuestStatusInputSchema.parse(input);
  const { raw, quest } = await questById(ctx, questId);
  await managedClass(ctx, quest.classId);
  const from = ORDER.indexOf(quest.status as ClassQuest["status"]);
  const to = ORDER.indexOf(status);
  if (to === from) return toQuest(quest);
  if (to !== from + 1) throw new QuestError("BAD_STATE", 409, `The quest is ${quest.status}; it cannot move to ${status}`);
  const now = ctx.now ?? new Date();
  const [updated] = await raw
    .update(primaryClassQuest)
    .set({ status, statusAt: now })
    .where(and(eq(primaryClassQuest.id, quest.id), eq(primaryClassQuest.status, quest.status)))
    .returning();
  if (!updated) throw new QuestError("BAD_STATE", 409, "The quest moved on in the meantime");
  if (status === "result") await postRewards(raw, updated, now);
  return toQuest(updated);
}

/**
 * Posts the battle GP to every participant (FR-11): the battle reward, plus the boss bonus when
 * the boss fell. One ledger row per student and quest; a repeat inserts nothing.
 * @param raw The unscoped handle.
 * @param quest The quest row.
 * @param now The current time.
 */
async function postRewards(raw: Raw, quest: QuestRow, now: Date): Promise<void> {
  const [beats, { committed }] = await Promise.all([
    raw.select({ userId: primaryClassQuestHeartbeat.userId }).from(primaryClassQuestHeartbeat).where(and(eq(primaryClassQuestHeartbeat.schoolId, quest.schoolId), eq(primaryClassQuestHeartbeat.questId, quest.id))),
    committedDamage(raw, quest),
  ]);
  if (!beats.length) return;
  const delta = BATTLE_GP + (committed >= quest.bossTarget ? BOSS_FALLEN_GP : 0);
  await raw
    .insert(primaryGpLedger)
    .values(beats.map((beat) => ({ schoolId: quest.schoolId, userId: beat.userId, delta, reason: "battle", sourceKey: `quest:${quest.id}`, createdAt: now })))
    .onConflictDoNothing();
}

/**
 * Stores a phone's heartbeat (FR-8): the latest per student and quest. Marks the power-ups the
 * phone reports as used. Accepted during rally, play, and result.
 * @param ctx The database and the student.
 * @param input The heartbeat.
 * @throws {QuestError} NOT_FOUND, NOT_IN_CLASS, or BAD_STATE outside the battle.
 */
export async function postHeartbeat(ctx: Ctx, input: QuestHeartbeatInput): Promise<void> {
  const beat = questHeartbeatInputSchema.parse(input);
  const { raw, quest } = await questById(ctx, beat.questId);
  if (!(await studentClassIds(raw, ctx.user.id)).includes(quest.classId)) throw new QuestError("NOT_IN_CLASS", 403, "You are not in this class");
  if (!STATE_MINUTES[quest.status as ClassQuest["status"]]) throw new QuestError("BAD_STATE", 409, "The battle is not running");
  const now = ctx.now ?? new Date();
  const values = {
    schoolId: quest.schoolId,
    questId: quest.id,
    userId: ctx.user.id,
    runId: beat.runId,
    present: true,
    answered: beat.answered,
    correct: beat.correct,
    hp: Math.min(STUDENT_HP, beat.hp),
    damage: beat.damage,
    powerUpsUsed: beat.powerUpsUsed,
    updatedAt: now,
  };
  const { schoolId: _s, questId: _q, userId: _u, ...set } = values;
  await raw
    .insert(primaryClassQuestHeartbeat)
    .values(values)
    .onConflictDoUpdate({ target: [primaryClassQuestHeartbeat.schoolId, primaryClassQuestHeartbeat.questId, primaryClassQuestHeartbeat.userId], set });
  if (beat.powerUpsUsed.length) {
    await raw
      .update(primaryClassQuestPowerUp)
      .set({ usedAt: now })
      .where(and(eq(primaryClassQuestPowerUp.schoolId, quest.schoolId), eq(primaryClassQuestPowerUp.questId, quest.id), eq(primaryClassQuestPowerUp.userId, ctx.user.id), inArray(primaryClassQuestPowerUp.powerUp, beat.powerUpsUsed), isNull(primaryClassQuestPowerUp.usedAt)));
  }
}

/**
 * The battle page state of the signed-in student (FR-9), polled by the phone.
 * @param ctx The database and the student.
 * @returns The state, or null when the student has no quest.
 */
export async function getBattleState(ctx: Ctx): Promise<QuestBattleState | null> {
  const found = await studentQuest(ctx);
  if (!found) return null;
  const { raw, quest, template } = found;
  const [{ committed, hits }, beats, powerUps, runs] = await Promise.all([
    committedDamage(raw, quest),
    raw.select({ userId: primaryClassQuestHeartbeat.userId, damage: primaryClassQuestHeartbeat.damage }).from(primaryClassQuestHeartbeat).where(and(eq(primaryClassQuestHeartbeat.schoolId, quest.schoolId), eq(primaryClassQuestHeartbeat.questId, quest.id))),
    studentPowerUps(raw, quest, ctx.user.id),
    raw
      .select({ id: gameChallengeRuns.id })
      .from(gameChallengeRuns)
      .where(and(eq(gameChallengeRuns.schoolId, quest.schoolId), eq(gameChallengeRuns.challengeId, quest.challengeId), eq(gameChallengeRuns.userId, ctx.user.id)))
      .orderBy(desc(gameChallengeRuns.createdAt))
      .limit(1),
  ]);
  const ends = countdownEndsAt(quest);
  return {
    quest: toQuest(quest),
    title: template.title,
    boss: template.boss,
    target: quest.bossTarget,
    committed,
    pending: pendingDamage(beats, new Set(hits.map((hit) => hit.userId))),
    countdownEndsAt: ends ? ends.toISOString() : null,
    powerUps: powerUps.map(toPowerUp),
    runId: runs[0]?.id ?? null,
  };
}

/**
 * The projector dashboard state (FR-10, FR-11): the boss meter with the pending segment, every
 * student with an HP bar from the latest heartbeat, the hit feed in play order, and the result.
 * No score per student leaves this function.
 * @param ctx The database and the teacher.
 * @param questId The quest.
 * @returns The dashboard state.
 * @throws {QuestError} NOT_FOUND.
 * @throws {AuthError} FORBIDDEN when the user does not teach the class.
 */
export async function getQuestDashboard(ctx: Ctx, questId: string): Promise<QuestDashboardState> {
  const { raw, quest, template } = await questById(ctx, questId);
  const now = ctx.now ?? new Date();
  const [students, beats, { committed, hits }] = await Promise.all([
    getClassAvatars(ctx, quest.classId),
    raw.select().from(primaryClassQuestHeartbeat).where(and(eq(primaryClassQuestHeartbeat.schoolId, quest.schoolId), eq(primaryClassQuestHeartbeat.questId, quest.id))),
    committedDamage(raw, quest),
  ]);
  const beatOf = new Map(beats.map((beat) => [beat.userId, beat]));
  const nameOf = new Map(students.map((s) => [s.userId, s.name]));
  const committedUsers = new Set(hits.map((hit) => hit.userId));
  const ends = countdownEndsAt(quest);
  return {
    quest: toQuest(quest),
    title: template.title,
    boss: template.boss,
    target: quest.bossTarget,
    committed,
    pending: pendingDamage(beats, committedUsers),
    countdownEndsAt: ends ? ends.toISOString() : null,
    students: students.map((s) => {
      const beat = beatOf.get(s.userId);
      return {
        userId: s.userId,
        name: s.name,
        present: Boolean(beat?.present),
        hp: beat ? beat.hp : null,
        stale: Boolean(beat) && now.getTime() - beat!.updatedAt.getTime() > HEARTBEAT_STALE_SECONDS * 1000,
        profile: s.profile,
        loadout: s.loadout,
      };
    }),
    hits: hits.filter((hit) => hit.damage > 0).map((hit) => ({ userId: hit.userId, name: nameOf.get(hit.userId) ?? "", damage: hit.damage, at: hit.at.toISOString() })),
    helpers: hits.map((hit) => ({ userId: hit.userId, name: nameOf.get(hit.userId) ?? "" })),
    bossFallen: committed >= quest.bossTarget,
  };
}

