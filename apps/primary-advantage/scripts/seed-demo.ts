/**
 * The demo seed for video recording (R2 of the Primary video series, 2026-10-06): one school,
 * one teacher, five students with two weeks of reading, XP, a streak, avatars, GP, a class book
 * with mixed progress, a Class Quest for the current week, and Reedy usage rows.
 *
 * The seed never runs against production: NODE_ENV must not be `production`, and the database
 * host must be local, or named in DEMO_SEED_ALLOW_HOST (the rehearsal environment).
 *
 * Usage (from the app folder):
 *   pnpm seed:demo              # adds the demo school; a rerun resets it first
 *   pnpm seed:demo -- --reset   # the same: removes the demo school and seeds it again
 *   DEMO_BATTLE_AT=2026-10-10T14:00:00+07:00 pnpm seed:demo   # the battle time of the quest
 *
 * The usernames are: kru-nok (teacher), ploy, beam, nam, ton, mint (students). The password is
 * the DEMO_PASSWORD constant below.
 */
import "dotenv/config";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import {
  articles,
  classrooms,
  classroomStudents,
  classroomTeachers,
  primaryBookLessons,
  primaryBooks,
  primaryClassLoginSessions,
  primaryGpLedger,
  primaryStudentLessonSteps,
  primaryVoiceMonthlyUsage,
  primaryVoiceSessions,
  schools,
  userActivity,
  users,
  xpLogs,
} from "@reading-advantage/db/schema";
import { createCredentialAccount, type UserContext } from "@reading-advantage/auth";
import { getAvatarState, purchaseAvatarItem, setAvatarProfile, setLoadout } from "@reading-advantage/domain/primary-avatar";
import { assignClassBook, markLessonTaught, recordLessonProgress, setCurrentLesson } from "@reading-advantage/domain/primary-books";
import { assignClassQuest, awardPowerUps } from "@reading-advantage/domain/primary-quest";
import { CARTRIDGE_CHALLENGE_CAPABILITIES, cartridgeLoaders } from "@reading-advantage/game-cartridges";
import { STARTER_SETS } from "@reading-advantage/avatar-kit";

import { LEVELS_XP } from "../lib/utils";

/** The shared password of every demo account. A test credential for local and rehearsal databases only. */
const DEMO_PASSWORD = "Demo!2026x";
const SCHOOL_NAME = "โรงเรียนบ้านริมน้ำ (Demo)";
const CLASS_NAME = "ป.4/1";
const CLASS_CODE = "DEMO41";
const BOOK_KEY = "o2";
const QUEST_TEMPLATE = "goblin-raid";
const DAY_MS = 86_400_000;
const BANGKOK = "+07:00";

/**
 * One demo student: the hero class (null = no hero yet), the active days back from today, the MC
 * accuracy, the XP of the last term (one old XP row, for the level), the extra GP, the shop
 * purchases (starter pieces excluded), and the Reedy use this month. The balances after the
 * welcome GP and the purchases: Ploy 220, Beam 5, Nam 45, Mint 45, Ton 0.
 */
const STUDENTS = [
  { username: "ploy", name: "Ploy", classId: "knight", days: [0, 1, 2, 3, 4, 5, 8, 9, 11, 13], accuracy: 0.9, termXp: 5400, gp: 160, buys: ["cape"], reedy: { sessions: 3, seconds: 420 } },
  { username: "beam", name: "Beam", classId: "wizard", days: [1, 3, 6, 10], accuracy: 0.6, termXp: 1200, gp: 0, buys: ["club", "belt"], reedy: { sessions: 1, seconds: 150 } },
  { username: "nam", name: "Nam", classId: "rogue", days: [2, 7], accuracy: 0.75, termXp: 800, gp: 20, buys: ["cloth-hood", "bracers"], reedy: null },
  { username: "ton", name: "Ton", classId: null, days: [] as number[], accuracy: 0, termXp: 0, gp: 0, buys: [] as string[], reedy: null },
  { username: "mint", name: "Mint", classId: "ranger", days: [0, 1, 2, 5, 9, 12], accuracy: 0.85, termXp: 4700, gp: 0, buys: ["dagger"], reedy: { sessions: 2, seconds: 300 } },
] as const;

/**
 * Refuses a production run or an unknown database host.
 * @param connectionString The database URL.
 * @throws When NODE_ENV is production, the URL is missing, or the host is not local and not allowed.
 */
export function assertDemoSeedAllowed(connectionString: string | undefined): void {
  if (process.env.NODE_ENV === "production") throw new Error("the demo seed refuses NODE_ENV=production");
  if (!connectionString) throw new Error("set DATABASE_URL");
  const host = new URL(connectionString).hostname;
  const allowed = host === "localhost" || host === "127.0.0.1" || host === process.env.DEMO_SEED_ALLOW_HOST;
  if (!allowed) throw new Error(`the demo seed refuses the database host "${host}"; set DEMO_SEED_ALLOW_HOST=${host} for the rehearsal environment`);
}

/**
 * The level row of a total XP, from the app's level table.
 * @param xp The total XP.
 * @returns The RA level and the CEFR level.
 */
function levelOf(xp: number): { level: number; cefrLevel: string } {
  const row = LEVELS_XP.find((level) => xp >= level.min && xp <= level.max) ?? LEVELS_XP[LEVELS_XP.length - 1];
  return { level: row.raLevel, cefrLevel: row.cefrLevel };
}

/**
 * A moment on a day in Bangkok time, `daysAgo` days before today.
 * @param daysAgo The number of days back from today.
 * @param hour The hour of the day (0-23).
 * @returns The instant.
 */
function at(daysAgo: number, hour: number): Date {
  const today = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }) + `T00:00:00${BANGKOK}`);
  return new Date(today.getTime() - daysAgo * DAY_MS + hour * 3_600_000);
}

/**
 * The battle time of the quest: DEMO_BATTLE_AT, or this week's Friday at 14:00 Bangkok time (next week's when Friday has passed).
 * @returns The ISO time with the Bangkok offset.
 */
function battleAt(): string {
  if (process.env.DEMO_BATTLE_AT) return process.env.DEMO_BATTLE_AT;
  const now = new Date();
  const bangkokDay = new Date(now.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }) + `T00:00:00${BANGKOK}`);
  const weekday = (bangkokDay.getUTCDay() + 6) % 7; // Monday = 0
  let friday = new Date(bangkokDay.getTime() + (4 - weekday) * DAY_MS + 14 * 3_600_000);
  if (friday.getTime() < now.getTime()) friday = new Date(friday.getTime() + 7 * DAY_MS);
  return friday.toISOString().replace("Z", "+00:00");
}

/**
 * Removes the demo school and every row that hangs from its users and classes.
 * @returns A promise that resolves when the school is gone.
 */
async function resetDemo(): Promise<void> {
  const found = await db.select({ id: schools.id }).from(schools).where(eq(schools.name, SCHOOL_NAME));
  for (const school of found) {
    const members = await db.select({ id: users.id }).from(users).where(eq(users.schoolId, school.id));
    const ids = members.map((m) => m.id);
    // Order: classes first (the quest keeps its teacher with a restrict key), then users, then the school (its challenge definitions cascade).
    await db.delete(classrooms).where(eq(classrooms.schoolId, school.id));
    if (ids.length) await db.delete(primaryClassLoginSessions).where(inArray(primaryClassLoginSessions.teacherId, ids));
    if (ids.length) await db.delete(users).where(inArray(users.id, ids));
    await db.delete(schools).where(eq(schools.id, school.id));
    console.log(`removed demo school ${school.id}`);
  }
}

/**
 * Seeds the demo school. The database must hold the `o2` book and at least one article.
 * @returns A promise that resolves when every row exists.
 */
async function seedDemo(): Promise<void> {
  const [school] = await db.insert(schools).values({ name: SCHOOL_NAME, country: "Thailand" }).returning();
  const systemId = crypto.randomUUID();
  await db.insert(users).values({ id: systemId, username: `demo-system-${systemId.slice(0, 8)}`, displayUsername: `demo-system-${systemId.slice(0, 8)}`, name: "Demo System", role: "SYSTEM", schoolId: school.id });
  const make = async (username: string, name: string, role: "TEACHER" | "STUDENT") =>
    createCredentialAccount(db, { username, displayUsername: username, name, password: DEMO_PASSWORD, role, schoolId: school.id, actorUserId: systemId, actorRole: "SYSTEM" });
  const teacher = await make("kru-nok", "ครูนก", "TEACHER");
  const students = [] as { id: string; spec: (typeof STUDENTS)[number] }[];
  for (const spec of STUDENTS) students.push({ id: (await make(spec.username, spec.name, "STUDENT")).id, spec });

  const [klass] = await db.insert(classrooms).values({ name: CLASS_NAME, schoolId: school.id, teacherId: teacher.id, grade: 4, classCode: CLASS_CODE }).returning();
  await db.insert(classroomTeachers).values({ classroomId: klass.id, teacherId: teacher.id });
  await db.insert(classroomStudents).values(students.map((s) => ({ classroomId: klass.id, studentId: s.id })));
  const teacherCtx: UserContext = { id: teacher.id, username: "kru-nok", name: "ครูนก", role: "TEACHER", schoolId: school.id, xp: 0, level: 1, cefrLevel: "A1-" };
  const studentCtx = (s: { id: string; spec: (typeof STUDENTS)[number] }, xp = 0): UserContext => ({ id: s.id, username: s.spec.username, name: s.spec.name, role: "STUDENT", schoolId: school.id, xp, level: levelOf(xp).level, cefrLevel: levelOf(xp).cefrLevel });

  // The class book: Origins 2, lesson 1 taught, lessons up to 3 open.
  const [book] = await db.select({ id: primaryBooks.id }).from(primaryBooks).where(eq(primaryBooks.key, BOOK_KEY)).limit(1);
  if (!book) throw new Error(`book "${BOOK_KEY}" is not in this database; import the lesson packages first`);
  const classBook = await assignClassBook({ db, user: teacherCtx, input: { classroomId: klass.id, bookId: book.id, mode: "teacher_led", startDate: at(14, 8) } });
  await markLessonTaught({ db, user: teacherCtx, input: { classBookId: classBook.id, lessonNumber: 1, stepsDone: [1, 2, 3, 4, 5, 6] } });
  await setCurrentLesson({ db, user: teacherCtx, input: { classBookId: classBook.id, lessonNumber: 3 } });
  const lessonRows = await db.select({ number: primaryBookLessons.number, articleId: primaryBookLessons.articleId }).from(primaryBookLessons).where(eq(primaryBookLessons.bookId, book.id));
  const lessonArticle = new Map(lessonRows.filter((row) => row.articleId).map((row) => [row.number, row.articleId as string]));
  const pool = (await db.select({ id: articles.id }).from(articles).limit(6)).map((row) => row.id);
  if (!pool.length) throw new Error("no articles in this database; import content first");

  // Lesson progress (the class progress grid): done, in progress, not started, and one red ring (Ton, lesson 1 taught and not started).
  const progress: Record<string, { lesson: number; step: number; done?: boolean }[]> = {
    ploy: [{ lesson: 1, step: 14, done: true }, { lesson: 2, step: 11 }],
    beam: [{ lesson: 1, step: 14, done: true }, { lesson: 2, step: 6 }],
    nam: [{ lesson: 1, step: 14, done: true }, { lesson: 2, step: 3 }],
    ton: [],
    mint: [{ lesson: 1, step: 14, done: true }, { lesson: 2, step: 14, done: true }],
  };
  for (const s of students) {
    for (const row of progress[s.spec.username] ?? []) {
      const articleId = lessonArticle.get(row.lesson);
      if (!articleId) continue;
      await recordLessonProgress({ db, user: studentCtx(s), input: { articleId, reachedStep: row.step, seconds: 60 * row.step * 3 }, now: at(row.lesson === 1 ? 9 : 2, 10) });
      if (row.done) {
        await db
          .update(primaryStudentLessonSteps)
          .set({ status: "done", doneAt: at(row.lesson === 1 ? 9 : 2, 11) })
          .where(and(eq(primaryStudentLessonSteps.classBookId, classBook.id), eq(primaryStudentLessonSteps.studentId, s.id), eq(primaryStudentLessonSteps.lessonNumber, row.lesson), eq(primaryStudentLessonSteps.appStep, 14)));
      }
    }
  }

  // Reading history, XP, streak, and levels: one story read with four MC answers on each active day.
  const totals = new Map<string, number>();
  for (const s of students) {
    let xp = s.spec.termXp;
    const xpRows: (typeof xpLogs.$inferInsert)[] = [];
    const activityRows: (typeof userActivity.$inferInsert)[] = [];
    if (s.spec.termXp > 0) xpRows.push({ userId: s.id, xpEarned: s.spec.termXp, activityId: "demo:last-term", activityType: "LEVEL_TEST", createdAt: at(90, 9), updatedAt: at(90, 9) });
    s.spec.days.forEach((daysAgo, index) => {
      const articleId = pool[index % pool.length];
      const readAt = at(daysAgo, 16);
      const answers = 4;
      const correct = Math.round(answers * s.spec.accuracy);
      const responses = Array.from({ length: answers }, (_, i) => ({ answer: i < correct ? 1 : 2, isCorrect: 1 }));
      const readXp = 10;
      const mcXp = correct * 2;
      activityRows.push({ userId: s.id, activityType: "ARTICLE_READ", targetId: `${articleId}:${daysAgo}`, xpEarned: readXp, completed: true, details: { articleId }, createdAt: readAt, updatedAt: readAt });
      activityRows.push({ userId: s.id, activityType: "MC_QUESTION", targetId: `${articleId}:${daysAgo}`, xpEarned: mcXp, completed: true, details: { articleId, responses }, createdAt: new Date(readAt.getTime() + 600_000), updatedAt: new Date(readAt.getTime() + 600_000) });
      xpRows.push({ userId: s.id, xpEarned: readXp, activityId: `demo:read:${articleId}:${daysAgo}`, activityType: "ARTICLE_READ", createdAt: readAt, updatedAt: readAt });
      xpRows.push({ userId: s.id, xpEarned: mcXp, activityId: `demo:mc:${articleId}:${daysAgo}`, activityType: "MC_QUESTION", createdAt: new Date(readAt.getTime() + 600_000), updatedAt: new Date(readAt.getTime() + 600_000) });
      xp += readXp + mcXp;
    });
    if (activityRows.length) await db.insert(userActivity).values(activityRows);
    if (xpRows.length) await db.insert(xpLogs).values(xpRows);
    const level = levelOf(xp);
    await db.update(users).set({ xp, level: level.level, cefrLevel: level.cefrLevel }).where(eq(users.id, s.id));
    totals.set(s.id, xp);
  }

  // Avatars: four heroes with the starter set and the welcome GP; Ton has no hero (the picker video); extra GP per student.
  const resolveCapability = async (gameId: string) => {
    const declared = CARTRIDGE_CHALLENGE_CAPABILITIES[gameId];
    const loader = cartridgeLoaders[gameId as keyof typeof cartridgeLoaders];
    if (!declared || !loader) return undefined;
    return (await loader()).manifest.inputMode === declared.inputMode ? declared : undefined;
  };
  for (const s of students) {
    const ctx = { db, user: studentCtx(s, totals.get(s.id) ?? 0), now: at(10, 9) };
    if (s.spec.gp > 0) await db.insert(primaryGpLedger).values({ schoolId: school.id, userId: s.id, delta: s.spec.gp, reason: "xp", sourceKey: "demo:xp", createdAt: at(10, 9) });
    if (!s.spec.classId) continue;
    const starter = STARTER_SETS.find((set) => set.id === s.spec.classId);
    if (!starter) throw new Error(`no starter set ${s.spec.classId}`);
    await setAvatarProfile({ ...ctx, input: { classId: starter.id, tints: starter.tints } });
    await getAvatarState(ctx); // grants the starter pieces (worn) and the welcome GP
  }
  // Shop purchases: a purchase row and a spend row each; Ploy wears the cape.
  for (const s of students) {
    const ctx = { db, user: studentCtx(s, totals.get(s.id) ?? 0), now: at(3, 17) };
    for (const itemId of s.spec.buys) await purchaseAvatarItem({ ...ctx, input: { itemId } });
    if (s.spec.username === "ploy") await setLoadout({ ...ctx, input: { slot: "back", itemId: "cape" } });
  }

  // The Class Quest of this week, then the power-ups of the goals met so far.
  const quest = await assignClassQuest({ db, user: teacherCtx }, { templateId: QUEST_TEMPLATE, classId: klass.id, battleAt: battleAt() }, resolveCapability);
  for (const s of students) await awardPowerUps({ db, user: studentCtx(s, totals.get(s.id) ?? 0) });

  // Reedy usage this month for three students: the monthly row and one ended session each.
  const month = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }).slice(0, 7);
  for (const s of students) {
    if (!s.spec.reedy) continue;
    await db.insert(primaryVoiceMonthlyUsage).values({ schoolId: school.id, studentUserId: s.id, month, secondsUsed: s.spec.reedy.seconds, sessionCount: s.spec.reedy.sessions, costThb: Math.round(s.spec.reedy.seconds * 0.05 * 100) / 100 });
    const started = at(1, 15);
    await db.insert(primaryVoiceSessions).values({
      schoolId: school.id,
      studentUserId: s.id,
      articleId: pool[0],
      month,
      status: "ENDED",
      reservedSeconds: 180,
      consumedSeconds: Math.min(180, s.spec.reedy.seconds),
      startedAt: started,
      expiresAt: new Date(started.getTime() + 300_000),
      endedAt: new Date(started.getTime() + Math.min(180, s.spec.reedy.seconds) * 1000),
      endReason: "student",
      summary: { summaryTh: "คุยเรื่องลูกหมาปิ๊ปและอาหารที่ชอบ", strengths: ["พูดประโยคสั้นได้ชัด"], improvements: ["ลองใช้ past tense"], practicedTopics: ["pets", "food"] },
      scores: { fluency: 3, grammar: 3, vocabulary: 4, pronunciation: 3 },
    });
  }

  console.log(JSON.stringify({ school: school.id, classId: klass.id, classCode: CLASS_CODE, classBookId: classBook.id, questId: quest.id, battleAt: quest.battleAt, teacher: "kru-nok", students: STUDENTS.map((s) => s.username) }, null, 2));
}

/** Entry point: guards the target, resets the demo school, seeds it, and closes the client. */
async function main(): Promise<void> {
  assertDemoSeedAllowed(process.env.DATABASE_URL);
  await resetDemo();
  if (process.argv.includes("--reset-only")) return;
  await seedDemo();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
