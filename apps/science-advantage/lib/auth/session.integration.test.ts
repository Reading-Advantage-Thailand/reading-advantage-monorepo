import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db, eq } from '@reading-advantage/db';
import { users, sessions, accounts } from '@reading-advantage/db/schema';
import {
  createSession,
  validateSession,
  deleteSession,
} from './session';

type UserRow = typeof users.$inferSelect;

async function cleanupAuthFixtures(): Promise<void> {
  await db.delete(sessions);
  await db.delete(accounts);
  await db.delete(users);
}

describe('Session Management', () => {
  let testUserId: string;

  beforeEach(async () => {
    await cleanupAuthFixtures();

    const [user] = await db
      .insert(users)
      .values({
        id: 'test-user-session',
        name: 'Test User',
        username: 'testuser',
        displayUsername: 'TestUser',
        email: 'test@example.com',
        role: 'STUDENT',
      })
      .returning();

    testUserId = user.id;
  });

  afterEach(async () => {
    await cleanupAuthFixtures();
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

      const [dbSession] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.token, session.token!))
        .limit(1);

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

      const rows = await db
        .select()
        .from(sessions)
        .where(eq(sessions.userId, testUserId));

      expect(rows.length).toBe(2);
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

      await db
        .update(sessions)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(sessions.id, session.id));

      const validatedSession = await validateSession(session.token!);

      expect(validatedSession).toBeNull();

      const [dbSession] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, session.id))
        .limit(1);

      expect(dbSession).toBeUndefined();
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

      await db
        .update(sessions)
        .set({ expiresAt: new Date(Date.now() + 1000) })
        .where(eq(sessions.id, session.id));

      const validatedSession = await validateSession(session.token!);

      expect(validatedSession).toBeDefined();
      expect(validatedSession?.id).toBe(session.id);
    });

    it('should validate session with different user roles', async () => {
      const roles = ['STUDENT', 'TEACHER', 'ADMIN', 'SYSTEM'] as const;

      for (const role of roles) {
        const [user] = await db
          .insert(users)
          .values({
            id: `user-${role}`,
            name: `${role} User`,
            username: role.toLowerCase(),
            displayUsername: role,
            email: `${role.toLowerCase()}@example.com`,
            role,
          })
          .returning();

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

      const [dbSession] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.token, session.token!))
        .limit(1);

      expect(dbSession).toBeUndefined();
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

      const [dbSession1] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.token, session1.token!))
        .limit(1);
      const [dbSession2] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.token, session2.token!))
        .limit(1);

      expect(dbSession1).toBeUndefined();
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

      expect(session1.token).toMatch(/^[0-9a-f]+$/);
      expect(session2.token).toMatch(/^[0-9a-f]+$/);

      expect(session1.token!.length).toBe(64);
      expect(session2.token!.length).toBe(64);
    });

    it('should generate unique tokens across many sessions', async () => {
      const created: Awaited<ReturnType<typeof createSession>>[] = [];
      for (let i = 0; i < 10; i++) {
        // Sequential to keep insert ordering deterministic in single-fork pool
        created.push(await createSession(testUserId));
      }

      const tokens = created.map((s) => s.token);
      const uniqueTokens = new Set(tokens);

      expect(uniqueTokens.size).toBe(10);
    });
  });

});
