import { eq, inArray } from "drizzle-orm";
import { db, type DB } from "@reading-advantage/db";
import { createTenantDB } from "../db-contract.js";
import {
  scienceAttempts,
  scienceCurriculumUnits,
  scienceLessonStandards,
  scienceLessons,
  scienceQuestionResponses,
  scienceQuestionStandards,
  scienceStandards,
  scienceUnitLessons,
  users,
} from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";

export type AttemptWithRelations = {
  id: string;
  studentId: string;
  lessonId: string;
  score: number | null;
  maxScore: number;
  completedAt: Date | null;
  lesson: {
    id: string;
    title: string;
    lessonType: string;
    gradeLevel: number | null;
    order: number;
    standards: Array<{
      id: string;
      code: string;
      description: string;
      framework: string;
    }>;
    curriculumUnits: Array<{
      id: string;
      title: string;
      order: number;
      framework: string;
    }>;
  };
  student: {
    id: string;
    gradeLevel: number | null;
  };
  questionResponses: Array<{
    id: string;
    isCorrect: boolean;
    question: {
      id: string;
      standards: Array<{ id: string; code: string }>;
    };
  }>;
};

/**
 * Loads a scienceAttempts row with the nested shape the recommendation
 * pipeline expects. Replaces a single deeply-nested Prisma include with a
 * small batch of Drizzle SELECTs assembled in-memory.
 */
async function loadAttemptWithRelations(
  db: DB,
  attemptId: string
): Promise<AttemptWithRelations | null> {
  const [attemptRow] = await db
    .select({
      id: scienceAttempts.id,
      studentId: scienceAttempts.studentId,
      lessonId: scienceAttempts.lessonId,
      score: scienceAttempts.score,
      maxScore: scienceAttempts.maxScore,
      completedAt: scienceAttempts.completedAt,
    })
    .from(scienceAttempts)
    .where(eq(scienceAttempts.id, attemptId))
    .limit(1);

  if (!attemptRow) return null;

  const [lessonRow] = await db
    .select({
      id: scienceLessons.id,
      title: scienceLessons.title,
      lessonType: scienceLessons.lessonType,
      gradeLevel: scienceLessons.gradeLevel,
      order: scienceLessons.order,
    })
    .from(scienceLessons)
    .where(eq(scienceLessons.id, attemptRow.lessonId))
    .limit(1);

  if (!lessonRow) {
    throw new Error(`Lesson ${attemptRow.lessonId} not found`);
  }

  const lessonStandards = await db
    .select({
      id: scienceStandards.id,
      code: scienceStandards.code,
      description: scienceStandards.description,
      framework: scienceStandards.framework,
    })
    .from(scienceLessonStandards)
    .innerJoin(
      scienceStandards,
      eq(scienceStandards.id, scienceLessonStandards.standardId)
    )
    .where(eq(scienceLessonStandards.lessonId, lessonRow.id));

  const lessonUnits = await db
    .select({
      id: scienceCurriculumUnits.id,
      title: scienceCurriculumUnits.title,
      order: scienceCurriculumUnits.order,
      framework: scienceCurriculumUnits.framework,
    })
    .from(scienceUnitLessons)
    .innerJoin(
      scienceCurriculumUnits,
      eq(scienceCurriculumUnits.id, scienceUnitLessons.unitId)
    )
    .where(eq(scienceUnitLessons.lessonId, lessonRow.id));

  const [studentRow] = await db
    .select({ id: users.id, gradeLevel: users.gradeLevel })
    .from(users)
    .where(eq(users.id, attemptRow.studentId))
    .limit(1);

  const responseRows = await db
    .select({
      id: scienceQuestionResponses.id,
      isCorrect: scienceQuestionResponses.isCorrect,
      questionId: scienceQuestionResponses.questionId,
    })
    .from(scienceQuestionResponses)
    .where(eq(scienceQuestionResponses.attemptId, attemptRow.id));

  const responseQuestionIds = responseRows.map((r) => r.questionId);
  const questionStandardsRows = responseQuestionIds.length
    ? await db
        .select({
          questionId: scienceQuestionStandards.questionId,
          standardId: scienceStandards.id,
          code: scienceStandards.code,
        })
        .from(scienceQuestionStandards)
        .innerJoin(
          scienceStandards,
          eq(scienceStandards.id, scienceQuestionStandards.standardId)
        )
        .where(
          inArray(scienceQuestionStandards.questionId, responseQuestionIds)
        )
    : [];

  const standardsByQuestion = new Map<
    string,
    Array<{ id: string; code: string }>
  >();
  for (const row of questionStandardsRows) {
    const arr = standardsByQuestion.get(row.questionId) ?? [];
    arr.push({ id: row.standardId, code: row.code });
    standardsByQuestion.set(row.questionId, arr);
  }

  return {
    id: attemptRow.id,
    studentId: attemptRow.studentId,
    lessonId: attemptRow.lessonId,
    score: attemptRow.score,
    maxScore: attemptRow.maxScore,
    completedAt: attemptRow.completedAt,
    lesson: {
      id: lessonRow.id,
      title: lessonRow.title,
      lessonType: lessonRow.lessonType as string,
      gradeLevel: lessonRow.gradeLevel,
      order: lessonRow.order,
      standards: lessonStandards.map((s) => ({
        id: s.id,
        code: s.code,
        description: s.description,
        framework: s.framework as string,
      })),
      curriculumUnits: lessonUnits.map((u) => ({
        id: u.id,
        title: u.title,
        order: u.order,
        framework: u.framework as string,
      })),
    },
    student: {
      id: studentRow?.id ?? attemptRow.studentId,
      gradeLevel: studentRow?.gradeLevel ?? null,
    },
    questionResponses: responseRows.map((r) => ({
      id: r.id,
      isCorrect: r.isCorrect,
      question: {
        id: r.questionId,
        standards: standardsByQuestion.get(r.questionId) ?? [],
      },
    })),
  };
}

/**
 * Generates an AI recommendation for a completed quiz attempt. Loads the
 * attempt context, builds a recommendation prompt, and calls the AI service.
 * Includes rate limiting and caching.
 *
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Must include `attemptId`
 * @param deps - Injected dependencies for AI pipeline and rate limiting
 * @returns Object with `recommendation` data
 * @throws {AuthError} When user lacks ai:recommend permission
 */
export async function getRecommendation({
  user,
  tenant,
  input,
  deps,
}: {
  user: UserContext;
  tenant: Tenant;
  input: { attemptId: string };
  deps: {
    assertRateLimit: (studentId: string) => Promise<void>;
    buildRecommendationContext: (input: {
      attempt: AttemptWithRelations;
    }) => Promise<{
      traceId: string;
      masteryVersion: number;
      [key: string]: unknown;
    }>;
    generateRecommendation: (context: unknown) => Promise<{
      recommendation: unknown;
      modelUsed: string;
      fallbackUsed: boolean;
    }>;
    cacheGet: (
      key: string
    ) => { expiresAt: number; response: unknown } | undefined;
    cacheSet: (key: string, value: unknown, ttlMs: number) => void;
    cacheTtlMs: number;
    devAuthEnabled: boolean;
  };
}) {
  assertCan(user, "ai:recommend", tenant);

  const tenantDb = createTenantDB(db, tenant);
  const attempt = await loadAttemptWithRelations(tenantDb, input.attemptId);

  if (!attempt) {
    return { error: "Attempt not found", status: 404 };
  }

  if (!attempt.completedAt) {
    return { error: "Attempt still grading", status: 409 };
  }

  const isStudent = user.role === "STUDENT";
  const isTeacherOrAdmin =
    user.role === "TEACHER" || user.role === "ADMIN";
  const canImpersonate = deps.devAuthEnabled && isTeacherOrAdmin;

  if (isStudent && user.id !== attempt.studentId) {
    return { error: "Forbidden", status: 403 };
  }

  if (!isStudent && !canImpersonate && user.id !== attempt.studentId) {
    return { error: "Forbidden", status: 403 };
  }

  await deps.assertRateLimit(attempt.studentId);

  const context = await deps.buildRecommendationContext({ attempt });
  const key = `${attempt.studentId}:${attempt.id}:${context.masteryVersion}`;
  const cached = deps.cacheGet(key);

  if (cached && cached.expiresAt > Date.now()) {
    return { recommendation: cached.response };
  }

  const result = await deps.generateRecommendation(context);

  const responseBody = {
    success: true,
    recommendation: result.recommendation,
    model: result.modelUsed,
    fallbackUsed: result.fallbackUsed,
    traceId: context.traceId,
    generatedAt: new Date().toISOString(),
  };

  deps.cacheSet(key, responseBody, deps.cacheTtlMs);

  return { recommendation: responseBody };
}
