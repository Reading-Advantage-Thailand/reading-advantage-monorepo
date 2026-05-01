import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getStudentEnrolledClasses } from '@/lib/services/classes/get-student-classes';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    class: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: prismaMock,
}));

describe('getStudentEnrolledClasses service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns formatted enrollments for a student', async () => {
    const createdAt = new Date('2025-10-01T10:00:00.000Z');

    prismaMock.class.findMany.mockResolvedValue([
      {
        id: 'class-1',
        name: 'Science Explorers',
        gradeLevel: 5,
        teacherId: 'teacher-1',
        teacher: {
          id: 'teacher-1',
          name: 'Ms. Frizzle',
        },
        createdAt,
      },
    ]);

    const result = await getStudentEnrolledClasses('student-1');

    expect(prismaMock.class.findMany).toHaveBeenCalledWith({
      where: {
        students: {
          some: {
            id: 'student-1',
          },
        },
      },
      select: {
        id: true,
        name: true,
        gradeLevel: true,
        teacherId: true,
        teacher: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    expect(result).toEqual([
      {
        id: 'class-1',
        name: 'Science Explorers',
        gradeLevel: 5,
        teacherId: 'teacher-1',
        teacherName: 'Ms. Frizzle',
        enrolledAt: createdAt.toISOString(),
      },
    ]);
  });

  it('handles missing teacher name gracefully', async () => {
    const createdAt = new Date('2025-10-02T08:30:00.000Z');

    prismaMock.class.findMany.mockResolvedValue([
      {
        id: 'class-2',
        name: 'Physics Lab',
        gradeLevel: 6,
        teacherId: 'teacher-2',
        teacher: null,
        createdAt,
      },
    ]);

    const result = await getStudentEnrolledClasses('student-2');

    expect(result).toEqual([
      {
        id: 'class-2',
        name: 'Physics Lab',
        gradeLevel: 6,
        teacherId: 'teacher-2',
        teacherName: 'Teacher',
        enrolledAt: createdAt.toISOString(),
      },
    ]);
  });
});

