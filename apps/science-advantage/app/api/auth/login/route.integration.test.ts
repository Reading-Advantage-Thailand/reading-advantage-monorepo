import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import type { user as UserModel } from '@prisma/client';
import { POST } from './route';
import { hashPassword } from '@/lib/auth/password';

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  })),
}));

describe('POST /api/auth/login - Integration Tests', () => {
  let testUser: UserModel;

  beforeEach(async () => {
    // Clean up
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();

    // Create test user with password
    testUser = await prisma.user.create({
      data: {
        id: 'test-login-user',
        name: 'Test Login User',
        username: 'testlogin',
        displayUsername: 'TestLogin',
        email: 'testlogin@example.com',
        role: 'STUDENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create account with hashed password
    await prisma.account.create({
      data: {
        id: 'test-account',
        accountId: 'credential-account',
        providerId: 'credential',
        userId: testUser.id,
        password: await hashPassword('testPassword123'),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  });

  afterEach(async () => {
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('Successful Login', () => {
    it('should login successfully with correct credentials', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'testlogin',
          password: 'testPassword123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.username).toBe('testlogin');
      expect(data.user.role).toBe('STUDENT');
      expect(data.user.id).toBe(testUser.id);
    });

    it('should create a session in database on successful login', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'testlogin',
          password: 'testPassword123',
        }),
      });

      await POST(request);

      const sessions = await prisma.session.findMany({
        where: { userId: testUser.id },
      });

      expect(sessions.length).toBe(1);
      expect(sessions[0].userId).toBe(testUser.id);
    });

    it('should handle case-insensitive username', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'TESTLOGIN',
          password: 'testPassword123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.username).toBe('testlogin');
    });

    it('should login users with different roles', async () => {
      const roles = ['TEACHER', 'ADMIN', 'SYSTEM'] as const;

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

        await prisma.account.create({
          data: {
            id: `account-${role}`,
            accountId: `${role.toLowerCase()}-credential`,
            providerId: 'credential',
            userId: user.id,
            password: await hashPassword('testPassword123'),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        const request = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            username: role.toLowerCase(),
            password: 'testPassword123',
          }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.user.role).toBe(role);
      }
    });
  });

  describe('Validation', () => {
    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'testlogin' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Username and password are required');
    });

    it('should handle missing body', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('An error occurred during login');
    });

    it('should reject incorrect password', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'testlogin',
          password: 'wrongPassword',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid username or password');
    });

    it('should reject non-existent user', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'nonexistent',
          password: 'wrongPassword',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid username or password');
    });

    it('should reject user without credential account', async () => {
      const noAccountUser = await prisma.user.create({
        data: {
          id: 'no-account-user',
          name: 'No Account User',
          username: 'noaccount',
          displayUsername: 'NoAccount',
          email: 'noaccount@example.com',
          role: 'STUDENT',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: noAccountUser.username,
          password: 'anyPassword',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid username or password');
    });

    it('should reject credential account without password', async () => {
      const noPasswordUser = await prisma.user.create({
        data: {
          id: 'no-password-user',
          name: 'No Password User',
          username: 'nopassword',
          displayUsername: 'NoPassword',
          email: 'nopassword@example.com',
          role: 'STUDENT',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await prisma.account.create({
        data: {
          id: 'no-password-account',
          accountId: 'credential-no-password',
          providerId: 'credential',
          userId: noPasswordUser.id,
          password: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'nopassword',
          password: 'anyPassword',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid username or password');
    });
  });

  describe('Security', () => {
    it('should not expose user data on failed login', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'testlogin',
          password: 'wrongPassword',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.user).toBeUndefined();
      expect(data.session).toBeUndefined();
    });

    it('should use same error message for non-existent user and wrong password', async () => {
      const wrongPasswordRequest = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'testlogin',
          password: 'wrongPassword',
        }),
      });

      const nonExistentRequest = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'nonexistent',
          password: 'anyPassword',
        }),
      });

      const response1 = await POST(wrongPasswordRequest);
      const data1 = await response1.json();

      const response2 = await POST(nonExistentRequest);
      const data2 = await response2.json();

      expect(data1.error).toBe(data2.error);
      expect(response1.status).toBe(response2.status);
    });
  });

  describe('Response Format', () => {
    it('should return user data without sensitive fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'testlogin',
          password: 'testPassword123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.user).toBeDefined();
      expect(data.user.id).toBeDefined();
      expect(data.user.name).toBeDefined();
      expect(data.user.username).toBeDefined();
      expect(data.user.email).toBeDefined();
      expect(data.user.role).toBeDefined();

      // Should not include password or account data
      expect(data.user.password).toBeUndefined();
      expect(data.user.account).toBeUndefined();
    });

    it('should handle malformed JSON request', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('An error occurred during login');
    });
  });
});
