import { describe, it, expect, vi, beforeEach } from 'vitest';

const { requireRoleMock, getSessionMock } = vi.hoisted(() => ({
  requireRoleMock: vi.fn(),
  getSessionMock: vi.fn(),
}));

vi.mock('@reading-advantage/auth', async () => {
  const actual = await vi.importActual<typeof import('@reading-advantage/auth')>(
    '@reading-advantage/auth'
  );
  return {
    ...actual,
    requireRole: requireRoleMock,
    getSession: getSessionMock,
  };
});

vi.mock('@reading-advantage/db', () => ({ db: {} }));

import { NextRequest } from 'next/server';
import { proxy } from '../../proxy';
import { AuthError } from '@reading-advantage/auth';

function createRequest(pathname: string, cookies?: Record<string, string>) {
  const url = new URL(pathname, 'http://localhost:3000');
  const req = new NextRequest(url);
  if (cookies) {
    for (const [name, value] of Object.entries(cookies)) {
      req.cookies.set(name, value);
    }
  }
  return req;
}

function mockUser(role: 'STUDENT' | 'TEACHER' | 'ADMIN' | 'SYSTEM') {
  return {
    user: { id: 'u1', role, schoolId: 's1', email: 'u@b.com', username: 'u' },
    token: `${role}-token`,
  };
}

beforeEach(() => {
  requireRoleMock.mockReset();
  getSessionMock.mockReset();
});

describe('proxy role enforcement', () => {
  describe('/admin routes', () => {
    it('redirects STUDENT to /dashboard with error=forbidden', async () => {
      requireRoleMock.mockRejectedValue(
        new AuthError('Requires role ADMIN or higher', 'FORBIDDEN')
      );

      const res = await proxy(createRequest('/admin', { session_token: 'student-token' }));

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/dashboard');
      expect(res.headers.get('location')).toContain('error=forbidden');
    });

    it('allows ADMIN through', async () => {
      requireRoleMock.mockResolvedValue(mockUser('ADMIN'));

      const res = await proxy(createRequest('/admin/users', { session_token: 'admin-token' }));

      expect(res.status).toBe(200);
      expect(requireRoleMock).toHaveBeenCalledWith(expect.anything(), 'admin-token', 'ADMIN');
    });

    it('redirects on invalid token and clears cookie', async () => {
      requireRoleMock.mockRejectedValue(
        new AuthError('Authentication required', 'UNAUTHORIZED')
      );

      const res = await proxy(createRequest('/admin', { session_token: 'bad' }));

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/signin');
      const setCookie = res.headers.get('set-cookie') ?? '';
      expect(setCookie).toMatch(/session_token=;.*Max-Age=0/i);
    });

    it('fails closed on DB error', async () => {
      requireRoleMock.mockRejectedValue(new Error('connection refused'));

      const res = await proxy(createRequest('/admin', { session_token: 'x' }));

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('error=session_check_failed');
    });
  });

  describe('/system routes (require ADMIN)', () => {
    it('redirects TEACHER from /system', async () => {
      requireRoleMock.mockRejectedValue(
        new AuthError('Requires role ADMIN or higher', 'FORBIDDEN')
      );

      const res = await proxy(createRequest('/system', { session_token: 't' }));

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/dashboard');
      expect(requireRoleMock).toHaveBeenCalledWith(expect.anything(), 't', 'ADMIN');
    });

    it('allows ADMIN through /system', async () => {
      requireRoleMock.mockResolvedValue(mockUser('ADMIN'));

      const res = await proxy(createRequest('/system/health', { session_token: 'a' }));

      expect(res.status).toBe(200);
    });
  });

  describe('/teacher routes (require TEACHER)', () => {
    it('redirects STUDENT from /teacher', async () => {
      requireRoleMock.mockRejectedValue(
        new AuthError('Requires role TEACHER or higher', 'FORBIDDEN')
      );

      const res = await proxy(createRequest('/teacher', { session_token: 's' }));

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/dashboard');
      expect(requireRoleMock).toHaveBeenCalledWith(expect.anything(), 's', 'TEACHER');
    });

    it('allows TEACHER through', async () => {
      requireRoleMock.mockResolvedValue(mockUser('TEACHER'));

      const res = await proxy(createRequest('/teacher/classes', { session_token: 't' }));

      expect(res.status).toBe(200);
    });

    it('allows ADMIN through /teacher (hierarchy)', async () => {
      requireRoleMock.mockResolvedValue(mockUser('ADMIN'));

      const res = await proxy(createRequest('/teacher', { session_token: 'a' }));

      expect(res.status).toBe(200);
    });
  });

  describe('/student routes (require STUDENT)', () => {
    it('redirects unauthenticated /student to /signin', async () => {
      const res = await proxy(createRequest('/student'));

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/signin');
      expect(requireRoleMock).not.toHaveBeenCalled();
    });

    it('allows STUDENT through', async () => {
      requireRoleMock.mockResolvedValue(mockUser('STUDENT'));

      const res = await proxy(createRequest('/student', { session_token: 's' }));

      expect(res.status).toBe(200);
      expect(requireRoleMock).toHaveBeenCalledWith(expect.anything(), 's', 'STUDENT');
    });

    it('allows TEACHER through /student (hierarchy)', async () => {
      requireRoleMock.mockResolvedValue(mockUser('TEACHER'));

      const res = await proxy(createRequest('/student/lessons', { session_token: 't' }));

      expect(res.status).toBe(200);
    });
  });

  describe('/signin redirect-when-authed', () => {
    it('redirects valid session away from /signin to /dashboard', async () => {
      getSessionMock.mockResolvedValue(mockUser('STUDENT'));

      const res = await proxy(createRequest('/signin', { session_token: 's' }));

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/dashboard');
    });

    it('serves /signin to invalid-session users and clears cookie', async () => {
      getSessionMock.mockResolvedValue(null);

      const res = await proxy(createRequest('/signin', { session_token: 'bad' }));

      expect(res.status).toBe(200);
      const setCookie = res.headers.get('set-cookie') ?? '';
      expect(setCookie).toMatch(/session_token=;.*Max-Age=0/i);
    });

    it('serves /signin to unauthenticated users', async () => {
      const res = await proxy(createRequest('/signin'));

      expect(res.status).toBe(200);
      expect(getSessionMock).not.toHaveBeenCalled();
    });
  });

  describe('/dashboard', () => {
    it('redirects unauthenticated to /signin', async () => {
      const res = await proxy(createRequest('/dashboard'));

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/signin');
    });

    it('allows any signed-in user through', async () => {
      getSessionMock.mockResolvedValue(mockUser('STUDENT'));

      const res = await proxy(createRequest('/dashboard', { session_token: 's' }));

      expect(res.status).toBe(200);
    });
  });
});
