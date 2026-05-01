import { MasteryRunStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getCurrentSessionMock,
  prismaMock,
  standardMasteryStore,
  masteryRunStore,
  setDefaultImplementations,
} = vi.hoisted(() => {
  const getCurrentSessionMock = vi.fn();

  type StandardMasteryRecord = {
    id: string;
    studentId: string;
    standardId: string;
    masteryLevel: number;
    evidenceCount: number;
    lastAssessedAt: Date;
    createdAt: Date;
    updatedAt: Date;
  };

  type MasteryRunRecord = {
    attemptId: string;
    studentId: string;
    status: MasteryRunStatus;
    updatedCount: number;
    lastError: string | null;
    createdAt: Date;
    updatedAt: Date;
  };

  const standardMasteryStore = new Map<string, StandardMasteryRecord>();
  const masteryRunStore = new Map<string, MasteryRunRecord>();

  const standardMasteryApi = {
    findMany: vi.fn(),
    upsert: vi.fn(),
  };

  const masteryRunApi = {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  const tx = {
    standardMastery: standardMasteryApi,
    masteryRun: masteryRunApi,
  };

  const prismaMock = {
    attempt: {
      findUnique: vi.fn(),
    },
    masteryRun: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  const setDefaultImplementations = () => {
    standardMasteryApi.findMany.mockImplementation(
      async (params: {
        where: { studentId: string; standardId: { in: string[] } };
        orderBy?: { standardId: 'asc' | 'desc' };
      }) => {
        const records = Array.from(standardMasteryStore.values()).filter(
          record =>
            record.studentId === params.where.studentId &&
            params.where.standardId.in.includes(record.standardId)
        );

        if (params.orderBy?.standardId === 'asc') {
          records.sort((a, b) => a.standardId.localeCompare(b.standardId));
        }

        return records.map(record => ({ ...record }));
      }
    );

    standardMasteryApi.upsert.mockImplementation(
      async (params: {
        where: { studentId_standardId: { studentId: string; standardId: string } };
        update: {
          masteryLevel: number;
          evidenceCount: number;
          lastAssessedAt: Date;
        };
        create: {
          studentId: string;
          standardId: string;
          masteryLevel: number;
          evidenceCount: number;
          lastAssessedAt: Date;
        };
      }) => {
        const {
          studentId,
          standardId,
        } = params.where.studentId_standardId;
        const key = `${studentId}:${standardId}`;
        const now = new Date();
        const existing = standardMasteryStore.get(key);

        if (existing) {
          const updated = {
            ...existing,
            masteryLevel: params.update.masteryLevel,
            evidenceCount: params.update.evidenceCount,
            lastAssessedAt: params.update.lastAssessedAt,
            updatedAt: now,
          };
          standardMasteryStore.set(key, updated);
          return { ...updated };
        }

        const created = {
          id: `sm_${studentId}_${standardId}`,
          studentId,
          standardId,
          masteryLevel: params.create.masteryLevel,
          evidenceCount: params.create.evidenceCount,
          lastAssessedAt: params.create.lastAssessedAt,
          createdAt: now,
          updatedAt: now,
        };
        standardMasteryStore.set(key, created);
        return { ...created };
      }
    );

    masteryRunApi.findUnique.mockImplementation(
      async (params: { where: { attemptId: string } }) => {
        const record = masteryRunStore.get(params.where.attemptId);
        if (!record) {
          return null;
        }
        return { ...record };
      }
    );

    masteryRunApi.create.mockImplementation(
      async (params: {
        data: {
          attemptId: string;
          studentId: string;
          status: MasteryRunStatus;
        };
      }) => {
        if (masteryRunStore.has(params.data.attemptId)) {
          const error = Object.assign(
            new Error('Unique constraint failed'),
            { code: 'P2002' as const }
          );
          throw error;
        }

        const now = new Date();
        const record: MasteryRunRecord = {
          attemptId: params.data.attemptId,
          studentId: params.data.studentId,
          status: params.data.status,
          updatedCount: 0,
          lastError: null,
          createdAt: now,
          updatedAt: now,
        };
        masteryRunStore.set(params.data.attemptId, record);
        return { ...record };
      }
    );

    masteryRunApi.update.mockImplementation(
      async (params: {
        where: { attemptId: string };
        data: Partial<{
          status: MasteryRunStatus;
          updatedCount: number;
          lastError: string | null;
        }>;
      }) => {
        const existing = masteryRunStore.get(params.where.attemptId);
        if (!existing) {
          throw new Error('Mastery run not found');
        }
        const updated = {
          ...existing,
          ...params.data,
          updatedAt: new Date(),
        };
        masteryRunStore.set(params.where.attemptId, updated);
        return { ...updated };
      }
    );

    prismaMock.masteryRun.upsert.mockImplementation(
      async (params: {
        where: { attemptId: string };
        update: {
          status: MasteryRunStatus;
          lastError: string | null;
        };
        create: {
          attemptId: string;
          studentId: string;
          status: MasteryRunStatus;
          lastError: string | null;
        };
      }) => {
        const existing = masteryRunStore.get(params.where.attemptId);
        const now = new Date();
        if (existing) {
          const updated = {
            ...existing,
            status: params.update.status,
            lastError: params.update.lastError,
            updatedAt: now,
          };
          masteryRunStore.set(params.where.attemptId, updated);
          return { ...updated };
        }
        const created = {
          attemptId: params.create.attemptId,
          studentId: params.create.studentId,
          status: params.create.status,
          updatedCount: 0,
          lastError: params.create.lastError,
          createdAt: now,
          updatedAt: now,
        };
        masteryRunStore.set(params.create.attemptId, created);
        return { ...created };
      }
    );

    prismaMock.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)
    );
  };

  setDefaultImplementations();

  return {
    getCurrentSessionMock,
    prismaMock,
    standardMasteryStore,
    masteryRunStore,
    setDefaultImplementations,
  };
});

vi.mock('@/lib/auth/session', () => ({
  getCurrentSession: getCurrentSessionMock,
}));

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_ENABLE_MASTERY_PIPELINE: true,
  },
}));

const loggerSpies = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/lib/observability/logger', () => ({
  logger: loggerSpies,
}));

const metricSpies = vi.hoisted(() => ({
  increment: vi.fn(),
  observe: vi.fn(),
}));

vi.mock('@/lib/observability/metrics', () => ({
  metrics: metricSpies,
}));

vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: prismaMock,
}));

// Import after mocks
import { POST } from '@/app/api/ai/update-mastery/route';

function createJsonRequest(body: unknown) {
  return {
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Parameters<typeof POST>[0];
}

function buildAttempt(overrides: Partial<Awaited<ReturnType<typeof prismaMock.attempt.findUnique>>> = {}) {
  return {
    id: 'att-default',
    studentId: 'student-default',
    completedAt: new Date('2025-10-29T02:00:00.000Z'),
    questionResponses: [],
    masteryRun: null,
    ...overrides,
  };
}

describe('POST /api/ai/update-mastery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
     setDefaultImplementations();
     standardMasteryStore.clear();
     masteryRunStore.clear();
    getCurrentSessionMock.mockResolvedValue({
      user: {
        id: 'student-default',
        role: 'STUDENT',
      },
    });
  });

  it('returns 401 when no session is present', async () => {
    getCurrentSessionMock.mockResolvedValueOnce(null);

    const request = createJsonRequest({ attemptId: 'att-unauth' });
    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(prismaMock.attempt.findUnique).not.toHaveBeenCalled();
  });

  it('returns 403 when student does not own the attempt', async () => {
    prismaMock.attempt.findUnique.mockResolvedValue(
      buildAttempt({
        id: 'att-owned',
        studentId: 'student-owned',
      })
    );

    const request = createJsonRequest({ attemptId: 'att-owned' });
    const response = await POST(request);

    expect(response.status).toBe(403);
  });

  it('returns 200 with zero updates when responses have no standards', async () => {
    prismaMock.attempt.findUnique.mockResolvedValue(
      buildAttempt({
        id: 'att-no-standards',
        questionResponses: [
          {
            isCorrect: true,
            answeredAt: new Date('2025-10-29T03:00:00.000Z'),
            question: {
              points: 1,
              standards: [],
            },
          },
        ],
      })
    );

    const request = createJsonRequest({ attemptId: 'att-no-standards' });
    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.updated).toBe(0);
    expect(payload.records).toHaveLength(0);
  });

  it('persists mastery updates for the happy path', async () => {
    prismaMock.attempt.findUnique.mockResolvedValue(
      buildAttempt({
        id: 'att-happy',
        studentId: 'student-happy',
        completedAt: new Date('2025-10-29T02:00:00.000Z'),
        questionResponses: [
          {
            isCorrect: true,
            answeredAt: new Date('2025-10-29T02:00:00.000Z'),
            question: {
              points: 2,
              standards: [{ id: 'std-1' }],
            },
          },
          {
            isCorrect: false,
            answeredAt: new Date('2025-10-29T02:05:00.000Z'),
            question: {
              points: 1,
              standards: [{ id: 'std-2' }],
            },
          },
        ],
      })
    );

    getCurrentSessionMock.mockResolvedValue({
      user: {
        id: 'student-happy',
        role: 'STUDENT',
      },
    });

    const request = createJsonRequest({ attemptId: 'att-happy' });
    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.updated).toBe(2);
    expect(payload.records).toHaveLength(2);
    expect(payload.records[0]).toMatchObject({
      standardId: 'std-1',
      masteryLevel: 0.65,
      evidenceCount: 1,
    });

    expect(standardMasteryStore.size).toBe(2);
    expect(metricSpies.increment).toHaveBeenCalledWith(
      'mastery_updates_total',
      2,
      expect.objectContaining({
        studentId: 'student-happy',
        attemptId: 'att-happy',
      })
    );
  });

  it('handles concurrent invocations by only committing once', async () => {
    prismaMock.attempt.findUnique.mockResolvedValue(
      buildAttempt({
        id: 'att-concurrent',
        studentId: 'student-concurrent',
        completedAt: new Date('2025-10-29T04:00:00.000Z'),
        questionResponses: [
          {
            isCorrect: true,
            answeredAt: new Date('2025-10-29T04:00:00.000Z'),
            question: {
              points: 1,
              standards: [{ id: 'std-3' }],
            },
          },
        ],
      })
    );

    getCurrentSessionMock.mockResolvedValue({
      user: {
        id: 'student-concurrent',
        role: 'STUDENT',
      },
    });

    const requestA = createJsonRequest({ attemptId: 'att-concurrent' });
    const requestB = createJsonRequest({ attemptId: 'att-concurrent' });

    const [responseA, responseB] = await Promise.all([
      POST(requestA),
      POST(requestB),
    ]);

    const payloadA = await responseA.json();
    const payloadB = await responseB.json();

    const statuses = [responseA.status, responseB.status].sort();
    expect(statuses).toEqual([200, 202]);

    const successPayload = responseA.status === 200 ? payloadA : payloadB;
    const queuedPayload = responseA.status === 202 ? payloadA : payloadB;

    expect(successPayload.updated).toBe(1);
    expect(queuedPayload.reason).toBe('QUEUED');

    const runRecord = masteryRunStore.get('att-concurrent');
    expect(runRecord?.status).toBe(MasteryRunStatus.COMPLETED);
    expect(runRecord?.updatedCount).toBe(1);
    expect(standardMasteryStore.size).toBe(1);
  });

  it('returns 202 and marks run failed when transaction throws', async () => {
    prismaMock.attempt.findUnique.mockResolvedValue(
      buildAttempt({
        id: 'att-failure',
        studentId: 'student-failure',
        completedAt: new Date('2025-10-29T05:00:00.000Z'),
        questionResponses: [
          {
            isCorrect: true,
            answeredAt: new Date('2025-10-29T05:00:00.000Z'),
            question: {
              points: 1,
              standards: [{ id: 'std-5' }],
            },
          },
        ],
      })
    );

    getCurrentSessionMock.mockResolvedValue({
      user: {
        id: 'student-failure',
        role: 'STUDENT',
      },
    });

    prismaMock.$transaction.mockRejectedValueOnce(new Error('boom'));

    const request = createJsonRequest({ attemptId: 'att-failure' });
    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(202);
    expect(payload.reason).toBe('QUEUED');

    const runRecord = masteryRunStore.get('att-failure');
    expect(runRecord?.status).toBe(MasteryRunStatus.FAILED);
    expect(metricSpies.increment).toHaveBeenCalledWith(
      'mastery_updates_failed_total',
      1,
      expect.objectContaining({
        studentId: 'student-failure',
        attemptId: 'att-failure',
      })
    );
  });
});
