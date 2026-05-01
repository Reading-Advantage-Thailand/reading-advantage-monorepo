import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();
const mockFindUnique = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    session: {
      create: (...args: unknown[]) => mockCreate(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  }),
}));

import { createSession, validateSession, deleteSession } from './session';

describe('Session module uses lib/prisma singleton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createSession uses the shared prisma singleton', async () => {
    const fakeSession = {
      id: 'cuid-id',
      userId: 'user-1',
      token: 'abc123',
      expiresAt: new Date(),
      user: {
        id: 'user-1',
        name: 'Test',
        username: 'test',
        email: 'test@test.com',
        role: 'STUDENT',
        image: null,
      },
    };
    mockCreate.mockResolvedValue(fakeSession);

    const result = await createSession('user-1');

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(result.userId).toBe('user-1');
  });

  it('validateSession uses the shared prisma singleton', async () => {
    const fakeSession = {
      id: 'cuid-id',
      userId: 'user-1',
      token: 'abc123',
      expiresAt: new Date(Date.now() + 86400000),
      user: {
        id: 'user-1',
        name: 'Test',
        username: 'test',
        email: 'test@test.com',
        role: 'STUDENT',
        image: null,
      },
    };
    mockFindUnique.mockResolvedValue(fakeSession);

    const result = await validateSession('abc123');

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { token: 'abc123' },
      include: expect.any(Object),
    });
    expect(result?.userId).toBe('user-1');
  });

  it('deleteSession uses the shared prisma singleton', async () => {
    mockDelete.mockResolvedValue({});

    await deleteSession('abc123');

    expect(mockDelete).toHaveBeenCalledWith({
      where: { token: 'abc123' },
    });
  });

  it('session.ts should not contain its own PrismaClient instantiation', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const sessionSource = fs.readFileSync(
      path.resolve(__dirname, './session.ts'),
      'utf-8'
    );

    expect(sessionSource).not.toContain('new PrismaClient()');
    expect(sessionSource).not.toContain('setPrismaClient');
    expect(sessionSource).not.toContain("from '@prisma/client'");
  });
});
