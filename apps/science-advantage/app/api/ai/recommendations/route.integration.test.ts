import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const getCurrentSessionMock = vi.fn();
const prismaMock = {
  attempt: {
    findUnique: vi.fn(),
  },
};
const buildRecommendationContextMock = vi.fn();
const generateRecommendationMock = vi.fn();
const envMock = {
  DEV_AUTH_ENABLED: false,
};

const loggerSpies = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
};

const metricSpies = {
  increment: vi.fn(),
  observe: vi.fn(),
};

const aiConfigMock = {
  primaryModel: 'mock-model',
  secondaryModel: 'mock-secondary',
  timeoutMs: 1000,
  cacheTtlMs: 1000,
  hashSecret: 'secret',
  maxRequestsPerWindow: 2,
  rateLimitWindowMs: 60_000,
};

vi.mock('@/lib/auth/session', () => ({
  getCurrentSession: getCurrentSessionMock,
}));

vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: prismaMock,
}));

vi.mock('@/lib/ai/recommendation-context', () => ({
  buildRecommendationContext: buildRecommendationContextMock,
}));

vi.mock('@/lib/ai/recommendation-service', () => ({
  generateRecommendation: generateRecommendationMock,
}));

vi.mock('@/lib/env', () => ({
  env: envMock,
}));

vi.mock('@/lib/observability/logger', () => ({
  logger: loggerSpies,
}));

vi.mock('@/lib/observability/metrics', () => ({
  metrics: metricSpies,
}));

vi.mock('@/lib/config/ai', () => ({
  aiConfig: aiConfigMock,
}));

import { POST, unstable_recommendationTestkit } from '@/app/api/ai/recommendations/route';

function createRequest(body: unknown) {
  return {
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

const baseAttempt = {
  id: 'att-1',
  studentId: 'student-1',
  lessonId: 'lesson-1',
  score: 8,
  maxScore: 10,
  completedAt: new Date('2024-01-01T00:00:00.000Z'),
  lesson: {
    id: 'lesson-1',
    title: 'Lesson 1',
    lessonType: 'LESSON',
    gradeLevel: 4,
    order: 1,
    standards: [],
    curriculumUnits: [],
  },
  student: { id: 'student-1', gradeLevel: 4 },
  questionResponses: [],
};

const baseContext = {
  traceId: 'trace-ctx',
  studentId: 'student-1',
  studentHash: 'hash',
  studentGrade: 4,
  standardsAlignment: 'THAI',
  masterySnapshot: [],
  masteryVersion: 1,
  candidateLessons: [],
  attemptSummary: {
    attemptId: 'att-1',
    lessonId: 'lesson-1',
    lessonSlug: 'lesson-1',
    lessonTitle: 'Lesson 1',
    completedAt: '2024-01-01T00:00:00.000Z',
    scorePercentage: 80,
    questionCount: 0,
    correctCount: 0,
    incorrectStandards: [],
  },
  curriculumTitle: null,
};

const baseRecommendation = {
  recommendation: {
    recommendedLessonId: 'lesson-next',
    recommendedLessonSlug: 'lesson-next',
    lessonTitle: 'Next Lesson',
    focusStandards: ['SC1'],
    reasoning: 'Because reasons',
    confidence: 'high',
    nextBestAlternatives: [],
  },
  modelUsed: 'mock-model',
  fallbackUsed: false,
};

describe('POST /api/ai/recommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    unstable_recommendationTestkit.reset();
    envMock.DEV_AUTH_ENABLED = false;
    aiConfigMock.maxRequestsPerWindow = 2;

    getCurrentSessionMock.mockResolvedValue({
      user: { id: 'student-1', role: 'STUDENT' },
    });
    prismaMock.attempt.findUnique.mockResolvedValue({ ...baseAttempt });
    buildRecommendationContextMock.mockResolvedValue({ ...baseContext });
    generateRecommendationMock.mockResolvedValue({ ...baseRecommendation });
  });

  it('returns 401 when session missing', async () => {
    getCurrentSessionMock.mockResolvedValue(null);
    const response = await POST(createRequest({ attemptId: 'att-1' }));
    expect(response.status).toBe(401);
  });

  it('returns 404 when attempt missing', async () => {
    prismaMock.attempt.findUnique.mockResolvedValue(null);
    const response = await POST(createRequest({ attemptId: 'att-unknown' }));
    expect(response.status).toBe(404);
  });

  it('rejects student accessing other attempt', async () => {
    prismaMock.attempt.findUnique.mockResolvedValue({
      ...baseAttempt,
      studentId: 'someone-else',
    });
    const response = await POST(createRequest({ attemptId: 'att-1' }));
    expect(response.status).toBe(403);
  });

  it('allows teacher impersonation when dev flag enabled', async () => {
    envMock.DEV_AUTH_ENABLED = true;
    getCurrentSessionMock.mockResolvedValue({
      user: { id: 'teacher-1', role: 'TEACHER' },
    });
    prismaMock.attempt.findUnique.mockResolvedValue({
      ...baseAttempt,
      studentId: 'student-2',
    });

    const response = await POST(createRequest({ attemptId: 'att-1' }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(generateRecommendationMock).toHaveBeenCalledTimes(1);
  });

  it('caches responses for identical mastery versions', async () => {
    const request = createRequest({ attemptId: 'att-1' });
    await POST(request);
    await POST(request);

    expect(generateRecommendationMock).toHaveBeenCalledTimes(1);
  });

  it('rate limits after configured threshold', async () => {
    aiConfigMock.maxRequestsPerWindow = 1;

    await POST(createRequest({ attemptId: 'att-1' }));
    const response = await POST(createRequest({ attemptId: 'att-1' }));

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toBe('RATE_LIMITED');
  });

  it('returns 400 for invalid JSON bodies', async () => {
    const request = {
      json: vi.fn().mockRejectedValue(new Error('boom')),
    } as unknown as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
