import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/classes/[classId]/route';

const { getCurrentSessionMock } = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
}));

const { prismaMock } = vi.hoisted(() => {
  const prismaMock = {
    class: {
      findUnique: vi.fn(),
    },
    curriculumUnit: {
      findMany: vi.fn(),
    },
  };

  return { prismaMock };
});

vi.mock('@/lib/auth/session', () => ({
  getCurrentSession: getCurrentSessionMock,
}));

vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: prismaMock,
}));

function createRequest(classId: string) {
  return [
    {
      url: `https://example.com/api/classes/${classId}`,
    } as unknown as Parameters<typeof GET>[0],
    {
      params: { classId },
    } as Parameters<typeof GET>[1],
  ] as const;
}

describe('/api/classes/[classId] route', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.class.findUnique.mockReset();
    prismaMock.curriculumUnit.findMany.mockReset();
    prismaMock.curriculumUnit.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when the user is not authenticated', async () => {
    getCurrentSessionMock.mockResolvedValue(null);

    const [request, ctx] = createRequest('class-1');
    const response = await GET(request, ctx);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({
      success: false,
      error: 'Unauthorized',
    });
  });

  it('returns 404 when the class does not exist', async () => {
    getCurrentSessionMock.mockResolvedValue({
      user: {
        id: 'teacher-1',
        role: 'TEACHER',
      },
    });

    prismaMock.class.findUnique.mockResolvedValue(null);

    const [request, ctx] = createRequest('missing-class');
    const response = await GET(request, ctx);
    const payload = await response.json();

    expect(prismaMock.class.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'missing-class' },
      })
    );
    expect(response.status).toBe(404);
    expect(payload).toEqual({
      success: false,
      error: 'Class not found',
    });
  });

  it('returns 403 when the user is not authorized', async () => {
    getCurrentSessionMock.mockResolvedValue({
      user: {
        id: 'another-teacher',
        role: 'TEACHER',
      },
    });

    prismaMock.class.findUnique.mockResolvedValue({
      id: 'class-abc',
      name: 'Grade 3 Science',
      gradeLevel: 3,
      standardsAlignment: 'THAI',
      joinCode: 'DEMO3T',
      teacherId: 'teacher-1',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-02T00:00:00.000Z'),
      students: [{ id: 'student-1' }],
      _count: { students: 1 },
    });

    const [request, ctx] = createRequest('class-abc');
    const response = await GET(request, ctx);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toEqual({
      success: false,
      error: 'Forbidden',
    });
  });

  it('returns class detail data for the owning teacher', async () => {
    const createdAt = new Date('2025-01-01T00:00:00.000Z');
    const updatedAt = new Date('2025-01-02T00:00:00.000Z');

    getCurrentSessionMock.mockResolvedValue({
      user: {
        id: 'teacher-1',
        role: 'TEACHER',
      },
    });

    prismaMock.class.findUnique.mockResolvedValue({
      id: 'class-abc',
      name: 'Grade 3 Science',
      gradeLevel: 3,
      standardsAlignment: 'THAI',
      joinCode: 'DEMO3T',
      teacherId: 'teacher-1',
      createdAt,
      updatedAt,
      students: [{ id: 'student-1' }],
      _count: { students: 1 },
    });

    prismaMock.curriculumUnit.findMany.mockResolvedValue([
      {
        id: 'unit-1',
        title: 'Unit 1',
        description: 'Unit description',
        order: 1,
        lessons: [
          {
            id: 'lesson-1',
            title: 'Lesson 1',
            description: 'Lesson description',
            order: 1,
            gradeLevel: 3,
          },
        ],
      },
    ]);

    const [request, ctx] = createRequest('class-abc');
    const response = await GET(request, ctx);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      data: {
        id: 'class-abc',
        name: 'Grade 3 Science',
        gradeLevel: 3,
        standardsAlignment: 'THAI',
        joinCode: 'DEMO3T',
        studentCount: 1,
        curriculumUnits: [
          {
            id: 'unit-1',
            title: 'Unit 1',
            description: 'Unit description',
            order: 1,
            lessons: [
              {
                id: 'lesson-1',
                title: 'Lesson 1',
                description: 'Lesson description',
                order: 1,
                gradeLevel: 3,
              },
            ],
          },
        ],
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      },
    });

    expect(prismaMock.curriculumUnit.findMany).toHaveBeenCalledWith({
      where: {
        classId: 'class-abc',
        framework: 'THAI',
        gradeLevel: 3,
      },
      include: {
        lessons: {
          select: {
            id: true,
            title: true,
            description: true,
            order: true,
            gradeLevel: true,
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });
  });

  it('allows enrolled students to view the class detail data', async () => {
    getCurrentSessionMock.mockResolvedValue({
      user: {
        id: 'student-1',
        role: 'STUDENT',
      },
    });

    prismaMock.class.findUnique.mockResolvedValue({
      id: 'class-abc',
      name: 'Grade 3 Science',
      gradeLevel: 3,
      standardsAlignment: 'THAI',
      joinCode: 'DEMO3T',
      teacherId: 'teacher-1',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-02T00:00:00.000Z'),
      students: [{ id: 'student-1' }],
      _count: { students: 1 },
    });

    prismaMock.curriculumUnit.findMany.mockResolvedValue([]);

    const [request, ctx] = createRequest('class-abc');
    const response = await GET(request, ctx);

    expect(response.status).toBe(200);
  });
});
