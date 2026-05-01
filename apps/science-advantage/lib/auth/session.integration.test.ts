import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  createSession,
  validateSession,
  deleteSession,
} from './session';

const prisma = new PrismaClient();

describe('Session Management', () => {
  let testUserId: string;

  beforeEach(async () => {
    // Clean up sessions and create a test user
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();

    const user = await prisma.user.create({
      data: {
        id: 'test-user-session',
        name: 'Test User',
        username: 'testuser',
        displayUsername: 'TestUser',
        email: 'test@example.com',
        role: 'STUDENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    testUserId = user.id;
  });

  afterEach(async () => {
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('createSession', () => {
    it('should create a session for a user', async () => {
      const session = await createSession(testUserId);

      expect(session).toBeDefined();
      expect(session.userId).toBe(testUserId);
      expect(session.id).toBeDefined();
      expect(session.token).toBeDefined();
      expect(session.id).not.toBe(session.token);
      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(session.user).toBeDefined();
      expect(session.user.id).toBe(testUserId);
    });

    it('should create a session with correct expiration time', async () => {
      const before = new Date();
      const session = await createSession(testUserId);
      const after = new Date();

      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

      // Session should expire 7 days from now
      const expectedExpiry = new Date(before.getTime() + SEVEN_DAYS);
      const maxExpiry = new Date(after.getTime() + SEVEN_DAYS);

      expect(session.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiry.getTime());
      expect(session.expiresAt.getTime()).toBeLessThanOrEqual(maxExpiry.getTime());
    });

    it('should generate unique session tokens', async () => {
      const session1 = await createSession(testUserId);
      const session2 = await createSession(testUserId);

      expect(session1.token).not.toBe(session2.token);
      expect(session1.id).not.toBe(session2.id);
    });

    it('should include user data in session', async () => {
      const session = await createSession(testUserId);

      expect(session.user.name).toBe('Test User');
      expect(session.user.username).toBe('testuser');
      expect(session.user.email).toBe('test@example.com');
      expect(session.user.role).toBe('STUDENT');
    });

    it('should create session record in database', async () => {
      const session = await createSession(testUserId);

      const dbSession = await prisma.session.findUnique({
        where: { token: session.token! },
      });

      expect(dbSession).toBeDefined();
      expect(dbSession?.userId).toBe(testUserId);
    });

    it('should handle non-existent user', async () => {
      await expect(
        createSession('non-existent-user-id')
      ).rejects.toThrow();
    });

    it('should create multiple sessions for same user', async () => {
      const session1 = await createSession(testUserId);
      const session2 = await createSession(testUserId);

      expect(session1.token).not.toBe(session2.token);

      const sessions = await prisma.session.findMany({
        where: { userId: testUserId },
      });

      expect(sessions.length).toBe(2);
    });
  });

  describe('validateSession', () => {
    it('should validate a valid session token', async () => {
      const createdSession = await createSession(testUserId);
      const validatedSession = await validateSession(createdSession.token!);

      expect(validatedSession).toBeDefined();
      expect(validatedSession?.id).toBe(createdSession.id);
      expect(validatedSession?.userId).toBe(testUserId);
    });

    it('should return null for non-existent token', async () => {
      const validatedSession = await validateSession('non-existent-token');

      expect(validatedSession).toBeNull();
    });

    it('should return null for invalid token format', async () => {
      const validatedSession = await validateSession('invalid-token-123');

      expect(validatedSession).toBeNull();
    });

    it('should return null and delete expired session', async () => {
      const session = await createSession(testUserId);

      // Manually update the session to be expired
      await prisma.session.update({
        where: { id: session.id },
        data: { expiresAt: new Date(Date.now() - 1000) }, // 1 second ago
      });

      const validatedSession = await validateSession(session.token!);

      expect(validatedSession).toBeNull();

      // Verify session was deleted
      const dbSession = await prisma.session.findUnique({
        where: { id: session.id },
      });

      expect(dbSession).toBeNull();
    });

    it('should include user data in validated session', async () => {
      const createdSession = await createSession(testUserId);
      const validatedSession = await validateSession(createdSession.token!);

      expect(validatedSession?.user.name).toBe('Test User');
      expect(validatedSession?.user.username).toBe('testuser');
      expect(validatedSession?.user.role).toBe('STUDENT');
    });

    it('should validate session just before expiration', async () => {
      const session = await createSession(testUserId);

      // Set expiration to 1 second from now
      await prisma.session.update({
        where: { id: session.id },
        data: { expiresAt: new Date(Date.now() + 1000) },
      });

      const validatedSession = await validateSession(session.token!);

      expect(validatedSession).toBeDefined();
      expect(validatedSession?.id).toBe(session.id);
    });

    it('should validate session with different user roles', async () => {
      const roles = ['STUDENT', 'TEACHER', 'ADMIN', 'SYSTEM'] as const;

      for (const role of roles) {
        const user = await prisma.user.create({
          data: {
            id: `user-${role}`,
            name: `${role} User`,
            username: role.toLowerCase(),
            displayUsername: role,
            email: `${role.toLowerCase()}@example.com`,
            role,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        const session = await createSession(user.id);
        const validated = await validateSession(session.token!);

        expect(validated?.user.role).toBe(role);
      }
    });
  });

  describe('deleteSession', () => {
    it('should delete an existing session', async () => {
      const session = await createSession(testUserId);

      await deleteSession(session.token!);

      const dbSession = await prisma.session.findUnique({
        where: { token: session.token! },
      });

      expect(dbSession).toBeNull();
    });

    it('should not throw when deleting non-existent session', async () => {
      await expect(
        deleteSession('non-existent-token')
      ).resolves.not.toThrow();
    });

    it('should not throw when deleting already deleted session', async () => {
      const session = await createSession(testUserId);

      await deleteSession(session.token!);
      await expect(
        deleteSession(session.token!)
      ).resolves.not.toThrow();
    });

    it('should delete only the specified session', async () => {
      const session1 = await createSession(testUserId);
      const session2 = await createSession(testUserId);

      await deleteSession(session1.token!);

      const dbSession1 = await prisma.session.findUnique({
        where: { token: session1.token! },
      });
      const dbSession2 = await prisma.session.findUnique({
        where: { token: session2.token! },
      });

      expect(dbSession1).toBeNull();
      expect(dbSession2).toBeDefined();
    });

    it('should make deleted session unvalidatable', async () => {
      const session = await createSession(testUserId);

      await deleteSession(session.token!);

      const validated = await validateSession(session.token!);
      expect(validated).toBeNull();
    });
  });

  describe('Session Token Generation', () => {
    it('should generate cryptographically secure tokens', async () => {
      const session1 = await createSession(testUserId);
      const session2 = await createSession(testUserId);

      // Tokens should be hexadecimal strings
      expect(session1.token).toMatch(/^[0-9a-f]+$/);
      expect(session2.token).toMatch(/^[0-9a-f]+$/);

      // Tokens should be 64 characters (32 bytes * 2 for hex)
      expect(session1.token!.length).toBe(64);
      expect(session2.token!.length).toBe(64);
    });

    it('should generate unique tokens across many sessions', async () => {
      const sessions = await Promise.all(
        Array.from({ length: 10 }, () => createSession(testUserId))
      );

      const tokens = sessions.map(s => s.token);
      const uniqueTokens = new Set(tokens);

      expect(uniqueTokens.size).toBe(10);
    });
  });
});
