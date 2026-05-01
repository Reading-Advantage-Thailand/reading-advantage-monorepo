import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import prisma from '@/lib/prisma';
import { GET } from './route';
import { createSession } from '@/lib/auth/session';
import { interventionCache } from '@/lib/interventions/cache';

const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => mockCookies),
}));

describe('GET /api/teachers/classes/[classId]/intervention-alerts', () => {
  let teacher: { id: string };
  let otherTeacher: { id: string };
  let admin: { id: string };
  let studentA: { id: string };
  let studentB: { id: string };
  let klass: { id: string };

  async function authenticate(userId: string) {
    const session = await createSession(userId);
    mockCookies.get.mockReturnValue({ value: session.token });
  }

  function buildRequest(query = '') {
    return new NextRequest(
      `http://localhost:3000/api/teachers/classes/${klass.id}/intervention-alerts${query}`
    );
  }

  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);
    interventionCache.clear();

    await prisma.standardMastery.deleteMany();
    await prisma.$executeRaw`DELETE FROM "_ClassStudents"`;
    await prisma.class.deleteMany();
    await prisma.standard.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();

    teacher = await prisma.user.create({
      data: {
        id: 'teacher-1',
        name: 'Teacher One',
        username: 'teacher.one',
        displayUsername: 'Teacher1',
        email: 'teacher1@example.com',
        role: 'TEACHER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      select: { id: true },
    });

    otherTeacher = await prisma.user.create({
      data: {
        id: 'teacher-2',
        name: 'Teacher Two',
        username: 'teacher.two',
        displayUsername: 'Teacher2',
        email: 'teacher2@example.com',
        role: 'TEACHER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      select: { id: true },
    });

    admin = await prisma.user.create({
      data: {
        id: 'admin-1',
        name: 'Admin One',
        username: 'admin.one',
        displayUsername: 'Admin1',
        email: 'admin@example.com',
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      select: { id: true },
    });

    studentA = await prisma.user.create({
      data: {
        id: 'student-a',
        name: 'Alice Student',
        username: 'alice.student',
        displayUsername: 'Alice',
        email: 'alice@example.com',
        role: 'STUDENT',
        gradeLevel: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      select: { id: true },
    });

    studentB = await prisma.user.create({
      data: {
        id: 'student-b',
        name: 'Bob Student',
        username: 'bob.student',
        displayUsername: 'Bob',
        email: 'bob@example.com',
        role: 'STUDENT',
        gradeLevel: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      select: { id: true },
    });

    const standards = await prisma.$transaction([
      prisma.standard.create({
        data: {
          id: 'std-1',
          code: 'Sc1.1',
          description: 'Standard 1',
          framework: 'THAI',
          gradeLevel: 5,
        },
      }),
      prisma.standard.create({
        data: {
          id: 'std-2',
          code: 'Sc1.2',
          description: 'Standard 2',
          framework: 'THAI',
          gradeLevel: 5,
        },
      }),
      prisma.standard.create({
        data: {
          id: 'std-3',
          code: 'Sc1.3',
          description: 'Standard 3',
          framework: 'THAI',
          gradeLevel: 5,
        },
      }),
    ]);

    klass = await prisma.class.create({
      data: {
        id: 'class-alpha',
        name: 'Alpha',
        gradeLevel: 5,
        standardsAlignment: 'THAI',
        joinCode: 'JOIN-ALPHA',
        teacherId: teacher.id,
        students: {
          connect: [{ id: studentA.id }, { id: studentB.id }],
        },
      },
      select: { id: true },
    });

    await prisma.class.create({
      data: {
        id: 'class-beta',
        name: 'Beta',
        gradeLevel: 5,
        standardsAlignment: 'THAI',
        joinCode: 'JOIN-BETA',
        teacherId: otherTeacher.id,
        students: {
          connect: [{ id: studentA.id }],
        },
      },
    });

    await prisma.standardMastery.createMany({
      data: [
        {
          id: 'sm-1',
          studentId: studentA.id,
          standardId: standards[0].id,
          masteryLevel: 0.32,
          lastAssessedAt: new Date('2025-01-01T00:00:00Z'),
        },
        {
          id: 'sm-2',
          studentId: studentA.id,
          standardId: standards[1].id,
          masteryLevel: 0.35,
          lastAssessedAt: new Date('2025-01-05T00:00:00Z'),
        },
        {
          id: 'sm-3',
          studentId: studentA.id,
          standardId: standards[2].id,
          masteryLevel: 0.4,
          lastAssessedAt: new Date('2025-01-10T00:00:00Z'),
        },
        {
          id: 'sm-4',
          studentId: studentB.id,
          standardId: standards[0].id,
          masteryLevel: 0.52,
          lastAssessedAt: new Date('2025-01-03T00:00:00Z'),
        },
        {
          id: 'sm-5',
          studentId: studentB.id,
          standardId: standards[1].id,
          masteryLevel: 0.48,
          lastAssessedAt: new Date('2025-01-04T00:00:00Z'),
        },
      ],
    });
  });

  it('returns alerts for the class teacher owner', async () => {
    await authenticate(teacher.id);

    const response = await GET(buildRequest(), {
      params: Promise.resolve({ classId: klass.id }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('x-alert-trace-id')).toBeTruthy();
    expect(response.headers.get('cache-control')).toContain('max-age');

    const body = await response.json();
    expect(body.alerts.length).toBeGreaterThan(0);
    expect(body.alerts[0].alertSeverity).toBeDefined();
  });

  it('rejects students requesting alerts', async () => {
    await authenticate(studentA.id);
    const response = await GET(buildRequest(), {
      params: Promise.resolve({ classId: klass.id }),
    });
    expect(response.status).toBe(403);
  });

  it('rejects teachers that do not own the class', async () => {
    await authenticate(otherTeacher.id);
    const response = await GET(buildRequest(), {
      params: Promise.resolve({ classId: klass.id }),
    });
    expect(response.status).toBe(403);
  });

  it('allows admins to access alerts', async () => {
    await authenticate(admin.id);
    const response = await GET(buildRequest(), {
      params: Promise.resolve({ classId: klass.id }),
    });
    expect(response.status).toBe(200);
  });

  it('supports limit and cursor pagination', async () => {
    await authenticate(teacher.id);
    const firstResponse = await GET(buildRequest('?limit=1'), {
      params: Promise.resolve({ classId: klass.id }),
    });
    const firstBody = await firstResponse.json();
    expect(firstBody.alerts).toHaveLength(1);
    expect(firstBody.nextCursor).toBeTruthy();

    const secondResponse = await GET(
      buildRequest(`?cursor=${firstBody.nextCursor}`),
      {
        params: Promise.resolve({ classId: klass.id }),
      }
    );
    const secondBody = await secondResponse.json();
    expect(secondBody.alerts.length).toBeGreaterThan(0);
    expect(secondBody.alerts.find((alert: { studentId: string }) => alert.studentId === firstBody.alerts[0].studentId)).toBeUndefined();
  });

  it('bypasses cache when refresh flag is provided', async () => {
    await authenticate(teacher.id);
    const initialResponse = await GET(buildRequest(), {
      params: Promise.resolve({ classId: klass.id }),
    });
    const initialBody = await initialResponse.json();

    await prisma.standardMastery.create({
      data: {
        id: 'sm-6',
        studentId: studentB.id,
        standardId: 'std-3',
        masteryLevel: 0.38,
        lastAssessedAt: new Date('2025-01-15T00:00:00Z'),
      },
    });

    const cachedResponse = await GET(buildRequest(), {
      params: Promise.resolve({ classId: klass.id }),
    });
    const cachedBody = await cachedResponse.json();
    expect(cachedBody.totalAlerts).toBe(initialBody.totalAlerts);
    expect(cachedBody.generatedAt).toBe(initialBody.generatedAt);

    await new Promise((resolve) => setTimeout(resolve, 5));

    const refreshedResponse = await GET(buildRequest('?refresh=true'), {
      params: Promise.resolve({ classId: klass.id }),
    });
    const refreshedBody = await refreshedResponse.json();
    expect(refreshedBody.generatedAt).not.toBe(initialBody.generatedAt);
    expect(refreshedBody.totalAlerts).toBeGreaterThanOrEqual(
      initialBody.totalAlerts
    );
  });
});
