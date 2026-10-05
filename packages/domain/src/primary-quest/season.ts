/**
 * The Class Quest season (track primary_class_quest_20261005, FR-2 to FR-4): assign a template
 * to a class for a week, cancel before the battle, and the quest cards. A quest owns one class
 * challenge definition; the existing contribution path keeps the committed damage.
 */
import { and, asc, count, countDistinct, desc, eq, inArray, ne } from "drizzle-orm";
import {
  classroomStudents,
  gameChallengeContributions,
  gameChallengeDefinitions,
  gameCompletions,
  primaryBookLessons,
  primaryClassBooks,
  primaryClassQuest,
  primaryClassQuestPowerUp,
} from "@reading-advantage/db/schema";
import { AuthError } from "@reading-advantage/auth";
import {
  assignClassQuestInputSchema,
  type AssignClassQuestInput,
  type ClassQuest,
  type QuestPowerUpRow,
  type StudentQuestCard,
  type TeacherQuestCard,
} from "@reading-advantage/game-contracts";
import { calendarDayKey } from "../calendar-day.js";
import { createTenantDB } from "../db-contract.js";
import { createClassChallenge, type ChallengeGameCapability } from "../challenges/mutations.js";
import type { CreateClassChallengeInput } from "../challenges/schema.js";
import { managedClass, type Ctx } from "../primary-books/class-books.js";
import { QuestError } from "./errors.js";
import { DAMAGE_PER_CORRECT, SHARP_BLADE_BONUS, bossTarget } from "./rules.js";
import { questTemplate, type QuestTemplate } from "./templates.js";

const UNSCOPED_REASON = "class quest rows are read and written with an explicit school_id; the roster and the book lessons hang off the class";
/** The most items a battle challenge carries (the challenge contract's maximum). */
const MAX_BATTLE_ITEMS = 50;
/** How long after the battle time a completion still counts: a late start never loses the battle. */
const CHALLENGE_GRACE_MS = 24 * 60 * 60 * 1000;
/** The battle reads Thai prompts and picks English terms, as the existing challenges do. */
const READING_MODALITY = {
  modality: "reading",
  promptLocale: "th-TH",
  answerLocale: "en-US",
  promptField: "translation",
  answerField: "term",
  scored: true,
} as const;

type Raw = ReturnType<ReturnType<typeof createTenantDB>["unscoped"]>;
type QuestRow = typeof primaryClassQuest.$inferSelect;
type PowerUpRowDb = typeof primaryClassQuestPowerUp.$inferSelect;

/** Resolves the installed cartridge facts for a game id; the app passes the cartridge registry. */
export type ResolveGameCapability = (gameId: string) => Promise<ChallengeGameCapability | undefined>;

/**
 * The Monday 00:00 of the school week that holds a date, in the school time zone (UTC+7).
 * @param date Any instant of the week.
 * @returns The week start as an instant.
 */
export function weekStart(date: Date): Date {
  const day = new Date(`${calendarDayKey(date)}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return new Date(`${day.toISOString().slice(0, 10)}T00:00:00+07:00`);
}

/**
 * Whole days from now to the battle, never negative.
 * @param battleAt The battle time.
 * @param now The current time.
 * @returns The days left.
 */
export function daysLeft(battleAt: Date, now: Date): number {
  return Math.max(0, Math.ceil((battleAt.getTime() - now.getTime()) / 86_400_000));
}

/**
 * Maps a quest row to the contract shape.
 * @param row The table row.
 * @returns The quest.
 */
export const toQuest = (row: QuestRow): ClassQuest => ({
  id: row.id,
  classId: row.classId,
  templateId: row.templateId,
  challengeId: row.challengeId,
  status: row.status as ClassQuest["status"],
  statusAt: row.statusAt.toISOString(),
  startsAt: row.startsAt.toISOString(),
  battleAt: row.battleAt.toISOString(),
  bossTarget: row.bossTarget,
  createdAt: row.createdAt.toISOString(),
});

/**
 * Maps a power-up row to the contract shape.
 * @param row The table row.
 * @returns The earned power-up.
 */
export const toPowerUp = (row: PowerUpRowDb): QuestPowerUpRow => ({
  goalKey: row.goalKey,
  powerUp: row.powerUp as QuestPowerUpRow["powerUp"],
  earnedAt: row.earnedAt.toISOString(),
  usedAt: row.usedAt ? row.usedAt.toISOString() : null,
});

/**
 * The school of the user, required for quest rows.
 * @param ctx The database and the user.
 * @returns The school id.
 * @throws {AuthError} FORBIDDEN when the user has no school.
 */
function schoolOf(ctx: Ctx): string {
  if (!ctx.user.schoolId) throw new AuthError("Class Quest needs a school", "FORBIDDEN");
  return ctx.user.schoolId;
}

/**
 * The unscoped handle for quest rows of one school.
 * @param ctx The database and the user.
 * @param schoolId The school.
 * @returns The raw handle.
 */
export function questDb(ctx: Ctx, schoolId: string): Raw {
  return createTenantDB(ctx.db, { schoolId }).unscoped(UNSCOPED_REASON);
}

/**
 * The quest of a class that is not done, if any.
 * @param raw The unscoped handle.
 * @param schoolId The school.
 * @param classIds The classes to look in.
 * @returns The newest quest that is not done, or undefined.
 */
export async function openQuest(raw: Raw, schoolId: string, classIds: string[]): Promise<QuestRow | undefined> {
  if (!classIds.length) return undefined;
  const rows = await raw
    .select()
    .from(primaryClassQuest)
    .where(and(eq(primaryClassQuest.schoolId, schoolId), inArray(primaryClassQuest.classId, classIds), ne(primaryClassQuest.status, "done")))
    .orderBy(desc(primaryClassQuest.createdAt))
    .limit(1);
  return rows[0];
}

/**
 * One quest by id in the user's school.
 * @param ctx The database and the user.
 * @param questId The quest.
 * @returns The row and the raw handle.
 * @throws {QuestError} NOT_FOUND when no quest has that id in the school.
 */
export async function questById(ctx: Ctx, questId: string): Promise<{ raw: Raw; quest: QuestRow; template: QuestTemplate }> {
  const schoolId = schoolOf(ctx);
  const raw = questDb(ctx, schoolId);
  const rows = await raw.select().from(primaryClassQuest).where(and(eq(primaryClassQuest.id, questId), eq(primaryClassQuest.schoolId, schoolId))).limit(1);
  const quest = rows[0];
  const template = quest ? questTemplate(quest.templateId) : undefined;
  if (!quest || !template) throw new QuestError("NOT_FOUND", 404, "Unknown quest");
  return { raw, quest, template };
}

/**
 * The battle words: the glossary of the class's current book lesson as term and translation pairs.
 * @param raw The unscoped handle.
 * @param classId The class.
 * @returns Up to 50 distinct pairs; empty when the class has no book or the lesson has no glossary.
 */
export async function battleItems(raw: Raw, classId: string): Promise<{ term: string; translation: string }[]> {
  const [book] = await raw
    .select({ bookId: primaryClassBooks.bookId, currentLesson: primaryClassBooks.currentLesson })
    .from(primaryClassBooks)
    .where(eq(primaryClassBooks.classroomId, classId))
    .orderBy(desc(primaryClassBooks.updatedAt))
    .limit(1);
  if (!book) return [];
  const [lesson] = await raw
    .select({ package: primaryBookLessons.package })
    .from(primaryBookLessons)
    .where(and(eq(primaryBookLessons.bookId, book.bookId), eq(primaryBookLessons.number, book.currentLesson)))
    .limit(1);
  const glossary = (lesson?.package as { glossary?: unknown } | undefined)?.glossary;
  if (!Array.isArray(glossary)) return [];
  const seen = new Set<string>();
  const items: { term: string; translation: string }[] = [];
  for (const entry of glossary) {
    const { word, thai } = (entry ?? {}) as { word?: unknown; thai?: unknown };
    if (typeof word !== "string" || typeof thai !== "string") continue;
    const term = word.trim();
    const translation = thai.trim();
    if (!term || !translation || seen.has(term)) continue;
    seen.add(term);
    items.push({ term, translation });
    if (items.length === MAX_BATTLE_ITEMS) break;
  }
  return items;
}

/**
 * Assigns a quest template to a class for one week (FR-2, FR-3). Creates the class challenge
 * definition and the quest in one go; the boss target is fixed from the roster at this moment.
 * @param ctx The database and the teacher.
 * @param input The template, the class, the battle time, and an optional season start.
 * @param resolveGameCapability Resolves the installed cartridge facts of the template's game.
 * @returns The new quest.
 * @throws {QuestError} TEMPLATE_NOT_FOUND, BAD_TIME, GAME_UNAVAILABLE, ALREADY_OPEN, or NO_CONTENT.
 * @throws {AuthError} FORBIDDEN when the user does not teach the class.
 */
export async function assignClassQuest(ctx: Ctx, input: AssignClassQuestInput, resolveGameCapability: ResolveGameCapability): Promise<ClassQuest> {
  const parsed = assignClassQuestInputSchema.parse(input);
  const template = questTemplate(parsed.templateId);
  if (!template) throw new QuestError("TEMPLATE_NOT_FOUND", 404, `Unknown quest template '${parsed.templateId}'`);
  const cls = await managedClass(ctx, parsed.classId);
  const now = ctx.now ?? new Date();
  const battleAt = new Date(parsed.battleAt);
  const startsAt = parsed.startsAt ? new Date(parsed.startsAt) : weekStart(battleAt);
  if (battleAt <= now || startsAt >= battleAt) throw new QuestError("BAD_TIME", 422, "The battle must come after now and after the season start");
  const capability = await resolveGameCapability(template.gameId);
  if (!capability || capability.inputMode !== template.contentMode) {
    throw new QuestError("GAME_UNAVAILABLE", 422, `The game '${template.gameId}' is not installed for challenges`);
  }
  const raw = questDb(ctx, cls.schoolId);
  if (await openQuest(raw, cls.schoolId, [cls.id])) throw new QuestError("ALREADY_OPEN", 409, "The class already has a quest this week");
  const [roster] = await raw.select({ total: count() }).from(classroomStudents).where(eq(classroomStudents.classroomId, cls.id));
  const items = await battleItems(raw, cls.id);
  if (!items.length) throw new QuestError("NO_CONTENT", 422, "The class's current lesson has no glossary for the battle");
  const target = bossTarget(Number(roster?.total ?? 0));
  const challengeInput: CreateClassChallengeInput = {
    classId: cls.id,
    title: template.title.en,
    gameId: template.gameId as CreateClassChallengeInput["gameId"],
    gameVersion: capability.version,
    contentLocale: "th",
    content: { mode: "vocabulary", items },
    seed: Math.floor(Math.random() * 2_147_483_647),
    difficulty: "easy",
    modality: READING_MODALITY,
    startsAt: startsAt.toISOString(),
    expiresAt: new Date(battleAt.getTime() + CHALLENGE_GRACE_MS).toISOString(),
    target,
    teacherParticipationEnabled: false,
  };
  const challenge = await createClassChallenge({ db: createTenantDB(ctx.db, { schoolId: cls.schoolId }), user: ctx.user, tenant: { schoolId: cls.schoolId }, input: challengeInput });
  const [row] = await raw
    .insert(primaryClassQuest)
    .values({
      schoolId: cls.schoolId,
      classId: cls.id,
      templateId: template.id,
      challengeId: challenge.id,
      status: "open",
      statusAt: now,
      startsAt,
      battleAt,
      bossTarget: target,
      createdByUserId: ctx.user.id,
      createdAt: now,
    })
    .onConflictDoNothing()
    .returning();
  if (!row) {
    await raw.delete(gameChallengeDefinitions).where(eq(gameChallengeDefinitions.id, challenge.id));
    throw new QuestError("ALREADY_OPEN", 409, "The class already has a quest this week");
  }
  return toQuest(row);
}

/**
 * Cancels an open quest before the battle (FR-2). Deletes the challenge definition; the quest,
 * its power-ups, and its heartbeats go with it.
 * @param ctx The database and the teacher.
 * @param questId The quest.
 * @throws {QuestError} NOT_FOUND, or BAD_STATE when the battle has started.
 * @throws {AuthError} FORBIDDEN when the user does not teach the class.
 */
export async function cancelClassQuest(ctx: Ctx, questId: string): Promise<void> {
  const { raw, quest } = await questById(ctx, questId);
  await managedClass(ctx, quest.classId);
  if (quest.status !== "open") throw new QuestError("BAD_STATE", 409, "The battle has started; the quest cannot be cancelled");
  await raw.delete(gameChallengeDefinitions).where(and(eq(gameChallengeDefinitions.id, quest.challengeId), eq(gameChallengeDefinitions.schoolId, quest.schoolId)));
}

/**
 * The committed damage of a quest from the verified completions, and the helpers in play order.
 * A correct answer is 2 damage, 3 with a sharp blade earned this week.
 * @param raw The unscoped handle.
 * @param quest The quest row.
 * @returns The committed total and the helpers in the order they finished.
 */
export async function committedDamage(raw: Raw, quest: QuestRow): Promise<{ committed: number; helpers: string[] }> {
  const [hits, blades] = await Promise.all([
    raw
      .select({ userId: gameChallengeContributions.userId, correct: gameCompletions.correctAnswers })
      .from(gameChallengeContributions)
      .innerJoin(gameCompletions, eq(gameCompletions.id, gameChallengeContributions.completionId))
      .where(and(eq(gameChallengeContributions.schoolId, quest.schoolId), eq(gameChallengeContributions.challengeId, quest.challengeId)))
      .orderBy(asc(gameChallengeContributions.contributedAt)),
    raw
      .select({ userId: primaryClassQuestPowerUp.userId })
      .from(primaryClassQuestPowerUp)
      .where(and(eq(primaryClassQuestPowerUp.schoolId, quest.schoolId), eq(primaryClassQuestPowerUp.questId, quest.id), eq(primaryClassQuestPowerUp.powerUp, "sharp-blade"))),
  ]);
  const sharp = new Set(blades.map((b) => b.userId));
  const committed = hits.reduce((sum, hit) => sum + Math.max(0, hit.correct) * (DAMAGE_PER_CORRECT + (sharp.has(hit.userId) ? SHARP_BLADE_BONUS : 0)), 0);
  return { committed, helpers: hits.map((hit) => hit.userId) };
}

/**
 * The classes a student belongs to.
 * @param raw The unscoped handle.
 * @param userId The student.
 * @returns The class ids.
 */
export async function studentClassIds(raw: Raw, userId: string): Promise<string[]> {
  const rows = await raw.select({ classId: classroomStudents.classroomId }).from(classroomStudents).where(eq(classroomStudents.studentId, userId));
  return rows.map((r) => r.classId);
}

/**
 * The student's quest that is not done, with its template.
 * @param ctx The database and the student.
 * @returns The raw handle, the quest, and the template; null when the student has no quest.
 */
export async function studentQuest(ctx: Ctx): Promise<{ raw: Raw; quest: QuestRow; template: QuestTemplate } | null> {
  const schoolId = schoolOf(ctx);
  const raw = questDb(ctx, schoolId);
  const quest = await openQuest(raw, schoolId, await studentClassIds(raw, ctx.user.id));
  const template = quest ? questTemplate(quest.templateId) : undefined;
  return quest && template ? { raw, quest, template } : null;
}

/**
 * The power-ups a student earned in a quest.
 * @param raw The unscoped handle.
 * @param quest The quest row.
 * @param userId The student.
 * @returns The rows in the order earned.
 */
export async function studentPowerUps(raw: Raw, quest: QuestRow, userId: string): Promise<PowerUpRowDb[]> {
  return raw
    .select()
    .from(primaryClassQuestPowerUp)
    .where(and(eq(primaryClassQuestPowerUp.schoolId, quest.schoolId), eq(primaryClassQuestPowerUp.questId, quest.id), eq(primaryClassQuestPowerUp.userId, userId)))
    .orderBy(asc(primaryClassQuestPowerUp.earnedAt));
}

/**
 * The quest card of the student home (FR-4): the boss, the days left, the class meter, and the
 * student's own power-ups and goals.
 * @param ctx The database and the student.
 * @returns The card, or null when the student has no quest this week.
 */
export async function getStudentQuestCard(ctx: Ctx): Promise<StudentQuestCard | null> {
  const found = await studentQuest(ctx);
  if (!found) return null;
  const { raw, quest, template } = found;
  const now = ctx.now ?? new Date();
  const [{ committed }, powerUps] = await Promise.all([committedDamage(raw, quest), studentPowerUps(raw, quest, ctx.user.id)]);
  return {
    quest: toQuest(quest),
    title: template.title,
    boss: template.boss,
    daysLeft: daysLeft(quest.battleAt, now),
    committed,
    powerUps: powerUps.map(toPowerUp),
    goals: [...template.goals],
  };
}

/**
 * The quest card of the teacher dashboard and class page (FR-4).
 * @param ctx The database and the teacher.
 * @param classroomId The class.
 * @returns The card, or null when the class has no quest this week.
 * @throws {AuthError} FORBIDDEN when the user does not teach the class.
 */
export async function getTeacherQuestCard(ctx: Ctx, classroomId: string): Promise<TeacherQuestCard | null> {
  const cls = await managedClass(ctx, classroomId);
  const raw = questDb(ctx, cls.schoolId);
  const quest = await openQuest(raw, cls.schoolId, [cls.id]);
  const template = quest ? questTemplate(quest.templateId) : undefined;
  if (!quest || !template) return null;
  const now = ctx.now ?? new Date();
  const [{ committed }, [roster], [earners]] = await Promise.all([
    committedDamage(raw, quest),
    raw.select({ total: count() }).from(classroomStudents).where(eq(classroomStudents.classroomId, cls.id)),
    raw
      .select({ total: countDistinct(primaryClassQuestPowerUp.userId) })
      .from(primaryClassQuestPowerUp)
      .where(and(eq(primaryClassQuestPowerUp.schoolId, quest.schoolId), eq(primaryClassQuestPowerUp.questId, quest.id))),
  ]);
  return {
    quest: toQuest(quest),
    title: template.title,
    boss: template.boss,
    daysLeft: daysLeft(quest.battleAt, now),
    committed,
    rosterSize: Number(roster?.total ?? 0),
    studentsWithPowerUps: Number(earners?.total ?? 0),
  };
}
