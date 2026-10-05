import { and, asc, desc, eq, gte, inArray, isNull, ne, or, sql } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { articleActivityLogs, articles, assignments, studentAssignments, userActivity, users } from "@reading-advantage/db/schema";
import { assertCan, type UserContext } from "@reading-advantage/auth";
import { createTenantDB } from "../db-contract.js";
import { SCHOOL_TIME_ZONE } from "../calendar-day.js";
import type { StudentHome } from "./contracts.js";
import { countStreakFromDays } from "./streak.js";

/** Activity type that `getArticleActivity` writes when a student opens an article. */
const ARTICLE_READ = "ARTICLE_READ";
/** How many recent article opens to check for an unfinished article. */
const RECENT_READS = 20;
/** Days of activity read for the streak. A longer streak shows as this number. */
const STREAK_WINDOW_DAYS = 366;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/**
 * The calendar day of an activity row in the school time zone, as "YYYY-MM-DD". `created_at` is a
 * timestamp without a zone that holds UTC, so it is read as UTC first.
 */
const ACTIVITY_DAY = sql<string>`to_char(date_trunc('day', (${userActivity.createdAt} AT TIME ZONE 'UTC') AT TIME ZONE ${sql.raw(`'${SCHOOL_TIME_ZONE}'`)}), 'YYYY-MM-DD')`;

/**
 * Reads the Primary student home for the signed-in student: XP and level, the activity
 * streak, the next open assignment, and the last opened article that is not finished
 * (an article is finished when its multiple-choice, short-answer, and long-answer
 * questions are all done).
 * @param params.db Database client.
 * @param params.user The signed-in student.
 * @param params.now Current time. Tests replace it.
 * @returns The home data.
 * @throws {AuthError} FORBIDDEN when the user is not a student.
 */
export async function getStudentHome(params: { db: DB; user: UserContext; now?: Date }): Promise<StudentHome> {
  const { user } = params;
  const now = params.now ?? new Date();
  assertCan(user, "gamification:read:own", { schoolId: user.schoolId });
  const own = createTenantDB(params.db, { schoolId: user.schoolId }).unscoped(
    "own rows: every query filters userId or studentId = the signed-in student",
  );
  const streakStart = new Date(now);
  streakStart.setDate(streakStart.getDate() - STREAK_WINDOW_DAYS);

  const [profileRows, lessonRows, readRows, activityRows] = await Promise.all([
    own
      .select({ xp: users.xp, level: users.level, cefrLevel: users.cefrLevel })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1),
    own
      .select({
        assignmentId: assignments.id,
        title: assignments.title,
        dueDate: assignments.dueDate,
        status: studentAssignments.status,
      })
      .from(studentAssignments)
      .innerJoin(assignments, eq(assignments.id, studentAssignments.assignmentId))
      .where(
        and(
          eq(studentAssignments.studentId, user.id),
          eq(studentAssignments.completed, false),
          or(isNull(studentAssignments.status), ne(studentAssignments.status, "COMPLETED")),
        ),
      )
      .orderBy(sql`${assignments.dueDate} asc nulls last`, asc(assignments.createdAt))
      .limit(1),
    own
      .select({ articleId: userActivity.targetId, updatedAt: userActivity.updatedAt })
      .from(userActivity)
      .where(and(eq(userActivity.userId, user.id), eq(userActivity.activityType, ARTICLE_READ)))
      .orderBy(desc(userActivity.updatedAt))
      .limit(RECENT_READS),
    // One row per active day (not every activity row of the year).
    own
      .selectDistinct({ day: ACTIVITY_DAY })
      .from(userActivity)
      .where(and(eq(userActivity.userId, user.id), gte(userActivity.createdAt, streakStart))),
  ]);

  const profile = profileRows[0];
  const lesson = lessonRows[0];
  return {
    xp: profile?.xp ?? user.xp,
    level: profile?.level ?? user.level,
    cefrLevel: profile?.cefrLevel ?? user.cefrLevel ?? null,
    streakDays: countStreakFromDays(activityRows.map((row) => row.day), now),
    todayLesson: lesson
      ? { assignmentId: lesson.assignmentId, title: lesson.title, dueDate: lesson.dueDate, started: lesson.status === "IN_PROGRESS" }
      : null,
    continueReading: await findUnfinishedArticle(own, user.id, readRows),
  };
}

/**
 * Picks the most recent opened article that is not finished and still exists.
 * @param own Database client for the student's own rows.
 * @param userId The student.
 * @param reads Article opens, newest first.
 * @returns The article to continue, or null.
 */
async function findUnfinishedArticle(
  own: DB,
  userId: string,
  reads: { articleId: string | null; updatedAt: Date }[],
): Promise<StudentHome["continueReading"]> {
  const opened = reads.filter((read): read is { articleId: string; updatedAt: Date } => UUID.test(read.articleId ?? ""));
  if (!opened.length) return null;
  const finishedRows = await own
    .select({ articleId: articleActivityLogs.articleId })
    .from(articleActivityLogs)
    .where(
      and(
        eq(articleActivityLogs.userId, userId),
        inArray(articleActivityLogs.articleId, opened.map((read) => read.articleId)),
        eq(articleActivityLogs.isMultipleChoiceQuestionCompleted, true),
        eq(articleActivityLogs.isShortAnswerQuestionCompleted, true),
        eq(articleActivityLogs.isLongAnswerQuestionCompleted, true),
      ),
    );
  const finished = new Set(finishedRows.map((row) => row.articleId));
  const open = opened.filter((read) => !finished.has(read.articleId));
  if (!open.length) return null;
  const articleRows = await own
    .select({ id: articles.id, title: articles.title, cefrLevel: articles.cefrLevel, raLevel: articles.raLevel })
    .from(articles)
    .where(inArray(articles.id, open.map((read) => read.articleId)));
  const byId = new Map(articleRows.map((row) => [row.id, row]));
  const next = open.find((read) => byId.has(read.articleId));
  if (!next) return null;
  const article = byId.get(next.articleId)!;
  return { articleId: article.id, title: article.title, cefrLevel: article.cefrLevel, raLevel: article.raLevel, lastReadAt: next.updatedAt };
}
