import { and, eq, inArray } from '@reading-advantage/db';
import {
  scienceAttempts,
  scienceLessonStandards,
  scienceMasteryRuns,
  scienceQuestionResponses,
  scienceQuestionStandards,
  scienceQuizQuestions,
  scienceStandardMastery,
} from '@reading-advantage/db/schema';
import {
  assertCan,
  AuthError,
  type Tenant,
  type UserContext,
} from '@reading-advantage/auth';
import type { DB } from '@reading-advantage/db';

import { clampMasteryLevel, recordStandardMastery } from './standard-mastery';

export type MasteryRunContext = {
  attemptId: string;
  studentId: string;
};

export type MasteryRunResult = {
  attemptId: string;
  status: 'COMPLETED' | 'FAILED';
  updatedCount: number;
  lastError: string | null;
};

type ProcessMasteryRunContext = {
  db: DB;
  user: UserContext;
  tenant: Tenant;
  input: MasteryRunContext;
};

/** Compute a recency weight for an attempt based on how recently it was taken. */
function recencyWeight(answeredAt: Date, referenceTime: Date): number {
  const elapsedMs = referenceTime.getTime() - answeredAt.getTime();
  const elapsedHours = Math.max(0, elapsedMs / (1000 * 60 * 60));
  const weight = Math.max(0.2, 1 - elapsedHours * 0.05);
  return weight;
}

/** Compute a difficulty weight from question points (higher points = harder = higher weight). */
function difficultyWeight(points: number): number {
  return Math.max(0.5, Math.min(2, points));
}

/**
 * Phase 1 (ST-2) secured contract:
 *   processMasteryRun({ db, user, tenant, input: { attemptId, studentId } })
 *
 * Routes reads/writes through the caller-provided TenantDB and enforces
 * `assertCan(user, 'mastery:write:own' | 'student:read', tenant)` plus a
 * resource-level schoolId match on the mastery run.
 *
 * Status transitions: PENDING → PROCESSING → COMPLETED | FAILED.
 *
 * @kind write
 * @throws {AuthError} When the caller is not provided, lacks the relevant
 *   permission, or the mastery run belongs to a different school.
 */
export async function processMasteryRun(
  ctx: ProcessMasteryRunContext,
): Promise<MasteryRunResult> {
  if (!ctx.user) {
    throw new AuthError('Authenticated user required', 'UNAUTHORIZED');
  }
  const { db, user, tenant, input } = ctx;
  const { attemptId, studentId } = input;

  // Students can only run mastery for their own attempts; teachers/admins
  // may run for any student in their tenant.
  if (user.role === 'STUDENT') {
    assertCan(user, 'mastery:write:own', tenant);
    if (studentId !== user.id) {
      throw new AuthError(
        'Students may only process their own mastery runs',
        'FORBIDDEN',
      );
    }
  } else {
    assertCan(user, 'student:read', tenant);
  }

  const [masteryRun] = await db
    .select()
    .from(scienceMasteryRuns)
    .where(eq(scienceMasteryRuns.attemptId, attemptId))
    .limit(1);

  if (!masteryRun) {
    return {
      attemptId,
      status: 'FAILED',
      updatedCount: 0,
      lastError: `MasteryRun not found for attempt ${attemptId}`,
    };
  }

  if (masteryRun.schoolId !== user.schoolId) {
    throw new AuthError(
      `User ${user.id} cannot process mastery run ${attemptId} from school ${masteryRun.schoolId}`,
      'FORBIDDEN',
    );
  }

  // Transition to PROCESSING.
  await db
    .update(scienceMasteryRuns)
    .set({ status: 'PROCESSING', updatedAt: new Date() })
    .where(eq(scienceMasteryRuns.attemptId, attemptId));

  try {
    const [attempt] = await db
      .select({
        id: scienceAttempts.id,
        studentId: scienceAttempts.studentId,
        lessonId: scienceAttempts.lessonId,
        attemptNumber: scienceAttempts.attemptNumber,
        startedAt: scienceAttempts.startedAt,
        completedAt: scienceAttempts.completedAt,
      })
      .from(scienceAttempts)
      .where(eq(scienceAttempts.id, attemptId))
      .limit(1);

    if (!attempt) {
      throw new Error(`Attempt ${attemptId} not found`);
    }

    if (attempt.completedAt === null) {
      throw new Error(`Attempt ${attemptId} has not been completed yet`);
    }

    // Question rows for this attempt's lesson.
    const quizQuestionRows = await db
      .select({
        id: scienceQuizQuestions.id,
        points: scienceQuizQuestions.points,
      })
      .from(scienceQuizQuestions)
      .where(eq(scienceQuizQuestions.lessonId, attempt.lessonId));

    // Each question's attached standards (via junction).
    const questionIds = quizQuestionRows.map((q) => q.id);
    const standardLinks = questionIds.length
      ? await db
          .select({
            questionId: scienceQuestionStandards.questionId,
            standardId: scienceQuestionStandards.standardId,
          })
          .from(scienceQuestionStandards)
          .where(inArray(scienceQuestionStandards.questionId, questionIds))
      : [];

    // Lesson-level standards are not used by the worker's per-question weighting,
    // but the original Prisma include hit `lesson.quizQuestions.standards` — same
    // shape captured via the junction read above. Lesson standards (separate
    // junction scienceLessonStandards) are intentionally unused here, mirroring
    // the previous behavior; refer to standardLinks for question-attached
    // standards. (Kept import-free so tree-shake stays happy.)
    void scienceLessonStandards;

    const questionStandardsMap = new Map<string, string[]>();
    for (const link of standardLinks) {
      const list = questionStandardsMap.get(link.questionId) ?? [];
      list.push(link.standardId);
      questionStandardsMap.set(link.questionId, list);
    }

    const questionPointsMap = new Map<string, number>();
    for (const q of quizQuestionRows) {
      questionPointsMap.set(q.id, q.points);
    }

    // Question responses for this attempt.
    const responses = await db
      .select({
        questionId: scienceQuestionResponses.questionId,
        isCorrect: scienceQuestionResponses.isCorrect,
        answeredAt: scienceQuestionResponses.answeredAt,
      })
      .from(scienceQuestionResponses)
      .where(eq(scienceQuestionResponses.attemptId, attemptId));

    // Unique standard IDs across all responses.
    const standardIds = new Set<string>();
    for (const r of responses) {
      const list = questionStandardsMap.get(r.questionId) ?? [];
      for (const id of list) standardIds.add(id);
    }

    // Existing mastery for these standards.
    const existingMasteryRows = standardIds.size
      ? await db
          .select({
            standardId: scienceStandardMastery.standardId,
            masteryLevel: scienceStandardMastery.masteryLevel,
            evidenceCount: scienceStandardMastery.evidenceCount,
            lastAssessedAt: scienceStandardMastery.lastAssessedAt,
          })
          .from(scienceStandardMastery)
          .where(
            and(
              eq(scienceStandardMastery.studentId, studentId),
              inArray(
                scienceStandardMastery.standardId,
                Array.from(standardIds),
              ),
            ),
          )
      : [];

    const existingMasteryMap = new Map<
      string,
      {
        masteryLevel: number;
        evidenceCount: number;
        lastAssessedAt: Date;
      }
    >();
    for (const row of existingMasteryRows) {
      existingMasteryMap.set(row.standardId, {
        masteryLevel: Number(row.masteryLevel),
        evidenceCount: row.evidenceCount,
        lastAssessedAt: row.lastAssessedAt,
      });
    }

    // Accumulate mastery adjustments per standard.
    const standardAccumulators = new Map<
      string,
      {
        totalWeight: number;
        correctWeight: number;
        evidence: number;
        lastAssessedAt: Date;
      }
    >();

    const referenceTime =
      responses.length > 0
        ? responses.reduce(
            (latest, r) => (r.answeredAt > latest ? r.answeredAt : latest),
            responses[0].answeredAt,
          )
        : new Date();

    for (const response of responses) {
      const standards = questionStandardsMap.get(response.questionId) ?? [];
      if (standards.length === 0) continue;

      const points = questionPointsMap.get(response.questionId) ?? 1;
      const diffWeight = difficultyWeight(points);
      const recWeight = recencyWeight(response.answeredAt, referenceTime);
      const perStandardWeight = (diffWeight * recWeight) / standards.length;

      for (const standardId of standards) {
        const existing = existingMasteryMap.get(standardId);
        const accumulator = standardAccumulators.get(standardId) ?? {
          totalWeight: 0,
          correctWeight: 0,
          evidence: 0,
          lastAssessedAt: existing?.lastAssessedAt ?? new Date(0),
        };

        accumulator.totalWeight += perStandardWeight;
        accumulator.correctWeight += response.isCorrect ? perStandardWeight : 0;
        accumulator.evidence += 1;
        if (response.answeredAt > accumulator.lastAssessedAt) {
          accumulator.lastAssessedAt = response.answeredAt;
        }

        standardAccumulators.set(standardId, accumulator);
      }
    }

    // Apply mastery updates.
    let updatedCount = 0;

    for (const [standardId, accumulator] of standardAccumulators) {
      const existing = existingMasteryMap.get(standardId);
      const previousMastery = existing?.masteryLevel ?? 0;

      const newScore =
        accumulator.totalWeight > 0
          ? accumulator.correctWeight / accumulator.totalWeight
          : 0;

      const rawNext = previousMastery * 0.35 + newScore * 0.65;
      const safeNext = Number.isFinite(rawNext) ? rawNext : 0;
      // clampMasteryLevel returns a decimal-string; convert back so it round-
      // trips into a JS number before re-clamping inside recordStandardMastery.
      const nextMastery = Number(clampMasteryLevel(safeNext));

      const previousEvidence = existing?.evidenceCount ?? 0;
      const evidenceDelta = previousEvidence + accumulator.evidence;

      await recordStandardMastery(db, {
        studentId,
        standardId,
        schoolId: masteryRun.schoolId,
        masteryLevel: nextMastery,
        evidenceDelta,
        lastAssessedAt: accumulator.lastAssessedAt,
      });

      updatedCount += 1;
    }

    await db
      .update(scienceMasteryRuns)
      .set({
        status: 'COMPLETED',
        updatedCount,
        updatedAt: new Date(),
      })
      .where(eq(scienceMasteryRuns.attemptId, attemptId));

    return {
      attemptId,
      status: 'COMPLETED',
      updatedCount,
      lastError: null,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    await db
      .update(scienceMasteryRuns)
      .set({
        status: 'FAILED',
        lastError: errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(scienceMasteryRuns.attemptId, attemptId));

    return {
      attemptId,
      status: 'FAILED',
      updatedCount: 0,
      lastError: errorMessage,
    };
  }
}