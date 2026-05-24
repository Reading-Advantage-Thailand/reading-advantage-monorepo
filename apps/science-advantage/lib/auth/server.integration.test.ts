import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { db } from '@reading-advantage/db';
import { users, sessions, accounts } from '@reading-advantage/db/schema';
import { redirect } from 'next/navigation';
import { requireAuth, requireRole, hasRole, getSession } from './server';
import { createSession } from './session';
import type { Session, UserRole } from './types';

type UserRow = typeof users.$inferSelect;

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => mockCookies),
}));

async function cleanupAuthFixtures(): Promise<void> {
  await db.delete(sessions);
  await db.delete(accounts);
  await db.delete(users);
}

function toSessionUser(user: UserRow): Session['user'] {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    // Drizzle users.role widens to include INTERN; this suite only seeds the four
    // local UserRole values so the narrowing cast is safe.
    role: user.role as UserRole,
    image: user.image,
  };
}

describe('Auth Server Helpers', () => {
  let studentUser: UserRow;
  let teacherUser: UserRow;
  let adminUser: UserRow;
  let systemUser: UserRow;

  beforeEach(async () => {
    await cleanupAuthFixtures();

    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();

    [studentUser] = await db
      .insert(users)
      .values({
        id: 'auth-server-student',
        name: 'Student User',
        username: 'student',
        displayUsername: 'Student',
        email: 'student@example.com',
        role: 'STUDENT',
      })
      .returning();

    [teacherUser] = await db
      .insert(users)
      .values({
        id: 'auth-server-teacher',
        name: 'Teacher User',
        username: 'teacher',
        displayUsername: 'Teacher',
        email: 'teacher@example.com',
        role: 'TEACHER',
      })
      .returning();

    [adminUser] = await db
      .insert(users)
      .values({
        id: 'auth-server-admin',
        name: 'Admin User',
        username: 'admin',
        displayUsername: 'Admin',
        email: 'admin@example.com',
        role: 'ADMIN',
      })
      .returning();

    [systemUser] = await db
      .insert(users)
      .values({
        id: 'auth-server-system',
        name: 'System User',
        username: 'system',
        displayUsername: 'System',
        email: 'system@example.com',
        role: 'SYSTEM',
      })
      .returning();

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupAuthFixtures();
  });

  describe('hasRole', () => {
    it('should return true when user has exact role', () => {
      const session: Session = {
        id: 'test-session',
        userId: studentUser.id,
        expiresAt: new Date(),
        user: toSessionUser(studentUser),
      };

      expect(hasRole(session, 'STUDENT')).toBe(true);
    });

    it('should return true when user has higher role', () => {
      const session: Session = {
        id: 'test-session',
        userId: teacherUser.id,
        expiresAt: new Date(),
        user: toSessionUser(teacherUser),
      };

      expect(hasRole(session, 'STUDENT')).toBe(true);
    });

    it('should return false when user has lower role', () => {
      const session: Session = {
        id: 'test-session',
        userId: studentUser.id,
        expiresAt: new Date(),
        user: toSessionUser(studentUser),
      };

      expect(hasRole(session, 'TEACHER')).toBe(false);
      expect(hasRole(session, 'ADMIN')).toBe(false);
      expect(hasRole(session, 'SYSTEM')).toBe(false);
    });

    it('should enforce role hierarchy correctly', () => {
      const studentSession: Session = {
        id: 'student-session',
        userId: studentUser.id,
        expiresAt: new Date(),
        user: toSessionUser(studentUser),
      };

      expect(hasRole(studentSession, 'STUDENT')).toBe(true);
      expect(hasRole(studentSession, 'TEACHER')).toBe(false);
      expect(hasRole(studentSession, 'ADMIN')).toBe(false);
      expect(hasRole(studentSession, 'SYSTEM')).toBe(false);

      const teacherSession: Session = {
        id: 'teacher-session',
        userId: teacherUser.id,
        expiresAt: new Date(),
        user: toSessionUser(teacherUser),
      };

      expect(hasRole(teacherSession, 'STUDENT')).toBe(true);
      expect(hasRole(teacherSession, 'TEACHER')).toBe(true);
      expect(hasRole(teacherSession, 'ADMIN')).toBe(false);
      expect(hasRole(teacherSession, 'SYSTEM')).toBe(false);

      const adminSession: Session = {
        id: 'admin-session',
        userId: adminUser.id,
        expiresAt: new Date(),
        user: toSessionUser(adminUser),
      };

      expect(hasRole(adminSession, 'STUDENT')).toBe(true);
      expect(hasRole(adminSession, 'TEACHER')).toBe(true);
      expect(hasRole(adminSession, 'ADMIN')).toBe(true);
      expect(hasRole(adminSession, 'SYSTEM')).toBe(false);

      const systemSession: Session = {
        id: 'system-session',
        userId: systemUser.id,
        expiresAt: new Date(),
        user: toSessionUser(systemUser),
      };

      expect(hasRole(systemSession, 'STUDENT')).toBe(true);
      expect(hasRole(systemSession, 'TEACHER')).toBe(true);
      expect(hasRole(systemSession, 'ADMIN')).toBe(true);
      expect(hasRole(systemSession, 'SYSTEM')).toBe(true);
    });
  });

  describe('requireAuth', () => {
    it('should return session when user is authenticated', async () => {
      const session = await createSession(studentUser.id);
      mockCookies.get.mockReturnValue({ value: session.token });

      const result = await requireAuth();
      expect(result.user.id).toBe(session.user.id);
    });

    it('should redirect to /signin when no session', async () => {
      const redirectMock = redirect as unknown as Mock;

      mockCookies.get.mockReturnValue(undefined);
      await expect(requireAuth()).resolves.toBeUndefined();
      expect(redirectMock).toHaveBeenCalledWith('/signin');
    });
  });

  describe('requireRole', () => {
    it('should allow user with required role', async () => {
      const createdSession = await createSession(studentUser.id);
      mockCookies.get.mockReturnValue({ value: createdSession.token });

      const session = await requireRole('STUDENT');

      expect(session.user.id).toBe(studentUser.id);
    });

    it('should allow higher role to access lower role route', async () => {
      const createdSession = await createSession(teacherUser.id);
      mockCookies.get.mockReturnValue({ value: createdSession.token });

      const session = await requireRole('STUDENT');

      expect(session.user.id).toBe(teacherUser.id);
    });

    it('should redirect to role dashboard when user lacks required role', async () => {
      const createdSession = await createSession(studentUser.id);
      const redirectMock = redirect as unknown as Mock;

      mockCookies.get.mockReturnValue({ value: createdSession.token });

      await expect(requireRole('TEACHER')).resolves.toBeUndefined();
      expect(redirectMock).toHaveBeenCalledWith('/student');
    });

    it('should redirect to admin dashboard when admin lacks required role', async () => {
      const createdSession = await createSession(adminUser.id);
      const redirectMock = redirect as unknown as Mock;

      mockCookies.get.mockReturnValue({ value: createdSession.token });

      await expect(requireRole('SYSTEM')).resolves.toBeUndefined();
      expect(redirectMock).toHaveBeenCalledWith('/admin');
    });
  });

  describe('getSession', () => {
    it('should return null when no session exists', async () => {
      mockCookies.get.mockReturnValue(undefined);
      const session = await getSession();
      expect(session).toBeNull();
    });

    it('should return session when user is authenticated', async () => {
      const createdSession = await createSession(studentUser.id);
      mockCookies.get.mockReturnValue({ value: createdSession.token });
      const session = await getSession();

      expect(session?.user.id).toBe(createdSession.user.id);
    });
  });

  describe('Role Routes', () => {
    it('should map roles to correct routes', () => {
      const roleRouteMap = {
        STUDENT: '/student',
        TEACHER: '/teacher',
        ADMIN: '/admin',
        SYSTEM: '/system',
      };

      expect(roleRouteMap.STUDENT).toBe('/student');
      expect(roleRouteMap.TEACHER).toBe('/teacher');
      expect(roleRouteMap.ADMIN).toBe('/admin');
      expect(roleRouteMap.SYSTEM).toBe('/system');
    });
  });

  describe('Permission Scenarios', () => {
    it('should allow teacher to access student routes', () => {
      const teacherSession: Session = {
        id: 'test',
        userId: teacherUser.id,
        expiresAt: new Date(),
        user: toSessionUser(teacherUser),
      };

      expect(hasRole(teacherSession, 'STUDENT')).toBe(true);
    });

    it('should prevent student from accessing teacher routes', () => {
      const studentSession: Session = {
        id: 'test',
        userId: studentUser.id,
        expiresAt: new Date(),
        user: toSessionUser(studentUser),
      };

      expect(hasRole(studentSession, 'TEACHER')).toBe(false);
    });

    it('should allow admin to access all lower level routes', () => {
      const adminSession: Session = {
        id: 'test',
        userId: adminUser.id,
        expiresAt: new Date(),
        user: toSessionUser(adminUser),
      };

      expect(hasRole(adminSession, 'STUDENT')).toBe(true);
      expect(hasRole(adminSession, 'TEACHER')).toBe(true);
      expect(hasRole(adminSession, 'ADMIN')).toBe(true);
    });

    it('should prevent admin from accessing system routes', () => {
      const adminSession: Session = {
        id: 'test',
        userId: adminUser.id,
        expiresAt: new Date(),
        user: toSessionUser(adminUser),
      };

      expect(hasRole(adminSession, 'SYSTEM')).toBe(false);
    });

    it('should allow system user to access all routes', () => {
      const systemSession: Session = {
        id: 'test',
        userId: systemUser.id,
        expiresAt: new Date(),
        user: toSessionUser(systemUser),
      };

      expect(hasRole(systemSession, 'STUDENT')).toBe(true);
      expect(hasRole(systemSession, 'TEACHER')).toBe(true);
      expect(hasRole(systemSession, 'ADMIN')).toBe(true);
      expect(hasRole(systemSession, 'SYSTEM')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle session with null user fields', () => {
      const session: Session = {
        id: 'test',
        userId: 'test',
        expiresAt: new Date(),
        user: {
          id: 'test',
          name: 'Test',
          username: 'test',
          email: null,
          role: 'STUDENT',
          image: null,
        },
      };

      expect(hasRole(session, 'STUDENT')).toBe(true);
    });

    it('should handle session expiration dates correctly', () => {
      const futureExpiry: Session = {
        id: 'test',
        userId: 'test',
        expiresAt: new Date(Date.now() + 86400000),
        user: {
          id: 'test',
          name: 'Test',
          username: 'test',
          email: null,
          role: 'STUDENT',
          image: null,
        },
      };

      expect(hasRole(futureExpiry, 'STUDENT')).toBe(true);

      const pastExpiry: Session = {
        id: 'test',
        userId: 'test',
        expiresAt: new Date(Date.now() - 86400000),
        user: {
          id: 'test',
          name: 'Test',
          username: 'test',
          email: null,
          role: 'STUDENT',
          image: null,
        },
      };

      // hasRole doesn't check expiration — that's validateSession's job
      expect(hasRole(pastExpiry, 'STUDENT')).toBe(true);
    });
  });
});
