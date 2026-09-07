import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/student/classes/route';

const { getCurrentSessionMock, getStudentEnrolledClassesMock } = vi.hoisted(
  () => ({
    getCurrentSessionMock: vi.fn(),
    getStudentEnrolledClassesMock: vi.fn(),
  })
);

vi.mock('@/lib/auth/session', () => ({
  getCurrentSession: getCurrentSessionMock,
}));

vi.mock('@/lib/services/classes/get-student-classes', () => ({
  getStudentEnrolledClasses: getStudentEnrolledClassesMock,
}));

describe('/api/student/classes route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    getCurrentSessionMock.mockResolvedValue(null);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({
      error: 'Authentication required',
    });
    expect(getStudentEnrolledClassesMock).not.toHaveBeenCalled();
  });

  it('allows a teacher to request student classes', async () => {
    getCurrentSessionMock.mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'TEACHER',
        schoolId: 'school-1',
      },
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({});
    const input = getStudentEnrolledClassesMock.mock.calls[0][0];
    expect(input.user.id).toBe('user-1');
    expect(input.tenant).toEqual({ schoolId: 'school-1' });
    expect(input.input).toEqual({ studentId: 'user-1' });
  });

  it('returns enrolled classes for the student', async () => {
    getCurrentSessionMock.mockResolvedValue({
      user: {
        id: 'student-1',
        role: 'STUDENT',
        schoolId: 'school-1',
      },
    });

    getStudentEnrolledClassesMock.mockResolvedValue([
      {
        id: 'class-1',
        name: 'Science Explorers',
        gradeLevel: 5,
        teacherId: 'teacher-1',
        teacherName: 'Ms. Frizzle',
        enrolledAt: '2025-10-20T00:00:00.000Z',
      },
    ]);

    const response = await GET();
    const payload = await response.json();

    const input = getStudentEnrolledClassesMock.mock.calls[0][0];
    expect(input.user.id).toBe('student-1');
    expect(input.tenant).toEqual({ schoolId: 'school-1' });
    expect(input.input).toEqual({ studentId: 'student-1' });
    expect(response.status).toBe(200);
    expect(payload).toEqual({
      classes: [
        {
          id: 'class-1',
          name: 'Science Explorers',
          gradeLevel: 5,
          teacherId: 'teacher-1',
          teacherName: 'Ms. Frizzle',
          enrolledAt: '2025-10-20T00:00:00.000Z',
        },
      ],
    });
  });
});
