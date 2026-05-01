import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/student/classes/route';

const { getCurrentSessionMock, getStudentEnrolledClassesMock } = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
  getStudentEnrolledClassesMock: vi.fn(),
}));

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

  it('returns 403 when user is not a student', async () => {
    getCurrentSessionMock.mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'TEACHER',
      },
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toEqual({
      error: 'Not authorized',
    });
    expect(getStudentEnrolledClassesMock).not.toHaveBeenCalled();
  });

  it('returns enrolled classes for the student', async () => {
    getCurrentSessionMock.mockResolvedValue({
      user: {
        id: 'student-1',
        role: 'STUDENT',
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

    expect(getStudentEnrolledClassesMock).toHaveBeenCalledWith('student-1');
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
