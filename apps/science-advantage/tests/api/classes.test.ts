import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { GET, POST } from '@/app/api/classes/route';

const { getCurrentSessionMock, generateUniqueJoinCodeMock } = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
  generateUniqueJoinCodeMock: vi.fn(),
}));

const { tx, prismaMock } = vi.hoisted(() => {
  const tx = {
    class: {
      create: vi.fn(),
    },
    lesson: {
      findMany: vi.fn(),
    },
    curriculumUnit: {
      create: vi.fn(),
    },
  };

  const prismaMock = {
    $transaction: vi.fn(),
    class: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  };

  return { tx, prismaMock };
});

vi.mock('@/lib/auth/session', () => ({
  getCurrentSession: getCurrentSessionMock,
}));

vi.mock('@/lib/utils/generateJoinCode', () => ({
  generateUniqueJoinCode: generateUniqueJoinCodeMock,
}));

vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: prismaMock,
}));

function createJsonRequest(body: unknown) {
  return {
    json: vi.fn().mockResolvedValue(body),
    url: 'https://example.com/api/classes',
  } as unknown as Parameters<typeof POST>[0];
}

describe('/api/classes route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async callback => callback(tx));

    tx.class.create.mockReset();
    tx.lesson.findMany.mockReset();
    tx.curriculumUnit.create.mockReset();

    prismaMock.class.findMany.mockReset();
    prismaMock.class.count.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST', () => {
    it('returns 401 when no session is present', async () => {
      getCurrentSessionMock.mockResolvedValue(null);

      const request = createJsonRequest({
        name: 'New Class',
        gradeLevel: 4,
        standardsAlignment: 'NGSS',
      });

      const response = await POST(request);
      const payload = await response.json();

      expect(response.status).toBe(401);
      expect(payload).toEqual({
        success: false,
        error: 'Unauthorized',
      });
      expect(request.json).not.toHaveBeenCalled();
    });

    it('validates teacher role and creates class', async () => {
      const createdAt = new Date('2025-01-15T00:00:00.000Z');

      getCurrentSessionMock.mockResolvedValue({
        user: {
          id: 'teacher-1',
          role: 'TEACHER',
        },
      });

      generateUniqueJoinCodeMock.mockResolvedValue('ABC123');

      tx.class.create.mockResolvedValue({
        id: 'class-1',
        name: 'Science Explorers',
        gradeLevel: 5,
        standardsAlignment: 'NGSS',
        joinCode: 'ABC123',
        createdAt,
        _count: { students: 0 },
      });

      tx.lesson.findMany.mockResolvedValue([]);

      const request = createJsonRequest({
        name: 'Science Explorers',
        gradeLevel: 5,
        standardsAlignment: 'NGSS',
      });

      const response = await POST(request);
      const payload = await response.json();

      expect(response.status).toBe(201);
      expect(payload.success).toBe(true);
      expect(payload.data).toMatchObject({
        id: 'class-1',
        name: 'Science Explorers',
        gradeLevel: 5,
        standardsAlignment: 'NGSS',
        joinCode: 'ABC123',
        studentCount: 0,
        createdAt: createdAt.toISOString(),
      });

      expect(generateUniqueJoinCodeMock).toHaveBeenCalledWith(tx);
      expect(tx.class.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Science Explorers',
            gradeLevel: 5,
            standardsAlignment: 'NGSS',
            teacherId: 'teacher-1',
          }),
        })
      );
      expect(tx.curriculumUnit.create).not.toHaveBeenCalled();
    });

    it('returns validation errors for invalid payload', async () => {
      getCurrentSessionMock.mockResolvedValue({
        user: {
          id: 'teacher-1',
          role: 'TEACHER',
        },
      });

      const request = createJsonRequest({
        name: 'ab',
        gradeLevel: 10,
        standardsAlignment: 'INVALID',
      });

      const response = await POST(request);
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.success).toBe(false);
      expect(payload.error).toBe('Validation failed');
      expect(payload.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'name' }),
          expect.objectContaining({ field: 'gradeLevel' }),
          expect.objectContaining({ field: 'standardsAlignment' }),
        ])
      );
    });
  });

  describe('GET', () => {
    it('returns 401 when user is not authenticated', async () => {
      getCurrentSessionMock.mockResolvedValue(null);

      const request = {
        url: 'https://example.com/api/classes',
      } as unknown as Parameters<typeof GET>[0];

      const response = await GET(request);
      const payload = await response.json();

      expect(response.status).toBe(401);
      expect(payload).toEqual({
        success: false,
        error: 'Unauthorized',
      });
    });

    it('returns paginated classes for teacher', async () => {
      const now = new Date('2025-01-15T00:00:00.000Z');

      getCurrentSessionMock.mockResolvedValue({
        user: {
          id: 'teacher-1',
          role: 'TEACHER',
        },
      });

      prismaMock.class.findMany.mockResolvedValue([
        {
          id: 'class-1',
          name: 'Science Explorers',
          gradeLevel: 5,
          standardsAlignment: 'NGSS',
          joinCode: 'ABC123',
          createdAt: now,
          updatedAt: now,
          _count: { students: 12 },
        },
      ]);
      prismaMock.class.count.mockResolvedValue(1);

      const request = {
        url: 'https://example.com/api/classes?page=2&limit=5',
      } as unknown as Parameters<typeof GET>[0];

      const response = await GET(request);
      const payload = await response.json();

      expect(prismaMock.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { teacherId: 'teacher-1' },
          skip: 5,
          take: 5,
        })
      );

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(payload.data).toEqual([
        expect.objectContaining({
          id: 'class-1',
          joinCode: 'ABC123',
          studentCount: 12,
        }),
      ]);
      expect(payload.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 1,
        totalPages: 1,
      });
    });
  });
});
