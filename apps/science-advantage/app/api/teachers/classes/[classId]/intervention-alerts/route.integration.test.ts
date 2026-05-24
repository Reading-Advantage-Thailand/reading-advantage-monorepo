import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { db, sql } from '@reading-advantage/db';
import {
  accounts,
  scienceClasses,
  scienceClassStudents,
  scienceStandardMastery,
  scienceStandards,
  sessions,
  users,
} from '@reading-advantage/db/schema';
import { GET } from './route';
import { createSession } from '@/lib/auth/session';
import { interventionCache } from '@/lib/interventions/cache';

const TEST_PREFIX = 'intervention-alerts-itest';
const STANDARDS_DESC = 'intervention-alerts-itest standard';

const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => mockCookies),
}));

type UserRow = typeof users.$inferSelect;
type ClassRow = typeof scienceClasses.$inferSelect;
type StandardRow = typeof scienceStandards.$inferSelect;

async function cleanup(): Promise<void> {
  await db.delete(scienceStandardMastery);
  await db.execute(
    sql`DELETE FROM science_standards WHERE description = ${STANDARDS_DESC}`
  );
  await db.delete(scienceClassStudents);
  await db.delete(scienceClasses);
  await db.delete(sessions);
  await db.delete(accounts);
  await db.execute(sql`DELETE FROM users WHERE id LIKE ${`${TEST_PREFIX}-%`}`);
  interventionCache.clear();
}

async function seedUser(
  id: string,
  role: 'TEACHER' | 'STUDENT' | 'ADMIN',
  opts: { name?: string; gradeLevel?: number | null } = {}
): Promise<UserRow> {
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

async function seedClass(
  teacherId: string,
  name = 'Science 101'
): Promise<ClassRow> {
  const [cls] = await db
    .insert(scienceClasses)
    .values({
      name,
      gradeLevel: 5,
      standardsAlignment: 'THAI',
      joinCode: `IA-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      teacherId,
    })
    .returning();
  return cls;
}

async function seedStandard(code: string): Promise<StandardRow> {
  const [s] = await db
    .insert(scienceStandards)
    .values({
      framework: 'THAI',
      code,
      description: STANDARDS_DESC,
      gradeLevel: 5,
    })
    .returning();
  return s;
}

function buildRequest(classId: string, params: Record<string, string> = {}) {
  const url = new URL(
    `http://localhost:3000/api/teachers/classes/${classId}/intervention-alerts`
  );
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString());
}

async function callGet(classId: string, params: Record<string, string> = {}) {
  return GET(buildRequest(classId, params), {
    params: Promise.resolve({ classId }),
  });
}

describe('GET /api/teachers/classes/[classId]/intervention-alerts (integration)', () => {
  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);
    await cleanup();
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await callGet('00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(401);
  });

  it('returns 404 when class does not exist', async () => {
    const teacher = await seedUser(`${TEST_PREFIX}-teacher-404`, 'TEACHER');
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await callGet('00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  it('returns 403 when a non-owner teacher requests the class', async () => {
    const ownerTeacher = await seedUser(
      `${TEST_PREFIX}-owner`,
      'TEACHER'
    );
    const otherTeacher = await seedUser(
      `${TEST_PREFIX}-other`,
      'TEACHER'
    );
    const cls = await seedClass(ownerTeacher.id);

    const session = await createSession(otherTeacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await callGet(cls.id);
    expect(res.status).toBe(403);
  });

  it('returns empty alerts when class has no enrolled students', async () => {
    const teacher = await seedUser(`${TEST_PREFIX}-teacher-empty`, 'TEACHER');
    const cls = await seedClass(teacher.id, 'Empty');

    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await callGet(cls.id);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.classId).toBe(cls.id);
    expect(data.alerts).toEqual([]);
    expect(data.totalAlerts).toBe(0);
    expect(data.nextCursor).toBeNull();
  });

  it('returns empty alerts when students have no weak mastery', async () => {
    const teacher = await seedUser(`${TEST_PREFIX}-teacher-strong`, 'TEACHER');
    const cls = await seedClass(teacher.id, 'Strong');
    const standard = await seedStandard(`${TEST_PREFIX}-Sc1.1`);

    const s1 = await seedUser(`${TEST_PREFIX}-strong-s1`, 'STUDENT', {
      gradeLevel: 5,
    });
    await db
      .insert(scienceClassStudents)
      .values({ classId: cls.id, studentId: s1.id });

    await db.insert(scienceStandardMastery).values({
      studentId: s1.id,
      standardId: standard.id,
      masteryLevel: String(0.9),
      lastAssessedAt: new Date(),
    });

    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await callGet(cls.id, { refresh: 'true' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.alerts).toEqual([]);
    expect(data.totalAlerts).toBe(0);
  });

  it('returns alerts sorted by score (highest first) when students have weak mastery', async () => {
    const teacher = await seedUser(`${TEST_PREFIX}-teacher-alerts`, 'TEACHER');
    const cls = await seedClass(teacher.id);
    const s1 = await seedStandard(`${TEST_PREFIX}-Sc1.A`);
    const s2 = await seedStandard(`${TEST_PREFIX}-Sc1.B`);
    const s3 = await seedStandard(`${TEST_PREFIX}-Sc1.C`);

    const critical = await seedUser(`${TEST_PREFIX}-critical-stu`, 'STUDENT', {
      name: 'Critical Student',
      gradeLevel: 5,
    });
    const warning = await seedUser(`${TEST_PREFIX}-warning-stu`, 'STUDENT', {
      name: 'Warning Student',
      gradeLevel: 5,
    });
    for (const stu of [critical, warning]) {
      await db
        .insert(scienceClassStudents)
        .values({ classId: cls.id, studentId: stu.id });
    }

    // critical: 3 weak standards, avg < 0.4
    await db.insert(scienceStandardMastery).values([
      {
        studentId: critical.id,
        standardId: s1.id,
        masteryLevel: String(0.3),
        lastAssessedAt: new Date(),
      },
      {
        studentId: critical.id,
        standardId: s2.id,
        masteryLevel: String(0.35),
        lastAssessedAt: new Date(),
      },
      {
        studentId: critical.id,
        standardId: s3.id,
        masteryLevel: String(0.38),
        lastAssessedAt: new Date(),
      },
    ]);

    // warning: 2 weak standards, avg < 0.5
    await db.insert(scienceStandardMastery).values([
      {
        studentId: warning.id,
        standardId: s1.id,
        masteryLevel: String(0.42),
        lastAssessedAt: new Date(),
      },
      {
        studentId: warning.id,
        standardId: s2.id,
        masteryLevel: String(0.48),
        lastAssessedAt: new Date(),
      },
    ]);

    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await callGet(cls.id, { refresh: 'true' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.alerts).toHaveLength(2);
    expect(data.alerts[0].alertSeverity).toBe('critical');
    expect(data.alerts[0].studentName).toBe('Critical Student');
    expect(data.alerts[1].alertSeverity).toBe('warning');
    expect(data.alerts[1].studentName).toBe('Warning Student');
    // score descending
    expect(data.alerts[0].score).toBeGreaterThanOrEqual(data.alerts[1].score);
  });

  it('excludes mastery rows at or above the masteryFilterLevel threshold (>= 0.6)', async () => {
    const teacher = await seedUser(`${TEST_PREFIX}-teacher-edges`, 'TEACHER');
    const cls = await seedClass(teacher.id);
    const standardWeak = await seedStandard(`${TEST_PREFIX}-Sc2.W`);
    const standardEdge = await seedStandard(`${TEST_PREFIX}-Sc2.E`);

    const stu = await seedUser(`${TEST_PREFIX}-edge-stu`, 'STUDENT', {
      gradeLevel: 5,
    });
    await db
      .insert(scienceClassStudents)
      .values({ classId: cls.id, studentId: stu.id });

    await db.insert(scienceStandardMastery).values([
      {
        studentId: stu.id,
        standardId: standardWeak.id,
        masteryLevel: String(0.55),
        lastAssessedAt: new Date(),
      },
      {
        studentId: stu.id,
        standardId: standardEdge.id,
        // exactly 0.6 — filtered out by route's `lt(... , 0.6)`
        masteryLevel: String(0.6),
        lastAssessedAt: new Date(),
      },
    ]);

    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await callGet(cls.id, { refresh: 'true' });
    expect(res.status).toBe(200);
    const data = await res.json();
    // moderate threshold: 1 weak std, avg < 0.6 → one moderate alert based on the 0.55 row.
    expect(data.alerts).toHaveLength(1);
    expect(data.alerts[0].alertSeverity).toBe('moderate');
    expect(data.alerts[0].weakStandardCount).toBe(1);
  });

  it('does not include mastery rows for students enrolled in other classes (tenant scoping)', async () => {
    const teacher = await seedUser(`${TEST_PREFIX}-teacher-scope`, 'TEACHER');
    const otherTeacher = await seedUser(
      `${TEST_PREFIX}-teacher-scope-other`,
      'TEACHER'
    );
    const cls = await seedClass(teacher.id, 'Mine');
    const otherCls = await seedClass(otherTeacher.id, 'Theirs');
    const standard = await seedStandard(`${TEST_PREFIX}-Sc3.X`);

    const mine = await seedUser(`${TEST_PREFIX}-mine-stu`, 'STUDENT', {
      gradeLevel: 5,
    });
    const theirs = await seedUser(`${TEST_PREFIX}-theirs-stu`, 'STUDENT', {
      gradeLevel: 5,
    });
    await db
      .insert(scienceClassStudents)
      .values({ classId: cls.id, studentId: mine.id });
    await db
      .insert(scienceClassStudents)
      .values({ classId: otherCls.id, studentId: theirs.id });

    await db.insert(scienceStandardMastery).values([
      {
        studentId: mine.id,
        standardId: standard.id,
        masteryLevel: String(0.3),
        lastAssessedAt: new Date(),
      },
      {
        studentId: theirs.id,
        standardId: standard.id,
        masteryLevel: String(0.2),
        lastAssessedAt: new Date(),
      },
    ]);

    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await callGet(cls.id, { refresh: 'true' });
    expect(res.status).toBe(200);
    const data = await res.json();
    // Only my student's alert is included — `theirs` is not enrolled in `cls`.
    for (const alert of data.alerts) {
      expect(alert.studentId).toBe(mine.id);
    }
  });

  it('respects the severity query filter', async () => {
    const teacher = await seedUser(`${TEST_PREFIX}-teacher-sev`, 'TEACHER');
    const cls = await seedClass(teacher.id);
    const s1 = await seedStandard(`${TEST_PREFIX}-Sc4.A`);
    const s2 = await seedStandard(`${TEST_PREFIX}-Sc4.B`);
    const s3 = await seedStandard(`${TEST_PREFIX}-Sc4.C`);

    const critical = await seedUser(`${TEST_PREFIX}-sev-crit`, 'STUDENT', {
      gradeLevel: 5,
    });
    const warning = await seedUser(`${TEST_PREFIX}-sev-warn`, 'STUDENT', {
      gradeLevel: 5,
    });
    for (const stu of [critical, warning]) {
      await db
        .insert(scienceClassStudents)
        .values({ classId: cls.id, studentId: stu.id });
    }

    await db.insert(scienceStandardMastery).values([
      {
        studentId: critical.id,
        standardId: s1.id,
        masteryLevel: String(0.3),
        lastAssessedAt: new Date(),
      },
      {
        studentId: critical.id,
        standardId: s2.id,
        masteryLevel: String(0.35),
        lastAssessedAt: new Date(),
      },
      {
        studentId: critical.id,
        standardId: s3.id,
        masteryLevel: String(0.38),
        lastAssessedAt: new Date(),
      },
      {
        studentId: warning.id,
        standardId: s1.id,
        masteryLevel: String(0.42),
        lastAssessedAt: new Date(),
      },
      {
        studentId: warning.id,
        standardId: s2.id,
        masteryLevel: String(0.48),
        lastAssessedAt: new Date(),
      },
    ]);

    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await callGet(cls.id, {
      severity: 'critical',
      refresh: 'true',
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.alerts).toHaveLength(1);
    expect(data.alerts[0].alertSeverity).toBe('critical');
  });

  it('allows ADMIN access to a class they do not own', async () => {
    const teacher = await seedUser(`${TEST_PREFIX}-admin-teacher`, 'TEACHER');
    const admin = await seedUser(`${TEST_PREFIX}-admin-user`, 'ADMIN');
    const cls = await seedClass(teacher.id);

    const session = await createSession(admin.id);
    mockCookies.get.mockReturnValue({ value: session.token });

    const res = await callGet(cls.id);
    expect(res.status).toBe(200);
  });
});
