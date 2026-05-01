import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockFindUnique = vi.fn();
const mockVerifyPassword = vi.fn();
const mockCreateSession = vi.fn();
const mockSetSessionCookie = vi.fn();

vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

vi.mock('@/lib/auth/password', () => ({
  verifyPassword: (...args: unknown[]) => mockVerifyPassword(...args),
}));

vi.mock('@/lib/auth/session', () => ({
  createSession: (...args: unknown[]) => mockCreateSession(...args),
  setSessionCookie: (...args: unknown[]) => mockSetSessionCookie(...args),
}));

import { POST, _testkit } from './route';

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function setupValidUser() {
  mockFindUnique.mockResolvedValue({
    id: 'user-1',
    account: [{ password: 'hashed-pw' }],
  });
  mockVerifyPassword.mockResolvedValue(true);
  mockCreateSession.mockResolvedValue({
    id: 'cuid-id',
    token: 'session-token',
    userId: 'user-1',
    user: { id: 'user-1', name: 'Test', role: 'STUDENT' },
  });
  mockSetSessionCookie.mockResolvedValue(undefined);
}

describe('POST /api/auth/login - input length limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _testkit?.resetRateLimiter();
  });

  it('should reject username longer than 100 characters with 400', async () => {
    const longUsername = 'a'.repeat(101);
    const response = await POST(createRequest({ username: longUsername, password: 'valid' }));

    expect(response.status).toBe(400);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('should reject password longer than 128 characters with 400', async () => {
    const longPassword = 'a'.repeat(129);
    const response = await POST(createRequest({ username: 'valid', password: longPassword }));

    expect(response.status).toBe(400);
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockVerifyPassword).not.toHaveBeenCalled();
  });

  it('should accept username of exactly 100 characters', async () => {
    const username = 'a'.repeat(100);
    mockFindUnique.mockResolvedValue(null);

    const response = await POST(createRequest({ username, password: 'valid' }));

    expect(response.status).toBe(401);
    expect(mockFindUnique).toHaveBeenCalled();
  });

  it('should accept password of exactly 128 characters', async () => {
    const password = 'a'.repeat(128);
    mockFindUnique.mockResolvedValue(null);

    const response = await POST(createRequest({ username: 'valid', password }));

    expect(response.status).toBe(401);
    expect(mockFindUnique).toHaveBeenCalled();
  });

  it('should still reject missing username with 400', async () => {
    const response = await POST(createRequest({ password: 'valid' }));
    expect(response.status).toBe(400);
  });

  it('should still reject missing password with 400', async () => {
    const response = await POST(createRequest({ username: 'valid' }));
    expect(response.status).toBe(400);
  });
});

describe('POST /api/auth/login - rate limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _testkit?.resetRateLimiter();
  });

  it('should return 429 after 5 failed login attempts for same username', async () => {
    // Set up: user exists but password is wrong
    mockFindUnique.mockResolvedValue({
      id: 'user-1',
      account: [{ password: 'hashed-pw' }],
    });
    mockVerifyPassword.mockResolvedValue(false);

    // Make 5 failed attempts
    for (let i = 0; i < 5; i++) {
      const response = await POST(createRequest({ username: 'testuser', password: 'wrong' }));
      expect(response.status).toBe(401);
    }

    // 6th attempt should be rate-limited
    const response = await POST(createRequest({ username: 'testuser', password: 'wrong' }));
    expect(response.status).toBe(429);

    const body = await response.json();
    expect(body.error).toContain('Too many');
    expect(response.headers.get('Retry-After')).toBeDefined();
  });

  it('should reset rate limit counter on successful login', async () => {
    // 4 failed attempts
    mockFindUnique.mockResolvedValue({
      id: 'user-1',
      account: [{ password: 'hashed-pw' }],
    });
    mockVerifyPassword.mockResolvedValue(false);

    for (let i = 0; i < 4; i++) {
      await POST(createRequest({ username: 'testuser', password: 'wrong' }));
    }

    // Successful login
    setupValidUser();
    const successResponse = await POST(createRequest({ username: 'testuser', password: 'correct' }));
    expect(successResponse.status).toBe(200);

    // Should be able to fail again without being rate limited
    mockVerifyPassword.mockResolvedValue(false);
    const response = await POST(createRequest({ username: 'testuser', password: 'wrong' }));
    expect(response.status).toBe(401); // Not 429
  });

  it('should not rate-limit different usernames', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'user-1',
      account: [{ password: 'hashed-pw' }],
    });
    mockVerifyPassword.mockResolvedValue(false);

    // 5 failed attempts for user1
    for (let i = 0; i < 5; i++) {
      await POST(createRequest({ username: 'user1', password: 'wrong' }));
    }

    // user2 should not be affected
    const response = await POST(createRequest({ username: 'user2', password: 'wrong' }));
    expect(response.status).toBe(401); // Not 429
  });
});
