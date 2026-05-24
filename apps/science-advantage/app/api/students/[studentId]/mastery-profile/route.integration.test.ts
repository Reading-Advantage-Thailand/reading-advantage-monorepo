import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { db, sql } from '@reading-advantage/db';
import {
  accounts,
  scienceAttempts,
  scienceLessons,
  scienceMasteryRuns,
  scienceStandardMastery,
  scienceStandards,
  sessions,
  users,
} from '@reading-advantage/db/schema';
import { GET } from './route';
import { createSession } from '@/lib/auth/session';

const TEST_PREFIX = 'mastery-profile-itest';
const STANDARDS_DESC = 'mastery-profile-itest standard';

const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => mockCookies),
}));

async function cleanup(): Promise<void> {
  await db.delete(scienceMasteryRuns);
  await db.delete(scienceStandardMastery);
  await db.delete(scienceAttempts);
  await db.delete(scienceLessons);
  await db.execute(
    sql`DELETE FROM science_standards WHERE description = ${STANDARDS_DESC}`
  );
  await db.delete(sessions);
  await db.delete(accounts);
  await db.execute(sql`DELETE FROM users WHERE id LIKE ${`${TEST_PREFIX}-%`}`);
}

async function seedUser(
  id: string,
  role: 'STUDENT' | 'TEACHER' | 'ADMIN',
  opts: { gradeLevel?: number; name?: string } = {}
) {
  const [u] = await db
    .insert(users)
    .values({
      id,
      name: opts.name ?? id,
      username: id,
      displayUsername: id,
      email: `${id}@example.com`,
      role,
      gradeLevel: opts.gradeLevel ?? null,
    })
    .returning();
  return u;
}

async function seedStandard(code: string, gradeLevel = 3) {
  const [s] = await db
    .insert(scienceStandards)
    .values({
      code,
      description: STANDARDS_DESC,
      framework: 'THAI',
      gradeLevel,
    })
    .returning();
  return s;
}

async function seedMastery(
  studentId: string,
  standardId: string,
  masteryLevel: number,
  evidenceCount: number,
  lastAssessedAt: Date
) {
  const [m] = await db
    .insert(scienceStandardMastery)
    .values({
      studentId,
      standardId,
      masteryLevel: String(masteryLevel),
      evidenceCount,
      lastAssessedAt,
    })
    .returning();
  return m;
}

describe('GET /api/students/[studentId]/mastery-profile (integration)', () => {
  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);
    await cleanup();
  });

  async function seedScenario() {
    const testStudent = await seedUser(`${TEST_PREFIX}-student`, 'STUDENT', {
      gradeLevel: 3,
      name: 'Test Student',
    });
    const otherStudent = await seedUser(`${TEST_PREFIX}-other`, 'STUDENT', {
      gradeLevel: 3,
      name: 'Other Student',
    });

    const sc11 = await seedStandard('Sc1.1-G3');
    const sc12 = await seedStandard('Sc1.2-G3');
    const sc21 = await seedStandard('Sc2.1-G3');
    const sc22 = await seedStandard('Sc2.2-G3');

    await seedMastery(
      testStudent.id,
      sc11.id,
      0.85,
      10,
      new Date('2025-10-20T10:00:00Z')
    );
    await seedMastery(
      testStudent.id,
      sc12.id,
      0.72,
      8,
      new Date('2025-10-21T10:00:00Z')
    );
    await seedMastery(
      testStudent.id,
      sc21.id,
      0.45,
      5,
      new Date('2025-10-22T10:00:00Z')
    );
    await seedMastery(
      testStudent.id,
      sc22.id,
      0.55,
      6,
      new Date('2025-10-23T10:00:00Z')
    );

    return { testStudent, otherStudent };
  }

  it('returns 401 when not authenticated', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/students/anyone/mastery-profile'
    );
    const response = await GET(req, {
      params: Promise.resolve({ studentId: 'anyone' }),
    });
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('allows student to access their own profile', async () => {
    const { testStudent } = await seedScenario();
    const session = await createSession(testStudent.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const req = new NextRequest(
      `http://localhost:3000/api/students/${testStudent.id}/mastery-profile`
    );
    const response = await GET(req, {
      params: Promise.resolve({ studentId: testStudent.id }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.student.id).toBe(testStudent.id);
    expect(body.student.grade).toBe(3);
  });

  it('denies one student from viewing another student profile', async () => {
    const { testStudent, otherStudent } = await seedScenario();
    const session = await createSession(otherStudent.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const req = new NextRequest(
      `http://localhost:3000/api/students/${testStudent.id}/mastery-profile`
    );
    const response = await GET(req, {
      params: Promise.resolve({ studentId: testStudent.id }),
    });
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns READY status when no pending mastery runs exist', async () => {
    const { testStudent } = await seedScenario();
    const session = await createSession(testStudent.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const req = new NextRequest(
      `http://localhost:3000/api/students/${testStudent.id}/mastery-profile`
    );
    const response = await GET(req, {
      params: Promise.resolve({ studentId: testStudent.id }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('READY');
    expect(body.retryAfterSeconds).toBeUndefined();
  });

  it('returns CALCULATING status when a pending mastery run exists', async () => {
    const { testStudent } = await seedScenario();

    const [lesson] = await db
      .insert(scienceLessons)
      .values({
        slug: `${TEST_PREFIX}-lesson`,
        title: 'Mastery Profile Lesson',
        gradeLevel: 3,
        order: 1,
      })
      .returning();
    const [attempt] = await db
      .insert(scienceAttempts)
      .values({
        studentId: testStudent.id,
        lessonId: lesson.id,
        attemptNumber: 1,
        maxScore: '100',
        completedAt: new Date(),
      })
      .returning();
    await db.insert(scienceMasteryRuns).values({
      attemptId: attempt.id,
      studentId: testStudent.id,
      status: 'PROCESSING',
    });

    const session = await createSession(testStudent.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const req = new NextRequest(
      `http://localhost:3000/api/students/${testStudent.id}/mastery-profile`
    );
    const response = await GET(req, {
      params: Promise.resolve({ studentId: testStudent.id }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('CALCULATING');
    expect(body.retryAfterSeconds).toBe(10);
  });

  it('groups standards by strand and sorts weakest first', async () => {
    const { testStudent } = await seedScenario();
    const session = await createSession(testStudent.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const req = new NextRequest(
      `http://localhost:3000/api/students/${testStudent.id}/mastery-profile`
    );
    const response = await GET(req, {
      params: Promise.resolve({ studentId: testStudent.id }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.strands).toHaveLength(2);
    // Sc2 (avg 0.50) weaker than Sc1 (avg (0.85+0.72)/2 = 0.785 → Math.round → 0.78 in JS float)
    expect(body.strands[0].code).toBe('Sc2');
    expect(body.strands[0].masteryAverage).toBeCloseTo(0.5, 2);
    expect(body.strands[0].standards).toHaveLength(2);
    expect(body.strands[1].code).toBe('Sc1');
    expect(body.strands[1].masteryAverage).toBeGreaterThan(0.5);
    expect(body.strands[1].masteryAverage).toBeLessThanOrEqual(0.79);
    expect(body.strands[1].standards).toHaveLength(2);
  });

  it('assigns correct mastery labels and color tokens', async () => {
    const { testStudent } = await seedScenario();
    const session = await createSession(testStudent.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const req = new NextRequest(
      `http://localhost:3000/api/students/${testStudent.id}/mastery-profile`
    );
    const response = await GET(req, {
      params: Promise.resolve({ studentId: testStudent.id }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();

    const sc1 = body.strands.find((s: { code: string }) => s.code === 'Sc1');
    const sc2 = body.strands.find((s: { code: string }) => s.code === 'Sc2');
    const sc11 = sc1.standards.find(
      (s: { code: string }) => s.code === 'Sc1.1-G3'
    );
    const sc12 = sc1.standards.find(
      (s: { code: string }) => s.code === 'Sc1.2-G3'
    );
    const sc21 = sc2.standards.find(
      (s: { code: string }) => s.code === 'Sc2.1-G3'
    );

    expect(sc11.masteryLabel).toBe('Proficient');
    expect(sc11.masteryColorToken).toBe('strong');
    expect(sc12.masteryLabel).toBe('Developing');
    expect(sc12.masteryColorToken).toBe('caution');
    expect(sc21.masteryLabel).toBe('Needs Support');
    expect(sc21.masteryColorToken).toBe('critical');
  });

  it('includes the required fields on standard records', async () => {
    const { testStudent } = await seedScenario();
    const session = await createSession(testStudent.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const req = new NextRequest(
      `http://localhost:3000/api/students/${testStudent.id}/mastery-profile`
    );
    const response = await GET(req, {
      params: Promise.resolve({ studentId: testStudent.id }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    const firstStandard = body.strands[0]?.standards[0];
    for (const field of [
      'standardId',
      'code',
      'titleEn',
      'titleTh',
      'masteryLevel',
      'masteryLabel',
      'masteryColorToken',
      'evidenceCount',
      'lastAssessedAt',
    ]) {
      expect(firstStandard).toHaveProperty(field);
    }
  });

  it('paginates results via limit + cursor', async () => {
    const { testStudent } = await seedScenario();
    const session = await createSession(testStudent.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const req1 = new NextRequest(
      `http://localhost:3000/api/students/${testStudent.id}/mastery-profile?limit=2`
    );
    const response1 = await GET(req1, {
      params: Promise.resolve({ studentId: testStudent.id }),
    });
    expect(response1.status).toBe(200);
    const body1 = await response1.json();
    expect(body1.nextCursor).toBeTruthy();
    const totalStandards1 = body1.strands.reduce(
      (sum: number, strand: { standards: unknown[] }) =>
        sum + strand.standards.length,
      0
    );
    expect(totalStandards1).toBe(2);

    const req2 = new NextRequest(
      `http://localhost:3000/api/students/${testStudent.id}/mastery-profile?limit=2&cursor=${body1.nextCursor}`
    );
    const response2 = await GET(req2, {
      params: Promise.resolve({ studentId: testStudent.id }),
    });
    expect(response2.status).toBe(200);
    const body2 = await response2.json();
    const totalStandards2 = body2.strands.reduce(
      (sum: number, strand: { standards: unknown[] }) =>
        sum + strand.standards.length,
      0
    );
    expect(totalStandards2).toBe(2);
    expect(body2.nextCursor).toBeNull();
  });

  it('rejects limit values above 200', async () => {
    const { testStudent } = await seedScenario();
    const session = await createSession(testStudent.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const req = new NextRequest(
      `http://localhost:3000/api/students/${testStudent.id}/mastery-profile?limit=300`
    );
    const response = await GET(req, {
      params: Promise.resolve({ studentId: testStudent.id }),
    });
    // zod throw → caught → 500. We just assert non-2xx.
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('filters by strand prefix', async () => {
    const { testStudent } = await seedScenario();
    const session = await createSession(testStudent.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const req = new NextRequest(
      `http://localhost:3000/api/students/${testStudent.id}/mastery-profile?strand=Sc1`
    );
    const response = await GET(req, {
      params: Promise.resolve({ studentId: testStudent.id }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.strands).toHaveLength(1);
    expect(body.strands[0].code).toBe('Sc1');
    expect(body.strands[0].standards).toHaveLength(2);
  });

  it('returns empty strands when strand filter matches no standards', async () => {
    const { testStudent } = await seedScenario();
    const session = await createSession(testStudent.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const req = new NextRequest(
      `http://localhost:3000/api/students/${testStudent.id}/mastery-profile?strand=Sc99`
    );
    const response = await GET(req, {
      params: Promise.resolve({ studentId: testStudent.id }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.strands).toHaveLength(0);
    expect(body.nextCursor).toBeNull();
  });

  it('includes aiAnnotation only when includeRecommendations=true', async () => {
    const { testStudent } = await seedScenario();
    const session = await createSession(testStudent.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const reqWith = new NextRequest(
      `http://localhost:3000/api/students/${testStudent.id}/mastery-profile?includeRecommendations=true`
    );
    const responseWith = await GET(reqWith, {
      params: Promise.resolve({ studentId: testStudent.id }),
    });
    const bodyWith = await responseWith.json();
    const stdWith = bodyWith.strands[0]?.standards[0];
    expect(stdWith).toHaveProperty('aiAnnotation');
    expect(stdWith.aiAnnotation).toHaveProperty('recommended');
    expect(stdWith.aiAnnotation).toHaveProperty('traceId');

    const reqWithout = new NextRequest(
      `http://localhost:3000/api/students/${testStudent.id}/mastery-profile`
    );
    const responseWithout = await GET(reqWithout, {
      params: Promise.resolve({ studentId: testStudent.id }),
    });
    const bodyWithout = await responseWithout.json();
    const stdWithout = bodyWithout.strands[0]?.standards[0];
    expect(stdWithout).not.toHaveProperty('aiAnnotation');
  });

  it('handles student with no mastery records', async () => {
    const { otherStudent } = await seedScenario();
    const session = await createSession(otherStudent.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const req = new NextRequest(
      `http://localhost:3000/api/students/${otherStudent.id}/mastery-profile`
    );
    const response = await GET(req, {
      params: Promise.resolve({ studentId: otherStudent.id }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.strands).toHaveLength(0);
    expect(body.nextCursor).toBeNull();
  });
});
