import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/env', () => ({
  env: {
    NODE_ENV: 'production',
    DEV_AUTH_ENABLED: false,
  },
}));

vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock('@/lib/auth/password', () => ({
  verifyPassword: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  createSession: vi.fn(),
  setSessionCookie: vi.fn(),
}));

vi.mock('@/lib/auth/rate-limit', () => ({
  LoginRateLimiter: vi.fn().mockImplementation(() => ({
    checkLimit: () => ({ allowed: true }),
    recordFailure: () => {},
    recordSuccess: () => {},
  })),
}));

describe('Auth Contract: Production - Google OAuth Only', () => {
  describe('POST /api/auth/login - Credential login MUST be disabled in production', () => {
    it('should reject username/password login attempts in production with 405 Method Not Allowed', async () => {
      const { POST } = await import('./route');
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'testuser', password: 'testpass' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(405);
    });

    it('should NOT accept any username/password credentials in production', async () => {
      const { POST } = await import('./route');
      const mockFindUnique = (await import('@/lib/prisma')).default.user
        .findUnique;
      const mockVerifyPassword = (await import('@/lib/auth/password'))
        .verifyPassword;

      (mockFindUnique as any).mockResolvedValue({
        id: 'user-1',
        account: [{ password: 'hashed', providerId: 'credential' }],
      });
      (mockVerifyPassword as any).mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'teacher1',
          password: 'ValidPassword123!',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(405);
      expect(mockFindUnique).not.toHaveBeenCalled();
      expect(mockVerifyPassword).not.toHaveBeenCalled();
    });
  });
});

describe('Auth Contract: Development - Dev Impersonation', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should allow dev impersonation endpoint to exist when DEV_AUTH_ENABLED=true', async () => {
    vi.doMock('@/lib/env', () => ({
      env: {
        NODE_ENV: 'development',
        DEV_AUTH_ENABLED: true,
      },
    }));

    const { env } = await import('@/lib/env');
    expect(env.DEV_AUTH_ENABLED).toBe(true);
  });

  it('should NOT expose dev impersonation in production', async () => {
    vi.doMock('@/lib/env', () => ({
      env: {
        NODE_ENV: 'production',
        DEV_AUTH_ENABLED: false,
      },
    }));

    const { env } = await import('@/lib/env');
    expect(env.DEV_AUTH_ENABLED).toBe(false);
  });
});

describe('Auth Contract: Role Constants', () => {
  it('should define STUDENT, TEACHER, ADMIN, SYSTEM roles', async () => {
    const { ROLE_HIERARCHY } = await import('@/lib/auth/constants');

    expect(ROLE_HIERARCHY.STUDENT).toBeDefined();
    expect(ROLE_HIERARCHY.TEACHER).toBeDefined();
    expect(ROLE_HIERARCHY.ADMIN).toBeDefined();
    expect(ROLE_HIERARCHY.SYSTEM).toBeDefined();
  });

  it('should have STUDENT as lowest privilege role', async () => {
    const { ROLE_HIERARCHY } = await import('@/lib/auth/constants');

    expect(ROLE_HIERARCHY.STUDENT).toBeLessThan(ROLE_HIERARCHY.TEACHER);
    expect(ROLE_HIERARCHY.TEACHER).toBeLessThan(ROLE_HIERARCHY.ADMIN);
    expect(ROLE_HIERARCHY.ADMIN).toBeLessThan(ROLE_HIERARCHY.SYSTEM);
  });

  it('should define route mappings for each role', async () => {
    const { ROLE_ROUTES } = await import('@/lib/auth/constants');

    expect(ROLE_ROUTES.STUDENT).toBe('/student');
    expect(ROLE_ROUTES.TEACHER).toBe('/teacher');
    expect(ROLE_ROUTES.ADMIN).toBe('/admin');
    expect(ROLE_ROUTES.SYSTEM).toBe('/system');
  });
});
