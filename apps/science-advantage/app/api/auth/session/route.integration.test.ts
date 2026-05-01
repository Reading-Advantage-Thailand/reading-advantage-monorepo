import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import prisma from '@/lib/prisma';
import type { user as UserModel } from '@prisma/client';
import type { Session } from '@/lib/auth/types';
import { GET } from './route';
import { createSession } from '@/lib/auth/session';
import * as sessionModule from '@/lib/auth/session';

// Mock next/headers for cookies
const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => mockCookies),
}));

describe('GET /api/auth/session - Integration Tests', () => {
  let testUser: UserModel;
  let testSession: Session;

  beforeEach(async () => {
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
    mockCookies.get.mockReturnValue(undefined);

    // Clean up
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();

    // Create test user
    testUser = await prisma.user.create({
      data: {
        id: 'test-session-user',
        name: 'Test Session User',
        username: 'testsession',
        displayUsername: 'TestSession',
        email: 'testsession@example.com',
        role: 'STUDENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create session
    testSession = await createSession(testUser.id);
  });

  afterEach(async () => {
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('Valid Session', () => {
    it('should return session for valid session token', async () => {
      mockCookies.get.mockReturnValue({ value: testSession.token });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.session).toBeDefined();
      expect(data.session.user).toBeDefined();
      expect(data.session.user.id).toBe(testUser.id);
      expect(data.session.user.username).toBe('testsession');
      expect(data.session.user.role).toBe('STUDENT');
    });

    it('should include expiration time in session', async () => {
      mockCookies.get.mockReturnValue({ value: testSession.token });

      const response = await GET();
      const data = await response.json();

      expect(data.session.expiresAt).toBeDefined();
      const expiresAt = new Date(data.session.expiresAt);
      expect(expiresAt).toBeInstanceOf(Date);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return all user fields in session', async () => {
      mockCookies.get.mockReturnValue({ value: testSession.token });

      const response = await GET();
      const data = await response.json();

      expect(data.session.user.id).toBe(testUser.id);
      expect(data.session.user.name).toBe(testUser.name);
      expect(data.session.user.username).toBe(testUser.username);
      expect(data.session.user.email).toBe(testUser.email);
      expect(data.session.user.role).toBe(testUser.role);
    });

    it('should work for all user roles', async () => {
      const roles = ['STUDENT', 'TEACHER', 'ADMIN', 'SYSTEM'] as const;

      for (const role of roles) {
        const user = await prisma.user.create({
          data: {
            id: `session-user-${role}`,
            name: `${role} User`,
            username: `session${role.toLowerCase()}`,
            displayUsername: role,
            email: `session-${role.toLowerCase()}@example.com`,
            role,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        const session = await createSession(user.id);

        mockCookies.get.mockReturnValue({ value: session.token });

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.session.user.role).toBe(role);
      }
    });
  });

  describe('No Session', () => {
    it('should return null session when no cookie present', async () => {
      mockCookies.get.mockReturnValue(undefined);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.session).toBeNull();
    });

    it('should return null session when cookie has empty value', async () => {
      mockCookies.get.mockReturnValue({ value: '' });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.session).toBeNull();
    });
  });

  describe('Invalid Session', () => {
    it('should return null for invalid session token', async () => {
      mockCookies.get.mockReturnValue({ value: 'invalid-token' });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.session).toBeNull();
    });

    it('should return null for expired session', async () => {
      const expiredSession = await prisma.session.create({
        data: {
          id: 'expired-session',
          token: 'expired-token',
          userId: testUser.id,
          expiresAt: new Date(Date.now() - 1000), // 1 second ago
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      mockCookies.get.mockReturnValue({ value: expiredSession.token });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.session).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockCookies.get.mockReturnValue({ value: testSession.token });

      const findSpy = vi
        .spyOn(sessionModule, 'getCurrentSession')
        .mockRejectedValueOnce(new Error('Database error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('An error occurred while fetching session');

      findSpy.mockRestore();
    });

    it('should handle cookie access errors', async () => {
      mockCookies.get.mockImplementationOnce(() => {
        throw new Error('Cookie error');
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('An error occurred while fetching session');
    });
  });

  describe('Response Format', () => {
    it('should return correct response structure with session', async () => {
      mockCookies.get.mockReturnValue({ value: testSession.token });

      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty('session');
      expect(data.session).toHaveProperty('user');
      expect(data.session).toHaveProperty('expiresAt');
    });

    it('should return correct response structure without session', async () => {
      mockCookies.get.mockReturnValue(undefined);

      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty('session');
      expect(data.session).toBeNull();
    });

    it('should not expose sensitive session fields', async () => {
      mockCookies.get.mockReturnValue({ value: testSession.token });

      const response = await GET();
      const data = await response.json();

      expect(data.session.id).toBeUndefined();
      expect(data.session.token).toBeUndefined();
    });
  });

  describe('Multiple Sessions', () => {
    it('should return correct session for current token', async () => {
      const session2 = await createSession(testUser.id);

      // Test first session
      mockCookies.get.mockReturnValue({ value: testSession.token });
      const response1 = await GET();
      const data1 = await response1.json();

      expect(data1.session).toBeDefined();
      expect(data1.session.user.id).toBe(testUser.id);

      // Test second session
      mockCookies.get.mockReturnValue({ value: session2.id });
      const response2 = await GET();
      const data2 = await response2.json();

      expect(data2.session).toBeDefined();
      expect(data2.session.user.id).toBe(testUser.id);
    });
  });

  describe('User Data Updates', () => {
    it('should reflect latest user data from database', async () => {
      mockCookies.get.mockReturnValue({ value: testSession.token });

      // Update user data
      await prisma.user.update({
        where: { id: testUser.id },
        data: { name: 'Updated Name' },
      });

      const response = await GET();
      const data = await response.json();

      expect(data.session.user.name).toBe('Updated Name');
    });

    it('should reflect role changes', async () => {
      mockCookies.get.mockReturnValue({ value: testSession.token });

      // Update user role
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: 'TEACHER' },
      });

      const response = await GET();
      const data = await response.json();

      expect(data.session.user.role).toBe('TEACHER');
    });
  });

  describe('Edge Cases', () => {
    it('should handle deleted user gracefully', async () => {
      mockCookies.get.mockReturnValue({ value: testSession.token });

      // Delete the user
      await prisma.user.delete({ where: { id: testUser.id } });

      const response = await GET();
      const data = await response.json();

      // Session should be gone because of cascade delete
      expect(data.session).toBeNull();
    });

    it('should handle malformed session token', async () => {
      mockCookies.get.mockReturnValue({ value: 'malformed@#$%token' });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.session).toBeNull();
    });
  });
});
