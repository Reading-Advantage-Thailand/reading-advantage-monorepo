import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRequireAuth = vi.fn();
const mockFindUnique = vi.fn();
const mockFindMany = vi.fn();
const mockLessonFindMany = vi.fn();
const mockLessonCompletionFindMany = vi.fn();
const mockAttemptFindMany = vi.fn();

vi.mock('@/lib/auth/server', () => ({
  requireAuth: () => mockRequireAuth(),
}));

vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    class: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    lesson: {
      findMany: (...args: unknown[]) => mockLessonFindMany(...args),
    },
    lessonCompletion: {
      findMany: (...args: unknown[]) => mockLessonCompletionFindMany(...args),
    },
    attempt: {
      findMany: (...args: unknown[]) => mockAttemptFindMany(...args),
    },
  },
}));

import { GET } from './route';

function createRequest(): Request {
  return new Request('http://localhost:3000/api/students/student-1/classes/class-1/analytics');
}

function createParams(studentId: string, classId: string) {
  return { params: Promise.resolve({ studentId, classId }) };
}

describe('GET /api/students/[studentId]/classes/[classId]/analytics - authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLessonFindMany.mockResolvedValue([]);
    mockLessonCompletionFindMany.mockResolvedValue([]);
    mockAttemptFindMany.mockResolvedValue([]);
  });

  it('should return 403 when teacher of classA tries to access analytics for student NOT enrolled in classA', async () => {
    mockRequireAuth.mockResolvedValue({
      user: { id: 'teacher-1', role: 'TEACHER' },
    });

    // Teacher owns class but student is NOT enrolled
    mockFindUnique.mockResolvedValue({
      id: 'class-1',
      name: 'Class A',
      gradeLevel: 4,
      standardsAlignment: 'THAI',
      teacherId: 'teacher-1',
      students: [], // Student NOT enrolled
    });

    const response = await GET(createRequest(), createParams('student-not-enrolled', 'class-1'));

    expect(response.status).toBe(403);
  });

  it('should return 200 when teacher of classA accesses analytics for student enrolled in classA', async () => {
    mockRequireAuth.mockResolvedValue({
      user: { id: 'teacher-1', role: 'TEACHER' },
    });

    mockFindUnique.mockResolvedValue({
      id: 'class-1',
      name: 'Class A',
      gradeLevel: 4,
      standardsAlignment: 'THAI',
      teacherId: 'teacher-1',
      students: [{ id: 'student-1', name: 'Student One' }],
    });

    const response = await GET(createRequest(), createParams('student-1', 'class-1'));

    expect(response.status).toBe(200);
  });

  it('should return 200 when ADMIN accesses any student/class combination', async () => {
    mockRequireAuth.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
    });

    mockFindUnique.mockResolvedValue({
      id: 'class-1',
      name: 'Class A',
      gradeLevel: 4,
      standardsAlignment: 'THAI',
      teacherId: 'teacher-1',
      students: [{ id: 'student-1', name: 'Student One' }],
    });

    const response = await GET(createRequest(), createParams('student-1', 'class-1'));

    expect(response.status).toBe(200);
  });

  it('should return 403 when a different teacher tries to access another teachers class analytics', async () => {
    mockRequireAuth.mockResolvedValue({
      user: { id: 'teacher-2', role: 'TEACHER' },
    });

    mockFindUnique.mockResolvedValue({
      id: 'class-1',
      name: 'Class A',
      gradeLevel: 4,
      standardsAlignment: 'THAI',
      teacherId: 'teacher-1', // owned by teacher-1, not teacher-2
      students: [{ id: 'student-1', name: 'Student One' }],
    });

    const response = await GET(createRequest(), createParams('student-1', 'class-1'));

    expect(response.status).toBe(403);
  });
});
