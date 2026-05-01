import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { POST } from '@/app/api/classes/join/route';

const { getCurrentSessionMock, prismaMock } = vi.hoisted(() => ({
  getCurrentSessionMock: vi.fn(),
  prismaMock: {
    class: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/session', () => ({
  getCurrentSession: getCurrentSessionMock,
}));

vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: prismaMock,
}));

function createJsonRequest(body: unknown) {
  return {
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Parameters<typeof POST>[0];
}

describe('/api/classes/join route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.class.findUnique.mockReset();
    prismaMock.class.update.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    getCurrentSessionMock.mockResolvedValue(null);

    const request = createJsonRequest({ joinCode: 'ABCDEF' });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({
      success: false,
      error: 'Unauthorized',
    });
    expect(request.json).not.toHaveBeenCalled();
  });

  it('returns 403 when user is not a student', async () => {
    getCurrentSessionMock.mockResolvedValue({
      user: {
        id: 'teacher-1',
        role: 'TEACHER',
      },
    });

    const request = createJsonRequest({ joinCode: 'ABCDEF' });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toEqual({
      success: false,
      error: 'Forbidden: Only students can join classes',
    });
    expect(request.json).not.toHaveBeenCalled();
  });

  it('returns 400 when join code format is invalid', async () => {
    getCurrentSessionMock.mockResolvedValue({
      user: {
        id: 'student-1',
        role: 'STUDENT',
      },
    });

    const request = createJsonRequest({ joinCode: 'abc123' });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      success: false,
      error: 'Invalid join code format',
    });
    expect(prismaMock.class.findUnique).not.toHaveBeenCalled();
  });

  it('returns 400 when request body cannot be parsed', async () => {
    getCurrentSessionMock.mockResolvedValue({
      user: {
        id: 'student-1',
        role: 'STUDENT',
      },
    });

    const request = {
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
    } as unknown as Parameters<typeof POST>[0];

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      success: false,
      error: 'Invalid join code format',
    });
  });

  it('returns 404 when join code is not found', async () => {
    getCurrentSessionMock.mockResolvedValue({
      user: {
        id: 'student-1',
        role: 'STUDENT',
      },
    });

    prismaMock.class.findUnique.mockResolvedValue(null);

    const request = createJsonRequest({ joinCode: 'ABCDEF' });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({
      success: false,
      error: 'Join code not found',
    });
  });

  it('returns 409 when student already enrolled', async () => {
    getCurrentSessionMock.mockResolvedValue({
      user: {
        id: 'student-1',
        role: 'STUDENT',
      },
    });

    prismaMock.class.findUnique.mockResolvedValue({
      id: 'class-1',
      name: 'Science Explorers',
      gradeLevel: 3,
      teacher: { name: 'Ms. Frizzle' },
      students: [{ id: 'student-1' }],
    });

    const request = createJsonRequest({ joinCode: 'ABCDEF' });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toEqual({
      success: false,
      error: 'Already enrolled in this class',
    });
    expect(prismaMock.class.update).not.toHaveBeenCalled();
  });

  it('joins class and returns enrollment summary', async () => {
    getCurrentSessionMock.mockResolvedValue({
      user: {
        id: 'student-1',
        role: 'STUDENT',
      },
    });

    prismaMock.class.findUnique.mockResolvedValue({
      id: 'class-1',
      name: 'Science Explorers',
      gradeLevel: 3,
      teacher: { name: 'Ms. Frizzle' },
      students: [],
    });

    prismaMock.class.update.mockResolvedValue({});

    const request = createJsonRequest({ joinCode: 'ABCDEF' });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      classEnrollment: {
        id: 'class-1:student-1',
        classId: 'class-1',
        className: 'Science Explorers',
        gradeLevel: 3,
        teacherName: 'Ms. Frizzle',
      },
    });
    expect(prismaMock.class.update).toHaveBeenCalledWith({
      where: { id: 'class-1' },
      data: {
        students: {
          connect: { id: 'student-1' },
        },
      },
    });
  });
});
