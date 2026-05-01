import { describe, it, expect, vi, beforeEach } from 'vitest';

let capturedCreateData: Record<string, unknown> | null = null;

const mockCreate = vi.fn().mockImplementation((args: { data: Record<string, unknown>; include: unknown }) => {
  capturedCreateData = args.data;
  return Promise.resolve({
    id: args.data.id ?? 'auto-generated-cuid',
    userId: args.data.userId,
    token: args.data.token,
    expiresAt: args.data.expiresAt,
    user: {
      id: args.data.userId,
      name: 'Test',
      username: 'test',
      email: 'test@test.com',
      role: 'STUDENT',
      image: null,
    },
  });
});

vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    session: {
      create: (...args: unknown[]) => mockCreate(...args),
      findUnique: vi.fn(),
      delete: vi.fn(),
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

import { createSession } from './session';

describe('Session ID separation from token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedCreateData = null;
  });

  it('should not set id equal to token when creating a session', async () => {
    await createSession('user-1');

    expect(capturedCreateData).toBeDefined();
    // The id should either be omitted (let Prisma auto-generate) or different from token
    if (capturedCreateData!.id !== undefined) {
      expect(capturedCreateData!.id).not.toBe(capturedCreateData!.token);
    }
  });

  it('should not include id field in session creation data (let Prisma auto-generate)', async () => {
    await createSession('user-1');

    expect(capturedCreateData).toBeDefined();
    expect(capturedCreateData!.id).toBeUndefined();
  });

  it('should still include a token field in session creation', async () => {
    await createSession('user-1');

    expect(capturedCreateData).toBeDefined();
    expect(capturedCreateData!.token).toBeDefined();
    expect(typeof capturedCreateData!.token).toBe('string');
    expect((capturedCreateData!.token as string).length).toBe(64); // 32 bytes hex
  });
});
