import { and, eq, count, inArray, or, type SQL } from "drizzle-orm";
import { db } from "@reading-advantage/db";
import { createTenantDB } from "../db-contract.js";
import {
  gamificationProfiles,
  scienceAttempts,
  scienceClasses,
  scienceClassStudents,
  scienceCurriculumUnits,
  scienceLessonCompletions,
  scienceLessons,
  scienceMasteryRuns,
  scienceQuestionResponses,
  scienceQuizQuestions,
  scienceUnitLessons,
} from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";

/** HTTP response shape returned by quiz domain functions. */
export type QuizHttpResponse = {
  status: number;
  body: Record<string, unknown>;
};

/**
 * Starts a new quiz attempt for a lesson. Loads the question bank, randomly
 * selects N questions, creates an attempt row, and ensures a lessonCompletion
 * row exists.
 *
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param lessonSlug - The lesson slug or UUID id
 * @returns HTTP response with quiz data or error
 * @throws {AuthError} When user lacks quiz:submit permission
 */
export async function startQuiz({
  user, tenant, lessonSlug,
}: {
  user: UserContext;
  tenant: Tenant;
  lessonSlug: string;
}): Promise<QuizHttpResponse> {
  assertCan(user, "quiz:submit", tenant);
  const tenantDb = createTenantDB(db, tenant);

  const [lesson] = await tenantDb.select().from(scienceLessons)
    .where(or(eq(scienceLessons.slug, lessonSlug), eq(scienceLessons.id, lessonSlug))).limit(1);
  if (!lesson) return { status: 404, body: { error: "Lesson not found" } };

  const classRows = await tenantDb.select({ classId: scienceClasses.id, teacherId: scienceClasses.teacherId })
    .from(scienceUnitLessons)
    .innerJoin(scienceCurriculumUnits, eq(scienceCurriculumUnits.id, scienceUnitLessons.unitId))
    .innerJoin(scienceClasses, eq(scienceClasses.id, scienceCurriculumUnits.classId))
    .where(eq(scienceUnitLessons.lessonId, lesson.id));

  let hasAccess = classRows.some((c) => c.teacherId === user.id);
  if (!hasAccess && classRows.length > 0) {
    const classIds = classRows.map((c) => c.classId);
    const enrollments = await tenantDb.select({ classId: scienceClassStudents.classId }).from(scienceClassStudents)
      .where(and(eq(scienceClassStudents.studentId, user.id), inArray(scienceClassStudents.classId, classIds))).limit(1);
    hasAccess = enrollments.length > 0;
  }
  if (!hasAccess) return { status: 403, body: { error: "Not enrolled in class with this lesson" } };

  const quizQuestions = await tenantDb.select().from(scienceQuizQuestions)
    .where(eq(scienceQuizQuestions.lessonId, lesson.id)).orderBy(scienceQuizQuestions.order);

  const totalQuestions = quizQuestions.length;
  if (totalQuestions < 4) return { status: 500, body: { error: "Insufficient questions in question bank" } };
  const N = Math.floor(totalQuestions / 4);
  if (N === 0) return { status: 500, body: { error: "Insufficient questions in question bank" } };

  const shuffled = [...quizQuestions].sort(() => Math.random() - 0.5);
  const selectedQuestions = shuffled.slice(0, N);

  const [{ c: previousAttempts }] = await tenantDb.select({ c: count() }).from(scienceAttempts)
    .where(and(eq(scienceAttempts.studentId, user.id), eq(scienceAttempts.lessonId, lesson.id)));
  const attemptNumber = previousAttempts + 1;
  const totalPoints = selectedQuestions.reduce((sum, q) => sum + q.points, 0);

  const [attempt] = await tenantDb.insert(scienceAttempts)
    .values({ studentId: user.id, lessonId: lesson.id, schoolId: tenant.schoolId!, maxScore: totalPoints, attemptNumber, startedAt: new Date() })
    .returning();

  const [existingCompletion] = await tenantDb.select().from(scienceLessonCompletions)
    .where(and(eq(scienceLessonCompletions.studentId, user.id), eq(scienceLessonCompletions.lessonId, lesson.id))).limit(1);

  if (!existingCompletion) {
    await tenantDb.insert(scienceLessonCompletions).values({ studentId: user.id, lessonId: lesson.id, schoolId: tenant.schoolId!, status: "IN_PROGRESS", attemptsCount: 0, lastAttemptAt: new Date() });
  } else if (existingCompletion.status === "NOT_STARTED") {
    await tenantDb.update(scienceLessonCompletions).set({ status: "IN_PROGRESS", lastAttemptAt: new Date(), updatedAt: new Date() }).where(eq(scienceLessonCompletions.id, existingCompletion.id));
  }

  return {
    status: 200,
    body: {
      quizId: attempt.id, lessonId: lesson.id,
      questions: selectedQuestions.map((q, i) => ({ id: q.id, type: q.type, text: q.text, options: q.options, points: q.points, order: i + 1 })),
      totalPoints, startedAt: attempt.startedAt.toISOString(),
    },
  };
}

/**
 * Submits a completed quiz attempt with question responses. Grades each
 * response, updates the attempt and lessonCompletion, creates a mastery run,
 * awards XP, updates streak, and checks badge conditions.
 *
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Must include `attemptId` and `responses` array
 * @param deps - Injected dependencies for scoring, gamification, and mastery
 * @returns HTTP response with submission results or error
 * @throws {AuthError} When user lacks quiz:submit permission
 */
export async function submitAttempt({
  user, tenant, input, deps,
}: {
  user: UserContext;
  tenant: Tenant;
  input: {
    attemptId: string;
    responses: Array<{ questionId: string; studentAnswer: unknown; timeSpentSeconds?: number; answeredAt?: string; order?: number }>;
  };
deps: {
    gradeAnswer: (questionType: string, studentAnswer: unknown, correctAnswer: unknown) => boolean;
    calculateXpForQuiz: (percentage: number, attemptNumber: number) => { baseXp: number; firstAttemptBonus: number; totalXp: number };
    awardXp: (ctx: {
      db: import("@reading-advantage/db").DB;
      user: import("@reading-advantage/auth").UserContext;
      tenant: import("@reading-advantage/auth").Tenant;
      input: { profileId: string; amount: number };
    }) => Promise<{ xp: number; level: number; levelName: string; levelUp: boolean }>;
    updateStreakForProfile: (ctx: {
      db: import("@reading-advantage/db").DB;
      user: import("@reading-advantage/auth").UserContext;
      tenant: import("@reading-advantage/auth").Tenant;
      input: { profileId: string; currentTime: Date };
    }) => Promise<{ streak: number; milestoneBonus: number }>;
    checkBadgeConditions: (ctx: {
      db: import("@reading-advantage/db").DB;
      user: import("@reading-advantage/auth").UserContext;
      tenant: import("@reading-advantage/auth").Tenant;
      input: { userId: string; triggerEvent: "lesson_completed" | "quiz_completed" };
    }) => Promise<{ newlyUnlocked: unknown[]; achievements: unknown[] }>;
    processMasteryRun: (ctx: {
      db: import("@reading-advantage/db").DB;
      user: import("@reading-advantage/auth").UserContext;
      tenant: import("@reading-advantage/auth").Tenant;
      input: { attemptId: string; studentId: string };
    }) => Promise<{ status: string; updatedCount: number }>;
  };
}): Promise<QuizHttpResponse> {
  assertCan(user, "quiz:submit", tenant);

  const tenantDb = createTenantDB(db, tenant);
  const { attemptId, responses } = input;
  const [attempt] = await tenantDb.select().from(scienceAttempts).where(eq(scienceAttempts.id, attemptId)).limit(1);
  if (!attempt) return { status: 404, body: { error: "Attempt not found" } };
  if (attempt.studentId !== user.id) return { status: 403, body: { error: "Not authorized to submit this attempt" } };
  if (attempt.completedAt) return { status: 409, body: { error: "Attempt already submitted" } };

  const lessonQuestions = await tenantDb.select().from(scienceQuizQuestions).where(eq(scienceQuizQuestions.lessonId, attempt.lessonId));
  const questionMap = new Map(lessonQuestions.map((q) => [q.id, q]));
  if (responses.length === 0) return { status: 400, body: { error: "All questions must be answered" } };

  let totalScore = 0;
  const breakdown: Array<{ questionId: string; questionText: string; studentAnswer: unknown; correctAnswer: unknown; isCorrect: boolean; points: number; timeSpentSeconds: number }> = [];
  const questionResponsesToCreate: Array<{ attemptId: string; questionId: string; studentAnswer: unknown; isCorrect: boolean; timeSpentSeconds: number; answeredAt: Date; order: number | undefined; schoolId: string }> = [];

  for (const response of responses) {
    const question = questionMap.get(response.questionId);
    if (!question) return { status: 400, body: { error: `Invalid question ID: ${response.questionId}` } };
    const isCorrect = deps.gradeAnswer(question.type, response.studentAnswer, question.correctAnswer);
    const pointsEarned = isCorrect ? question.points : 0;
    totalScore += pointsEarned;
    questionResponsesToCreate.push({ attemptId, questionId: question.id, studentAnswer: response.studentAnswer, isCorrect, timeSpentSeconds: response.timeSpentSeconds || 0, answeredAt: response.answeredAt ? new Date(response.answeredAt) : new Date(), order: response.order, schoolId: tenant.schoolId! });
    breakdown.push({ questionId: question.id, questionText: question.text, studentAnswer: response.studentAnswer, correctAnswer: question.correctAnswer, isCorrect, points: pointsEarned, timeSpentSeconds: response.timeSpentSeconds || 0 });
  }

  const percentage = (totalScore / attempt.maxScore) * 100;
  const attemptTimeSpent = questionResponsesToCreate.reduce((sum, qr) => sum + (typeof qr.timeSpentSeconds === "number" ? qr.timeSpentSeconds : 0), 0);

  await tenantDb.transaction(async (tx) => {
    await tx.update(scienceAttempts).set({ score: totalScore, completedAt: new Date(), updatedAt: new Date() }).where(eq(scienceAttempts.id, attemptId));
    await tx.insert(scienceQuestionResponses).values(questionResponsesToCreate);

    const [existingCompletion] = await tx.select().from(scienceLessonCompletions)
      .where(and(eq(scienceLessonCompletions.studentId, user.id), eq(scienceLessonCompletions.lessonId, attempt.lessonId))).limit(1);
    const now = new Date();

    if (existingCompletion) {
      const bestScore = existingCompletion.bestScore !== null ? Math.max(existingCompletion.bestScore, totalScore) : totalScore;
      const bestPct = existingCompletion.bestScorePercentage !== null ? Math.max(existingCompletion.bestScorePercentage, percentage) : percentage;
      await tx.update(scienceLessonCompletions).set({
        attemptsCount: existingCompletion.attemptsCount + 1, mostRecentScore: totalScore, mostRecentScorePercentage: percentage,
        bestScore, bestScorePercentage: bestPct, lastAttemptAt: now, status: "COMPLETED", completedAt: now,
        totalTimeSpentSeconds: existingCompletion.totalTimeSpentSeconds + attemptTimeSpent, updatedAt: now,
      }).where(eq(scienceLessonCompletions.id, existingCompletion.id));
    } else {
      await tx.insert(scienceLessonCompletions).values({
        studentId: user.id, lessonId: attempt.lessonId, schoolId: tenant.schoolId!, status: "COMPLETED", attemptsCount: 1,
        bestScore: totalScore, bestScorePercentage: percentage, mostRecentScore: totalScore, mostRecentScorePercentage: percentage,
        lastAttemptAt: now, completedAt: now, totalTimeSpentSeconds: attemptTimeSpent,
      });
    }
  });

  await tenantDb.insert(scienceMasteryRuns).values({ attemptId, studentId: user.id, schoolId: tenant.schoolId!, status: "PENDING", updatedCount: 0 });
  const masteryResult = await deps.processMasteryRun({ db: tenantDb, user, tenant, input: { attemptId, studentId: user.id } });

  const { baseXp, firstAttemptBonus, totalXp } = deps.calculateXpForQuiz(percentage, attempt.attemptNumber);
  let [profile] = await tenantDb.select().from(gamificationProfiles).where(eq(gamificationProfiles.userId, user.id)).limit(1);
  if (!profile) {
    [profile] = await tenantDb.insert(gamificationProfiles).values({ userId: user.id, schoolId: tenant.schoolId!, xp: 0, level: 1, streak: 0 }).returning();
  }
  const xpResult = await deps.awardXp({ db: tenantDb, user, tenant, input: { profileId: profile.id, amount: totalXp } });
  const streakResult = await deps.updateStreakForProfile({ db: tenantDb, user, tenant, input: { profileId: profile.id, currentTime: new Date() } });
  const totalXpAwarded = totalXp + streakResult.milestoneBonus;
  const badgeResult = await deps.checkBadgeConditions({ db: tenantDb, user, tenant, input: { userId: user.id, triggerEvent: "quiz_completed" } });

  return {
    status: 200,
    body: {
      attemptId, score: totalScore, maxScore: attempt.maxScore,
      percentage: parseFloat(percentage.toFixed(2)), attemptNumber: attempt.attemptNumber,
      completedAt: new Date().toISOString(), breakdown,
      mastery: { status: masteryResult.status, updatedCount: masteryResult.updatedCount },
      gamification: {
        xpAwarded: totalXpAwarded, baseXp, firstAttemptBonus,
        streakMilestoneBonus: streakResult.milestoneBonus, currentStreak: streakResult.streak,
        level: xpResult.level, levelName: xpResult.levelName, levelUp: xpResult.levelUp, totalXp: xpResult.xp,
        badgesUnlocked: badgeResult.newlyUnlocked, achievements: badgeResult.achievements,
      },
    },
  };
}
