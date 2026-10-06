/**
 * Class Quest goals and power-ups (track primary_class_quest_20261005, FR-5, FR-6). Goals read
 * existing data only: reading days, question accuracy, the streak, and lesson steps. A met goal
 * earns one named power-up; the week is capped; the evaluation runs any number of times.
 */
import { and, count, eq, gte, sql } from "drizzle-orm";
import { primaryClassQuestPowerUp, primaryStudentLessonSteps, userActivity } from "@reading-advantage/db/schema";
import type { QuestPowerUpRow } from "@reading-advantage/game-contracts";
import { SCHOOL_TIME_ZONE } from "../calendar-day.js";
import { countStreakFromDays } from "../primary-home/streak.js";
import type { Ctx } from "../primary-books/class-books.js";
import { POWER_UP_CAP_PER_WEEK, canEarnPowerUp } from "./rules.js";
import { studentPowerUps, studentQuest, toPowerUp } from "./season.js";
import type { QuestGoal } from "./templates.js";

/** Days of activity read for the streak goal. */
const STREAK_WINDOW_DAYS = 366;
const MC_QUESTION = "MC_QUESTION";
/** The calendar day of an activity row in the school time zone (the column holds UTC without a zone). */
const ACTIVITY_DAY = sql<string>`to_char(date_trunc('day', (${userActivity.createdAt} AT TIME ZONE 'UTC') AT TIME ZONE ${sql.raw(`'${SCHOOL_TIME_ZONE}'`)}), 'YYYY-MM-DD')`;

/** What the goals are judged on. */
export interface GoalFacts {
  /** Distinct active days since the season start. */
  readingDays: number;
  /** Multiple-choice answers since the season start. */
  accuracy: { correct: number; total: number };
  /** The current streak in days. */
  streakDays: number;
  /** Lesson steps done since the season start. */
  lessonSteps: number;
}

/**
 * Decides one goal against the facts.
 * @param goal The goal.
 * @param facts The student's facts.
 * @returns True when the goal is met.
 */
export function goalMet(goal: QuestGoal, facts: GoalFacts): boolean {
  switch (goal.kind) {
    case "reading-days":
      return facts.readingDays >= goal.days;
    case "accuracy":
      return facts.accuracy.total >= goal.minQuestions && facts.accuracy.correct * 100 >= goal.percent * facts.accuracy.total;
    case "streak":
      return facts.streakDays >= goal.days;
    case "lesson-steps":
      return facts.lessonSteps >= goal.steps;
  }
}

/**
 * Counts the correct multiple-choice responses in stored activity details, as the XP award does:
 * a response is correct when `answer` equals `isCorrect`.
 * @param details The activity details column.
 * @returns The correct and total counts.
 */
export function mcCounts(details: unknown): { correct: number; total: number } {
  const responses = (details as { responses?: unknown } | null)?.responses;
  if (!Array.isArray(responses)) return { correct: 0, total: 0 };
  let correct = 0;
  for (const response of responses) {
    const { answer, isCorrect } = (response ?? {}) as { answer?: unknown; isCorrect?: unknown };
    if (answer != null && isCorrect != null && answer === isCorrect) correct += 1;
  }
  return { correct, total: responses.length };
}

/**
 * Reads the goal facts of one student since the season start.
 * @param raw The unscoped handle.
 * @param userId The student.
 * @param startsAt The season start.
 * @param now The current time.
 * @returns The facts.
 */
export async function readGoalFacts(raw: Ctx["db"], userId: string, startsAt: Date, now: Date): Promise<GoalFacts> {
  const streakStart = new Date(now.getTime() - STREAK_WINDOW_DAYS * 86_400_000);
  const [weekDays, mcRows, streakDays, steps] = await Promise.all([
    raw
      .select({ day: ACTIVITY_DAY })
      .from(userActivity)
      .where(and(eq(userActivity.userId, userId), gte(userActivity.createdAt, startsAt)))
      .groupBy(ACTIVITY_DAY),
    raw
      .select({ details: userActivity.details })
      .from(userActivity)
      .where(and(eq(userActivity.userId, userId), eq(userActivity.activityType, MC_QUESTION), gte(userActivity.createdAt, startsAt))),
    raw
      .select({ day: ACTIVITY_DAY })
      .from(userActivity)
      .where(and(eq(userActivity.userId, userId), gte(userActivity.createdAt, streakStart)))
      .groupBy(ACTIVITY_DAY),
    raw
      .select({ total: count() })
      .from(primaryStudentLessonSteps)
      .where(and(eq(primaryStudentLessonSteps.studentId, userId), eq(primaryStudentLessonSteps.status, "done"), gte(primaryStudentLessonSteps.doneAt, startsAt))),
  ]);
  const accuracy = mcRows.reduce(
    (sum, row) => {
      const counts = mcCounts(row.details);
      return { correct: sum.correct + counts.correct, total: sum.total + counts.total };
    },
    { correct: 0, total: 0 },
  );
  return {
    readingDays: weekDays.length,
    accuracy,
    streakDays: countStreakFromDays(streakDays.map((row) => row.day), now),
    lessonSteps: Number(steps[0]?.total ?? 0),
  };
}

/**
 * Evaluates the student's goals for the week and grants the power-ups of newly met goals,
 * within the weekly cap (FR-6). Runs on the student home load and at the battle start; a
 * repeat grants nothing twice.
 * @param ctx The database and the student.
 * @returns Every power-up of the student in this quest, in the order earned; empty without a quest.
 */
export async function awardPowerUps(ctx: Ctx): Promise<QuestPowerUpRow[]> {
  const found = await studentQuest(ctx);
  if (!found) return [];
  const { raw, quest, template } = found;
  const now = ctx.now ?? new Date();
  const existing = await studentPowerUps(raw, quest, ctx.user.id);
  const earnedKeys = new Set(existing.map((row) => row.goalKey));
  const open = template.goals.filter((goal) => !earnedKeys.has(goal.key));
  if (!open.length || !canEarnPowerUp(existing.length)) return existing.map(toPowerUp);
  const facts = await readGoalFacts(raw, ctx.user.id, quest.startsAt, now);
  const met = open.filter((goal) => goalMet(goal, facts)).slice(0, POWER_UP_CAP_PER_WEEK - existing.length);
  if (!met.length) return existing.map(toPowerUp);
  await raw
    .insert(primaryClassQuestPowerUp)
    .values(met.map((goal) => ({ schoolId: quest.schoolId, questId: quest.id, userId: ctx.user.id, goalKey: goal.key, powerUp: goal.powerUp, earnedAt: now })))
    .onConflictDoNothing();
  return (await studentPowerUps(raw, quest, ctx.user.id)).map(toPowerUp);
}
