import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';

import {
  processMasteryRun,
  type MasteryRunContext,
} from '@/lib/services/mastery/mastery-worker';

describe('processMasteryRun', () => {
  let ctx: MasteryRunContext;

  beforeEach(() => {
    ctx = {
      attemptId: 'attempt-1',
      studentId: 'student-1',
    };
  });

  it('updates standard mastery after quiz submission', async () => {
    const prisma = createMockPrisma({
      masteryRun: {
        attemptId: 'attempt-1',
        studentId: 'student-1',
        status: 'PENDING',
        updatedCount: 0,
        lastError: null,
      },
      attempt: {
        id: 'attempt-1',
        studentId: 'student-1',
        lessonId: 'lesson-1',
        attemptNumber: 1,
        startedAt: new Date('2025-10-29T00:00:00Z'),
        lesson: {
          quizQuestions: [
            {
              id: 'q1',
              slug: 'q1',
              type: 'MULTIPLE_CHOICE',
              text: 'What is H2O?',
              points: 1,
              order: 1,
              standards: [{ id: 'std-chem-1', code: 'Sc1.1-G3' }],
            },
          ],
        },
        questionResponses: [
          {
            id: 'qr-1',
            attemptId: 'attempt-1',
            questionId: 'q1',
            isCorrect: true,
            timeSpentSeconds: 10,
            answeredAt: new Date('2025-10-29T00:01:00Z'),
          },
        ],
      },
      existingMastery: [],
    });

    const result = await processMasteryRun(ctx, prisma);

    expect(result.status).toBe('COMPLETED');
    expect(result.updatedCount).toBe(1);
    expect(prisma.standardMastery.upsert).toHaveBeenCalledOnce();
  });

  it('transitions MasteryRun through PENDING → PROCESSING → COMPLETED', async () => {
    const statusUpdates: string[] = [];
    const prisma = createMockPrisma({
      masteryRun: {
        attemptId: 'attempt-1',
        studentId: 'student-1',
        status: 'PENDING',
        updatedCount: 0,
        lastError: null,
      },
      attempt: {
        id: 'attempt-1',
        studentId: 'student-1',
        lessonId: 'lesson-1',
        attemptNumber: 1,
        startedAt: new Date('2025-10-29T00:00:00Z'),
        lesson: {
          quizQuestions: [
            {
              id: 'q1',
              slug: 'q1',
              type: 'MULTIPLE_CHOICE',
              text: 'Test question',
              points: 1,
              order: 1,
              standards: [{ id: 'std-1', code: 'Sc1.1-G3' }],
            },
          ],
        },
        questionResponses: [
          {
            id: 'qr-1',
            attemptId: 'attempt-1',
            questionId: 'q1',
            isCorrect: true,
            timeSpentSeconds: 5,
            answeredAt: new Date('2025-10-29T00:01:00Z'),
          },
        ],
      },
      existingMastery: [],
      onStatusUpdate: (status: string) => {
        statusUpdates.push(status);
      },
    });

    await processMasteryRun(ctx, prisma);

    expect(statusUpdates).toContain('PROCESSING');
    expect(statusUpdates).toContain('COMPLETED');
    const processIdx = statusUpdates.indexOf('PROCESSING');
    const completedIdx = statusUpdates.indexOf('COMPLETED');
    expect(processIdx).toBeLessThan(completedIdx);
  });

  it('handles multi-standard questions (one question maps to multiple standards)', async () => {
    const prisma = createMockPrisma({
      masteryRun: {
        attemptId: 'attempt-1',
        studentId: 'student-1',
        status: 'PENDING',
        updatedCount: 0,
        lastError: null,
      },
      attempt: {
        id: 'attempt-1',
        studentId: 'student-1',
        lessonId: 'lesson-1',
        attemptNumber: 1,
        startedAt: new Date('2025-10-29T00:00:00Z'),
        lesson: {
          quizQuestions: [
            {
              id: 'q1',
              slug: 'q1',
              type: 'MULTIPLE_CHOICE',
              text: 'Cross-cutting question',
              points: 1,
              order: 1,
              standards: [
                { id: 'std-chem-1', code: 'Sc1.1-G3' },
                { id: 'std-phys-1', code: 'Sc2.1-G3' },
              ],
            },
          ],
        },
        questionResponses: [
          {
            id: 'qr-1',
            attemptId: 'attempt-1',
            questionId: 'q1',
            isCorrect: true,
            timeSpentSeconds: 15,
            answeredAt: new Date('2025-10-29T00:01:00Z'),
          },
        ],
      },
      existingMastery: [],
    });

    const result = await processMasteryRun(ctx, prisma);

    expect(result.status).toBe('COMPLETED');
    expect(result.updatedCount).toBe(2);
    expect(prisma.standardMastery.upsert).toHaveBeenCalledTimes(2);
  });

  it('applies retry attempt weighting (recent attempts weighted higher)', async () => {
    const prisma = createMockPrisma({
      masteryRun: {
        attemptId: 'attempt-3',
        studentId: 'student-1',
        status: 'PENDING',
        updatedCount: 0,
        lastError: null,
      },
      attempt: {
        id: 'attempt-3',
        studentId: 'student-1',
        lessonId: 'lesson-1',
        attemptNumber: 3,
        startedAt: new Date('2025-10-29T02:00:00Z'),
        lesson: {
          quizQuestions: [
            {
              id: 'q1',
              slug: 'q1',
              type: 'MULTIPLE_CHOICE',
              text: 'Retry question',
              points: 1,
              order: 1,
              standards: [{ id: 'std-1', code: 'Sc1.1-G3' }],
            },
          ],
        },
        questionResponses: [
          {
            id: 'qr-1',
            attemptId: 'attempt-3',
            questionId: 'q1',
            isCorrect: true,
            timeSpentSeconds: 8,
            answeredAt: new Date('2025-10-29T02:01:00Z'),
          },
        ],
      },
      existingMastery: [
        {
          standardId: 'std-1',
          masteryLevel: 0.5,
          evidenceCount: 3,
          lastAssessedAt: new Date('2025-10-29T01:00:00Z'),
        },
      ],
    });

    const result = await processMasteryRun(ctx, prisma);

    expect(result.status).toBe('COMPLETED');
    expect(result.updatedCount).toBe(1);

    const upsertCall = (prisma.standardMastery.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(upsertCall.where).toEqual({
      studentId_standardId: { studentId: 'student-1', standardId: 'std-1' },
    });
    const newMastery = upsertCall.create.masteryLevel instanceof Decimal
      ? upsertCall.create.masteryLevel.toNumber()
      : Number(upsertCall.create.masteryLevel);
    expect(newMastery).toBeGreaterThan(0.5);
    expect(newMastery).toBeLessThanOrEqual(1);
  });

  it('clamps mastery level to [0, 1] range', async () => {
    const prisma = createMockPrisma({
      masteryRun: {
        attemptId: 'attempt-1',
        studentId: 'student-1',
        status: 'PENDING',
        updatedCount: 0,
        lastError: null,
      },
      attempt: {
        id: 'attempt-1',
        studentId: 'student-1',
        lessonId: 'lesson-1',
        attemptNumber: 1,
        startedAt: new Date('2025-10-29T00:00:00Z'),
        lesson: {
          quizQuestions: [
            {
              id: 'q1',
              slug: 'q1',
              type: 'MULTIPLE_CHOICE',
              text: 'Test',
              points: 1,
              order: 1,
              standards: [{ id: 'std-1', code: 'Sc1.1-G3' }],
            },
          ],
        },
        questionResponses: [
          {
            id: 'qr-1',
            attemptId: 'attempt-1',
            questionId: 'q1',
            isCorrect: true,
            timeSpentSeconds: 5,
            answeredAt: new Date('2025-10-29T00:01:00Z'),
          },
        ],
      },
      existingMastery: [
        {
          standardId: 'std-1',
          masteryLevel: 0.95,
          evidenceCount: 5,
          lastAssessedAt: new Date('2025-10-28T00:00:00Z'),
        },
      ],
    });

    const result = await processMasteryRun(ctx, prisma);

    expect(result.status).toBe('COMPLETED');
    const upsertCall = (prisma.standardMastery.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const newMastery = upsertCall.create.masteryLevel instanceof Decimal
      ? upsertCall.create.masteryLevel.toNumber()
      : Number(upsertCall.create.masteryLevel);
    expect(newMastery).toBeLessThanOrEqual(1);
    expect(newMastery).toBeGreaterThanOrEqual(0);
  });

  it('sets MasteryRun to FAILED with lastError on failure', async () => {
    const prisma = createMockPrisma({
      masteryRun: {
        attemptId: 'attempt-1',
        studentId: 'student-1',
        status: 'PENDING',
        updatedCount: 0,
        lastError: null,
      },
      attempt: null,
    });

    const result = await processMasteryRun(ctx, prisma);

    expect(result.status).toBe('FAILED');
    expect(result.lastError).toBeTruthy();
  });
});

function createMockPrisma(deps: {
  masteryRun: Record<string, unknown>;
  attempt: Record<string, unknown> | null;
  existingMastery: Array<Record<string, unknown>>;
  onStatusUpdate?: (status: string) => void;
}) {
  let currentStatus = deps.masteryRun.status as string;

  const onStatusUpdate = deps.onStatusUpdate;

  const standardMasteryUpsert = vi.fn().mockResolvedValue({
    id: 'sm-1',
    studentId: 'student-1',
    standardId: 'std-1',
    masteryLevel: new Decimal('0.65'),
    evidenceCount: 1,
    lastAssessedAt: new Date(),
  });

  return {
    masteryRun: {
      findUnique: vi.fn().mockResolvedValue({
        ...deps.masteryRun,
        get status() {
          return currentStatus;
        },
      }),
      update: vi.fn().mockImplementation((args: Record<string, unknown>) => {
        const data = args.data as Record<string, unknown>;
        if (data.status) {
          currentStatus = data.status as string;
          onStatusUpdate?.(data.status as string);
        }
        return Promise.resolve({ ...deps.masteryRun, ...args.data });
      }),
    },
    attempt: {
      findUnique: vi.fn().mockResolvedValue(deps.attempt),
    },
    standardMastery: {
      findMany: vi.fn().mockResolvedValue(deps.existingMastery),
      upsert: standardMasteryUpsert,
    },
    $transaction: vi.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        standardMastery: {
          upsert: standardMasteryUpsert,
        },
      };
      return fn(tx);
    }),
  };
}
