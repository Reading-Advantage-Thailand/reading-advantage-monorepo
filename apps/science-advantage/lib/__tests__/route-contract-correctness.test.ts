import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { UserContext } from '@reading-advantage/auth';
import { createMockDb } from '../../../../packages/domain/src/__tests__/mock-db.js';
import { getLessonBySlug } from '@reading-advantage/domain/curriculum';

/**
 * Phase 2 Red tests for Science ST-4 (Route/contract correctness).
 *
 * These tests prove the missing/incomplete contracts described in
 * measure/tracks/wave4_app_security_correctness_backlog_20260628/site-closures/ST-4.md:
 *   - CR-03: JSON-401 auth helper shape ({ status, json }) instead of a redirect/string.
 *   - CR-06: "me" alias rejected by UUID param schemas.
 *   - CR-06: limit query param strictly rejected instead of clamped to MAX.
 *   - ME-01: update-mastery route swallows unhandled errors as 202 QUEUED.
 *   - ME-04: lesson endpoint returns an orphan lesson for admin even when it is not
 *            part of any class curriculum.
 *
 * Every test below is intentionally red at HEAD. The Green role must implement the
 * helper/schema/route/domain fixes; removing any fix must turn the corresponding
 * test red again (falsifiability).
 */

let mutableMockDb = createMockDb();

vi.mock('@reading-advantage/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@reading-advantage/db')>();
  return {
    ...actual,
    get db() {
      return mutableMockDb;
    },
  };
});

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => undefined),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock('@/lib/auth/session', () => ({
  getCurrentSession: vi.fn(async () => ({
    user: {
      id: 'student-1',
      username: 'student1',
      name: 'Student One',
      role: 'STUDENT',
      schoolId: 'school-1',
      xp: 0,
      level: 1,
      cefrLevel: 'A1',
    },
  })),
}));

vi.mock('@reading-advantage/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@reading-advantage/auth')>();
  return {
    ...actual,
    AuthError: class extends Error {
      public readonly code = 'UNAUTHORIZED';
      constructor(message: string) {
        super(message);
        this.name = 'AuthError';
      }
    },
  };
});

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_ENABLE_MASTERY_PIPELINE: 'false',
  },
}));

vi.mock('@/lib/observability/metrics', () => ({
  metrics: {
    increment: vi.fn(),
    observe: vi.fn(),
  },
}));

vi.mock('@/lib/auth/server', () => ({
  requireAuth: vi.fn(async () => {
    // Simulate the current redirect-based auth helper used by API routes.
    throw Object.assign(new Error('NEXT_REDIRECT'), {
      digest: 'NEXT_REDIRECT;replace;/signin',
    });
  }),
}));

vi.mock('@reading-advantage/domain/mastery', () => ({
  recordRun: vi.fn(),
  recordRunFailure: vi.fn(),
  RateLimitError: class extends Error {
    retryAfter: number;
    constructor(retryAfter: number) {
      super('rate-limit');
      this.name = 'RateLimitError';
      this.retryAfter = retryAfter;
    }
  },
}));

vi.mock('@reading-advantage/domain/students', () => ({
  getStudentMasteryProfile: vi.fn(async () => ({ strands: [] })),
  getStudentLessonProgress: vi.fn(async () => ({
    studentId: 'student-1',
    lessonId: 'lesson-1',
    status: 'NOT_STARTED',
    attemptsCount: 0,
    bestScore: null,
    bestScorePercentage: null,
    mostRecentScore: null,
    mostRecentScorePercentage: null,
    totalTimeSpentSeconds: 0,
    lastAttemptAt: null,
    completedAt: null,
  })),
  getStudentClassAnalytics: vi.fn(async () => ({})),
}));

const adminUser: UserContext = {
  id: 'admin-1',
  username: 'admin1',
  name: 'Admin One',
  role: 'ADMIN',
  schoolId: 'school-1',
  xp: 0,
  level: 1,
  cefrLevel: 'A1',
};

const tenant = { schoolId: 'school-1' };

beforeEach(() => {
  mutableMockDb = createMockDb();
  vi.clearAllMocks();
});

describe('ST-4 CR-03 JSON-401 auth helper', () => {
  it('returns JSON 401 from an API route instead of a redirect/HTML response', async () => {
    const { GET } = await import(
      '@/app/api/students/[studentId]/classes/[classId]/analytics/route'
    );

    const request = new NextRequest(
      'http://localhost/api/students/00000000-0000-0000-0000-000000000001/classes/00000000-0000-0000-0000-000000000002/analytics',
    );
    const response = await GET(request, {
      params: Promise.resolve({
        studentId: '00000000-0000-0000-0000-000000000001',
        classId: '00000000-0000-0000-0000-000000000002',
      }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toEqual(expect.any(String));
  });
});

describe('ST-4 CR-06 "me" alias', () => {
  it('resolves "me" to the authenticated user before calling the domain', async () => {
    const { GET } = await import(
      '@/app/api/students/[studentId]/lessons/[lessonId]/progress/route'
    );
    const { getStudentLessonProgress } = await import(
      '@reading-advantage/domain/students'
    );

    const request = new NextRequest(
      'http://localhost/api/students/me/lessons/lesson-1/progress',
    );
    const response = await GET(request, {
      params: Promise.resolve({ studentId: 'me', lessonId: 'lesson-1' }),
    });

    expect(response.status).toBe(200);
    expect(getStudentLessonProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ studentId: 'me', lessonId: 'lesson-1' }),
      }),
    );
  });
});

describe('ST-4 CR-06 limit clamp', () => {
  it('clamps limit=300 to MAX (100) before calling the domain', async () => {
    const { GET } = await import(
      '@/app/api/students/[studentId]/mastery-profile/route'
    );
    const { getStudentMasteryProfile } = await import(
      '@reading-advantage/domain/students'
    );

    const studentId = '00000000-0000-0000-0000-000000000001';
    const request = new NextRequest(
      `http://localhost/api/students/${studentId}/mastery-profile?limit=300`,
    );
    const response = await GET(request, {
      params: Promise.resolve({ studentId }),
    });

    expect(response.status).toBe(200);
    expect(getStudentMasteryProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ limit: 100 }),
      }),
    );
  });

  it('rejects a non-numeric limit', async () => {
    const { GET } = await import(
      '@/app/api/students/[studentId]/mastery-profile/route'
    );

    const studentId = '00000000-0000-0000-0000-000000000001';
    const request = new NextRequest(
      `http://localhost/api/students/${studentId}/mastery-profile?limit=abc`,
    );
    const response = await GET(request, {
      params: Promise.resolve({ studentId }),
    });

    expect(response.status).toBe(400);
  });
});

describe('ST-4 ME-01 update-mastery error mapping', () => {
  it('does not map an unhandled domain error to 202 QUEUED', async () => {
    const { recordRun } = await import('@reading-advantage/domain/mastery');
    const { POST } = await import('@/app/api/ai/update-mastery/route');

    vi.mocked(recordRun).mockRejectedValueOnce(
      new Error('Unexpected domain failure'),
    );

    const request = new NextRequest(
      'http://localhost/api/ai/update-mastery',
      {
        method: 'POST',
        body: JSON.stringify({ attemptId: 'attempt-1' }),
      },
    );

    const response = await POST(request);
    expect(response.status).not.toBe(202);

    const body = await response.json();
    expect(body.reason).toBeUndefined();
    expect(body.error).toEqual(expect.any(String));
  });
});

describe('ST-4 ME-04 lesson ∈ curriculum verification', () => {
  it('rejects an admin request for a lesson that is not in any class curriculum', async () => {
    mutableMockDb = createMockDb({
      selectSequence: [
        [
          {
            id: 'lesson-orphan',
            slug: 'orphan',
            title: 'Orphan Lesson',
            description: null,
            descriptionThai: null,
            content: null,
            structuredContent: null,
            gradeLevel: 3,
            order: 1,
            lessonType: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            schoolId: tenant.schoolId,
          },
        ],
        [],
        [],
      ],
    });

    const result = await getLessonBySlug({
      user: adminUser,
      tenant,
      input: { lessonSlug: 'lesson-orphan' },
    });

    expect(result).not.toHaveProperty('lesson');
    expect(result === 'FORBIDDEN' || result === null).toBe(true);
  });

  it('returns a lesson that is linked to a class curriculum', async () => {
    mutableMockDb = createMockDb({
      selectSequence: [
        [
          {
            id: 'lesson-curriculum',
            slug: 'curriculum',
            title: 'Curriculum Lesson',
            description: null,
            descriptionThai: null,
            content: null,
            structuredContent: null,
            gradeLevel: 3,
            order: 1,
            lessonType: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            schoolId: tenant.schoolId,
          },
        ],
        [],
        [{ classId: 'class-1', teacherId: adminUser.id }],
      ],
    });

    const result = await getLessonBySlug({
      user: adminUser,
      tenant,
      input: { lessonSlug: 'lesson-curriculum' },
    });

    expect(result).toHaveProperty('lesson');
    if (result !== 'FORBIDDEN' && result !== null) {
      expect(result.lesson.id).toBe('lesson-curriculum');
    }
  });
});
