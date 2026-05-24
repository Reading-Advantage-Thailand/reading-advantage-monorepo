import { describe, it, expect, vi, beforeEach } from 'vitest';

type InsertCapture = { values?: Record<string, unknown>; returned?: Record<string, unknown> };
const insertCapture: InsertCapture = {};

vi.mock('@reading-advantage/db', async () => {
  const mockDb = {
    insert: vi.fn().mockImplementation(() => ({
      values: vi.fn().mockImplementation((vals: Record<string, unknown>) => {
        insertCapture.values = vals;
        return {
          returning: vi.fn().mockResolvedValue([
            {
              id: vals.id ?? 'auto-generated-uuid',
              token: vals.token,
              userId: vals.userId,
              expiresAt: vals.expiresAt,
            },
          ]),
        };
      }),
    })),
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockImplementation(() => ({
          limit: vi.fn().mockResolvedValue([
            {
              id: 'user-1',
              username: 'test',
              name: 'Test',
              email: 'test@test.com',
              role: 'STUDENT',
              schoolId: null,
              xp: 0,
              level: 1,
              cefrLevel: 'A1-',
              image: null,
            },
          ]),
        })),
      })),
    })),
    delete: vi.fn(),
  };
  return {
    db: mockDb,
    eq: vi.fn(() => 'eq-clause'),
  };
});

vi.mock('@reading-advantage/db/schema', () => ({
  sessions: { id: 'sessions.id', token: 'sessions.token' },
  users: {
    id: 'users.id',
    username: 'users.username',
    name: 'users.name',
    email: 'users.email',
    role: 'users.role',
    image: 'users.image',
    schoolId: 'users.schoolId',
    xp: 'users.xp',
    level: 'users.level',
    cefrLevel: 'users.cefrLevel',
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  }),
}));

import { createSession } from './session';

describe('Session ID separation from token (Drizzle insert payload)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertCapture.values = undefined;
  });

  it('inserts a session whose id is a generated UUID, distinct from the token', async () => {
    await createSession('user-1');

    expect(insertCapture.values).toBeDefined();
    const { id, token } = insertCapture.values!;
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
    expect(id).not.toBe(token);
  });

  it('inserts a session with an explicit UUID id (not undefined)', async () => {
    await createSession('user-1');

    // Shared createSession always sets id = crypto.randomUUID()
    expect(insertCapture.values!.id).toBeDefined();
    expect(typeof insertCapture.values!.id).toBe('string');
    // UUID v4 length
    expect((insertCapture.values!.id as string).length).toBe(36);
  });

  it('inserts a 64-char hex token separate from id', async () => {
    await createSession('user-1');

    expect(insertCapture.values!.token).toBeDefined();
    expect(typeof insertCapture.values!.token).toBe('string');
    expect((insertCapture.values!.token as string).length).toBe(64);
    expect(insertCapture.values!.token).toMatch(/^[0-9a-f]+$/);
  });
});
