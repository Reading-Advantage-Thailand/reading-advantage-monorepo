import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { proxy as middleware } from './proxy';

// Mock NextResponse.redirect/next
vi.mock('next/server', async () => {
  const actual =
    await vi.importActual<typeof import('next/server')>('next/server');
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      redirect: vi.fn((url: URL) => {
        const response = new Response(null, {
          status: 307,
          headers: { Location: url.toString() },
        });
        return response as unknown as NextResponse;
      }),
      next: vi.fn(() => {
        const response = new Response(null, { status: 200 });
        return response as unknown as NextResponse;
      }),
    },
  };
});

describe('Middleware - Route Protection and RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Protected Routes - Unauthenticated Users', () => {
    it('should redirect to signin when accessing /student without session', async () => {
      const request = new NextRequest('http://localhost:3000/student');

      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toBe(
        'http://localhost:3000/signin'
      );
    });

    it('should redirect to signin when accessing /teacher without session', async () => {
      const request = new NextRequest('http://localhost:3000/teacher');

      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toBe(
        'http://localhost:3000/signin'
      );
    });
  });

  describe('Protected Routes - Authenticated Users', () => {
    it('should allow access to /student with valid session', async () => {
      const request = new NextRequest('http://localhost:3000/student', {
        headers: {
          Cookie: 'session_token=valid-token',
        },
      });

      const response = await middleware(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Signin Route - Authenticated Users', () => {
    it('should redirect authenticated users from /signin to /dashboard', async () => {
      const request = new NextRequest('http://localhost:3000/signin', {
        headers: {
          Cookie: 'session_token=valid-token',
        },
      });

      const response = await middleware(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toBe(
        'http://localhost:3000/dashboard'
      );
    });
  });

  describe('Signin Route - Unauthenticated Users', () => {
    it('should allow unauthenticated users to access /signin', async () => {
      const request = new NextRequest('http://localhost:3000/signin');

      const response = await middleware(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Non-protected Routes', () => {
    it('should allow access to public routes', async () => {
      const request = new NextRequest('http://localhost:3000/');

      const response = await middleware(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Middleware Configuration', () => {
    it('should have correct matcher configuration', async () => {
      const { config } = await import('./proxy');

      expect(config.matcher).toContain('/student/:path*');
      expect(config.matcher).toContain('/teacher/:path*');
      expect(config.matcher).toContain('/admin/:path*');
      expect(config.matcher).toContain('/system/:path*');
      expect(config.matcher).toContain('/dashboard');
      expect(config.matcher).toContain('/signin');
      expect(config.matcher).not.toContain('/signup');
    });
  });
});
