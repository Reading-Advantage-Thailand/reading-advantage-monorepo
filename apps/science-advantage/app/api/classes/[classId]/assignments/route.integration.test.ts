import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { db, sql } from '@reading-advantage/db';
import {
  accounts,
  scienceAssignments,
  scienceClasses,
  scienceClassStudents,
  scienceLessons,
  sessions,
  users,
} from '@reading-advantage/db/schema';
import { DELETE, GET, POST } from './route';
import { createSession } from '@/lib/auth/session';

const TEST_PREFIX = 'assignments-itest';

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
type LessonRow = typeof scienceLessons.$inferSelect;
type AssignmentRow = typeof scienceAssignments.$inferSelect;

async function cleanup(): Promise<void> {
  await db.delete(scienceAssignments);
  await db.delete(scienceClassStudents);
  await db.delete(scienceLessons);
  await db.delete(scienceClasses);
  await db.delete(sessions);
  await db.delete(accounts);
  await db.execute(sql`DELETE FROM users WHERE id LIKE ${`${TEST_PREFIX}-%`}`);
}

async function seedUser(
  id: string,
  role: 'TEACHER' | 'STUDENT' | 'ADMIN'
): Promise<UserRow> {
  const [u] = await db
    .insert(users)
    .values({
      id,
      name: id,
      username: id,
      displayUsername: id,
      email: `${id}@example.com`,
      role,
    })
    .returning();
  return u;
}

async function seedClass(teacherId: string): Promise<ClassRow> {
  const [cls] = await db
    .insert(scienceClasses)
    .values({
      name: 'Assignments Test Class',
      gradeLevel: 3,
      standardsAlignment: 'THAI',
      joinCode: `ASN-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
      teacherId,
    })
    .returning();
  return cls;
}

async function seedLesson(suffix: string, order: number): Promise<LessonRow> {
  const [lesson] = await db
    .insert(scienceLessons)
    .values({
      slug: `${TEST_PREFIX}-lesson-${suffix}-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2, 6)}`,
      title: `Lesson ${suffix}`,
      gradeLevel: 3,
      order,
    })
    .returning();
  return lesson;
}

async function seedAssignment(
  classId: string,
  lessonId: string,
  teacherId: string,
  dueAt?: Date | null
): Promise<AssignmentRow> {
  const [a] = await db
    .insert(scienceAssignments)
    .values({
      classId,
      lessonId,
      assignedBy: teacherId,
      dueAt: dueAt ?? null,
    })
    .returning();
  return a;
}

function getReq(classId: string) {
  return new NextRequest(
    `http://localhost/api/classes/${classId}/assignments`
  );
}
function postReq(classId: string, body: unknown) {
  return new NextRequest(
    `http://localhost/api/classes/${classId}/assignments`,
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }
  );
}
function delReq(classId: string, body: unknown) {
  return new NextRequest(
    `http://localhost/api/classes/${classId}/assignments`,
    {
      method: 'DELETE',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }
  );
}

describe('GET /api/classes/[classId]/assignments (integration)', () => {
  let teacher: UserRow;
  let otherTeacher: UserRow;
  let student: UserRow;
  let outsider: UserRow;
  let cls: ClassRow;
  let lessonA: LessonRow;
  let lessonB: LessonRow;
  let assignmentA: AssignmentRow;
  let assignmentB: AssignmentRow;

  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);
    await cleanup();
    teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    otherTeacher = await seedUser(`${TEST_PREFIX}-other-teacher`, 'TEACHER');
    student = await seedUser(`${TEST_PREFIX}-student`, 'STUDENT');
    outsider = await seedUser(`${TEST_PREFIX}-outsider`, 'STUDENT');
    cls = await seedClass(teacher.id);
    await db
      .insert(scienceClassStudents)
      .values({ classId: cls.id, studentId: student.id });
    lessonA = await seedLesson('A', 1);
    lessonB = await seedLesson('B', 2);
    assignmentA = await seedAssignment(cls.id, lessonA.id, teacher.id);
    // Force assignmentB.assignedAt to be later than assignmentA's.
    await new Promise((r) => setTimeout(r, 5));
    assignmentB = await seedAssignment(
      cls.id,
      lessonB.id,
      teacher.id,
      new Date('2026-12-01T10:00:00.000Z')
    );
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await GET(getReq(cls.id), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ success: false, error: 'Unauthorized' });
  });

  it('returns 404 when class does not exist', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const ghost = '00000000-0000-0000-0000-000000000000';
    const res = await GET(getReq(ghost), {
      params: Promise.resolve({ classId: ghost }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ success: false, error: 'Class not found' });
  });

  it('returns 403 for a non-owning teacher who is not enrolled', async () => {
    const session = await createSession(otherTeacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(getReq(cls.id), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 403 for an outsider student', async () => {
    const session = await createSession(outsider.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(getReq(cls.id), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 200 with assignments ordered by assignedAt desc for the owning teacher', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(getReq(cls.id), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.assignments).toHaveLength(2);

    const [first, second] = body.data.assignments;
    expect(first.id).toBe(assignmentB.id);
    expect(second.id).toBe(assignmentA.id);

    expect(first).toMatchObject({
      classId: cls.id,
      lessonId: lessonB.id,
      assignedBy: teacher.id,
      dueAt: '2026-12-01T10:00:00.000Z',
      teacher: { id: teacher.id, name: teacher.name },
      lesson: {
        id: lessonB.id,
        title: lessonB.title,
        slug: lessonB.slug,
        order: 2,
        gradeLevel: 3,
      },
    });
    expect(typeof first.assignedAt).toBe('string');
    expect(typeof first.createdAt).toBe('string');
    expect(second.dueAt).toBeNull();
  });

  it('returns 200 for an enrolled student', async () => {
    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(getReq(cls.id), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.assignments).toHaveLength(2);
  });

  it('returns an empty array when class has no assignments', async () => {
    await db.delete(scienceAssignments);
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await GET(getReq(cls.id), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.assignments).toEqual([]);
  });
});

describe('POST /api/classes/[classId]/assignments (integration)', () => {
  let teacher: UserRow;
  let otherTeacher: UserRow;
  let admin: UserRow;
  let student: UserRow;
  let cls: ClassRow;
  let lessonA: LessonRow;

  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);
    await cleanup();
    teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    otherTeacher = await seedUser(`${TEST_PREFIX}-other-teacher`, 'TEACHER');
    admin = await seedUser(`${TEST_PREFIX}-admin`, 'ADMIN');
    student = await seedUser(`${TEST_PREFIX}-student`, 'STUDENT');
    cls = await seedClass(teacher.id);
    lessonA = await seedLesson('A', 1);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await POST(postReq(cls.id, { lessonId: lessonA.id }), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 when caller is a student', async () => {
    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await POST(postReq(cls.id, { lessonId: lessonA.id }), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({
      success: false,
      error: 'Only teachers can create assignments',
    });
  });

  it('returns 400 when lessonId is missing', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await POST(postReq(cls.id, {}), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ success: false, error: 'lessonId is required' });
  });

  it('returns 400 when lessonId is not a string', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await POST(postReq(cls.id, { lessonId: 42 }), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 when class does not exist', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const ghost = '00000000-0000-0000-0000-000000000000';
    const res = await POST(postReq(ghost, { lessonId: lessonA.id }), {
      params: Promise.resolve({ classId: ghost }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ success: false, error: 'Class not found' });
  });

  it('returns 403 when caller is a teacher but not the owner', async () => {
    const session = await createSession(otherTeacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await POST(postReq(cls.id, { lessonId: lessonA.id }), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ success: false, error: 'Forbidden' });
  });

  it('returns 404 when lesson does not exist', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const ghostLesson = '00000000-0000-0000-0000-000000000000';
    const res = await POST(postReq(cls.id, { lessonId: ghostLesson }), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ success: false, error: 'Lesson not found' });
  });

  it('returns 400 when dueAt is invalid', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await POST(
      postReq(cls.id, { lessonId: lessonA.id, dueAt: 'not-a-date' }),
      { params: Promise.resolve({ classId: cls.id }) }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ success: false, error: 'Invalid dueAt date' });
  });

  it('creates an assignment for the owning teacher and returns 201 with shape', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const dueAt = '2026-12-15T09:00:00.000Z';
    const res = await POST(
      postReq(cls.id, { lessonId: lessonA.id, dueAt }),
      { params: Promise.resolve({ classId: cls.id }) }
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      classId: cls.id,
      lessonId: lessonA.id,
      assignedBy: teacher.id,
      dueAt,
      teacher: { id: teacher.id, name: teacher.name },
      lesson: {
        id: lessonA.id,
        title: lessonA.title,
        slug: lessonA.slug,
        order: 1,
      },
    });
    expect(typeof body.data.id).toBe('string');
    expect(typeof body.data.assignedAt).toBe('string');
    expect(typeof body.data.createdAt).toBe('string');

    const rows = await db
      .select()
      .from(scienceAssignments)
      .where(sql`${scienceAssignments.id} = ${body.data.id}`);
    expect(rows).toHaveLength(1);
  });

  it('creates an assignment with null dueAt when omitted', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await POST(postReq(cls.id, { lessonId: lessonA.id }), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.dueAt).toBeNull();
  });

  it('allows admin to create an assignment', async () => {
    const session = await createSession(admin.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await POST(postReq(cls.id, { lessonId: lessonA.id }), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(201);
  });
});

describe('DELETE /api/classes/[classId]/assignments (integration)', () => {
  let teacher: UserRow;
  let otherTeacher: UserRow;
  let admin: UserRow;
  let student: UserRow;
  let cls: ClassRow;
  let lessonA: LessonRow;
  let assignmentA: AssignmentRow;

  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);
    await cleanup();
    teacher = await seedUser(`${TEST_PREFIX}-teacher`, 'TEACHER');
    otherTeacher = await seedUser(`${TEST_PREFIX}-other-teacher`, 'TEACHER');
    admin = await seedUser(`${TEST_PREFIX}-admin`, 'ADMIN');
    student = await seedUser(`${TEST_PREFIX}-student`, 'STUDENT');
    cls = await seedClass(teacher.id);
    lessonA = await seedLesson('A', 1);
    assignmentA = await seedAssignment(cls.id, lessonA.id, teacher.id);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await DELETE(
      delReq(cls.id, { assignmentId: assignmentA.id }),
      { params: Promise.resolve({ classId: cls.id }) }
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when caller is a student', async () => {
    const session = await createSession(student.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await DELETE(
      delReq(cls.id, { assignmentId: assignmentA.id }),
      { params: Promise.resolve({ classId: cls.id }) }
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({
      success: false,
      error: 'Only teachers can delete assignments',
    });
  });

  it('returns 400 when assignmentId is missing', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await DELETE(delReq(cls.id, {}), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ success: false, error: 'assignmentId is required' });
  });

  it('returns 404 when class does not exist', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const ghost = '00000000-0000-0000-0000-000000000000';
    const res = await DELETE(
      delReq(ghost, { assignmentId: assignmentA.id }),
      { params: Promise.resolve({ classId: ghost }) }
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ success: false, error: 'Class not found' });
  });

  it('returns 403 when caller is a teacher but not the owner', async () => {
    const session = await createSession(otherTeacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await DELETE(
      delReq(cls.id, { assignmentId: assignmentA.id }),
      { params: Promise.resolve({ classId: cls.id }) }
    );
    expect(res.status).toBe(403);
  });

  it('returns 404 when the assignment exists but belongs to a different class', async () => {
    const otherCls = await seedClass(teacher.id);
    const otherLesson = await seedLesson('other', 99);
    const otherAssignment = await seedAssignment(
      otherCls.id,
      otherLesson.id,
      teacher.id
    );
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await DELETE(
      delReq(cls.id, { assignmentId: otherAssignment.id }),
      { params: Promise.resolve({ classId: cls.id }) }
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ success: false, error: 'Assignment not found' });
  });

  it('returns 404 when assignmentId does not exist at all', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const ghost = '00000000-0000-0000-0000-000000000000';
    const res = await DELETE(delReq(cls.id, { assignmentId: ghost }), {
      params: Promise.resolve({ classId: cls.id }),
    });
    expect(res.status).toBe(404);
  });

  it('deletes the assignment when called by the owning teacher', async () => {
    const session = await createSession(teacher.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await DELETE(
      delReq(cls.id, { assignmentId: assignmentA.id }),
      { params: Promise.resolve({ classId: cls.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true, data: { deleted: true } });

    const rows = await db
      .select()
      .from(scienceAssignments)
      .where(sql`${scienceAssignments.id} = ${assignmentA.id}`);
    expect(rows).toHaveLength(0);
  });

  it('allows admin to delete an assignment', async () => {
    const session = await createSession(admin.id);
    mockCookies.get.mockReturnValue({ value: session.token });
    const res = await DELETE(
      delReq(cls.id, { assignmentId: assignmentA.id }),
      { params: Promise.resolve({ classId: cls.id }) }
    );
    expect(res.status).toBe(200);
  });
});
