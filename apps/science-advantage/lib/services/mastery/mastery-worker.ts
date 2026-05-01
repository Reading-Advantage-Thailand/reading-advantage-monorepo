import type { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

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

type AttemptWithRelations = {
  id: string;
  studentId: string;
  lessonId: string;
  attemptNumber: number;
  startedAt: Date;
  lesson: {
    quizQuestions: Array<{
      id: string;
      slug: string;
      type: string;
      text: string;
      points: number;
      order: number;
      standards: Array<{ id: string; code: string }>;
    }>;
  };
  questionResponses: Array<{
    id: string;
    attemptId: string;
    questionId: string;
    isCorrect: boolean;
    timeSpentSeconds: number;
    answeredAt: Date;
  }>;
};

type ExistingMasteryRow = {
  standardId: string;
  masteryLevel: number;
  evidenceCount: number;
  lastAssessedAt: Date;
};

type WorkerPrisma = Pick<PrismaClient, '$transaction'> & {
  masteryRun: PrismaClient['masteryRun'];
  attempt: PrismaClient['attempt'];
  standardMastery: PrismaClient['standardMastery'];
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
 * Process a mastery run by reading the attempt data, evaluating each question's
 * standards, and calling recordStandardMastery() for each affected standard.
 *
 * Status transitions: PENDING → PROCESSING → COMPLETED | FAILED
 */
export async function processMasteryRun(
  ctx: MasteryRunContext,
  prisma: WorkerPrisma
): Promise<MasteryRunResult> {
  const { attemptId, studentId } = ctx;

  // Fetch the mastery run record
  const masteryRun = await prisma.masteryRun.findUnique({
    where: { attemptId },
  });

  if (!masteryRun) {
    return {
      attemptId,
      status: 'FAILED',
      updatedCount: 0,
      lastError: `MasteryRun not found for attempt ${attemptId}`,
    };
  }

  // Transition to PROCESSING
  await prisma.masteryRun.update({
    where: { attemptId },
    data: { status: 'PROCESSING' },
  });

  try {
    // Fetch the attempt with lesson questions and question responses
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        lesson: {
          include: {
            quizQuestions: {
              include: {
                standards: true,
              },
            },
          },
        },
        questionResponses: true,
      },
    });

    if (!attempt) {
      throw new Error(`Attempt ${attemptId} not found`);
    }

    if (attempt.completedAt === null) {
      throw new Error(`Attempt ${attemptId} has not been completed yet`);
    }

    const attemptData = attempt as unknown as AttemptWithRelations;

    // Build a map of questionId -> standards for quick lookup
    const questionStandardsMap = new Map<
      string,
      Array<{ id: string; code: string }>
    >();
    for (const question of attemptData.lesson.quizQuestions) {
      questionStandardsMap.set(question.id, question.standards);
    }

    // Gather unique standard IDs across all responses
    const standardIds = new Set<string>();
    for (const response of attemptData.questionResponses) {
      const standards = questionStandardsMap.get(response.questionId) ?? [];
      for (const std of standards) {
        standardIds.add(std.id);
      }
    }

    // Fetch existing mastery records for these standards
    const existingMasteryRows = await prisma.standardMastery.findMany({
      where: {
        studentId,
        standardId: { in: Array.from(standardIds) },
      },
    });

    const existingMasteryMap = new Map<string, ExistingMasteryRow>();
    for (const row of existingMasteryRows) {
      existingMasteryMap.set(row.standardId, {
        standardId: row.standardId,
        masteryLevel: row.masteryLevel instanceof Decimal
          ? row.masteryLevel.toNumber()
          : Number(row.masteryLevel),
        evidenceCount: row.evidenceCount,
        lastAssessedAt: row.lastAssessedAt,
      });
    }

    // Accumulate mastery adjustments per standard
    const standardAccumulators = new Map<
      string,
      {
        totalWeight: number;
        correctWeight: number;
        evidence: number;
        lastAssessedAt: Date;
      }
    >();

    const referenceTime = attemptData.questionResponses.length > 0
      ? attemptData.questionResponses.reduce(
          (latest, r) => (r.answeredAt > latest ? r.answeredAt : latest),
          attemptData.questionResponses[0].answeredAt
        )
      : new Date();

    for (const response of attemptData.questionResponses) {
      const standards = questionStandardsMap.get(response.questionId) ?? [];
      if (standards.length === 0) continue;

      const question = attemptData.lesson.quizQuestions.find(
        q => q.id === response.questionId
      );
      const diffWeight = difficultyWeight(question?.points ?? 1);
      const recWeight = recencyWeight(response.answeredAt, referenceTime);
      const perStandardWeight = (diffWeight * recWeight) / standards.length;

      for (const std of standards) {
        const existing = existingMasteryMap.get(std.id);
        const accumulator = standardAccumulators.get(std.id) ?? {
          totalWeight: 0,
          correctWeight: 0,
          evidence: 0,
          lastAssessedAt: existing?.lastAssessedAt ?? new Date(0),
        };

        accumulator.totalWeight += perStandardWeight;
        accumulator.correctWeight += response.isCorrect
          ? perStandardWeight
          : 0;
        accumulator.evidence += 1;
        if (response.answeredAt > accumulator.lastAssessedAt) {
          accumulator.lastAssessedAt = response.answeredAt;
        }

        standardAccumulators.set(std.id, accumulator);
      }
    }

    // Apply mastery updates using recordStandardMastery
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
      const nextMastery = clampMasteryLevel(safeNext);

      const previousEvidence = existing?.evidenceCount ?? 0;
      const evidenceDelta = previousEvidence + accumulator.evidence;

      await recordStandardMastery(prisma, {
        studentId,
        standardId,
        masteryLevel: nextMastery,
        evidenceDelta,
        lastAssessedAt: accumulator.lastAssessedAt,
      });

      updatedCount += 1;
    }

    // Set MasteryRun to COMPLETED
    await prisma.masteryRun.update({
      where: { attemptId },
      data: {
        status: 'COMPLETED',
        updatedCount,
      },
    });

    return {
      attemptId,
      status: 'COMPLETED',
      updatedCount,
      lastError: null,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    // Set MasteryRun to FAILED
    await prisma.masteryRun.update({
      where: { attemptId },
      data: {
        status: 'FAILED',
        lastError: errorMessage,
      },
    });

    return {
      attemptId,
      status: 'FAILED',
      updatedCount: 0,
      lastError: errorMessage,
    };
  }
}
