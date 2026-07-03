import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db, sql } from '@reading-advantage/db';
import { users, accounts, loginAttempts } from '@reading-advantage/db/schema';
import { handleLogin } from '@reading-advantage/api/routes/auth';
import { hashPassword } from '@reading-advantage/auth';

const TEST_PREFIX = 'rate-limit-login-itest';
const TEST_IP = '203.0.113.1';
const TEST_PASSWORD = 'correct-horse-battery-staple';

function loginRequest(username: string, password: string, ip: string) {
  return new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
    },
  });
}

async function cleanupFixtures(): Promise<void> {
  await db.delete(loginAttempts);
  await db.execute(sql`DELETE FROM sessions WHERE user_id LIKE ${`${TEST_PREFIX}-%`}`);
  await db.execute(sql`DELETE FROM accounts WHERE user_id LIKE ${`${TEST_PREFIX}-%`}`);
  await db.execute(sql`DELETE FROM users WHERE id LIKE ${`${TEST_PREFIX}-%`}`);
}

async function seedUser(id: string, username: string, password: string) {
  const [user] = await db
    .insert(users)
    .values({
      id,
      name: username,
      username,
      displayUsername: username,
      email: `${username}@example.com`,
      role: 'STUDENT',
    })
    .returning();

  await db.insert(accounts).values({
    id: `${id}-account`,
    userId: user.id,
    providerId: 'credential',
    password: await hashPassword(password),
  });

  return user;
}

describe('POST /api/auth/login — rate limiting (integration)', () => {
  beforeEach(async () => {
    await cleanupFixtures();
  });

  afterEach(async () => {
    await cleanupFixtures();
  });

  it('blocks the 6th failed login for the same username from the same IP', async () => {
    const username = `${TEST_PREFIX}-user-6th`;

    for (let i = 0; i < 5; i += 1) {
      const res = await handleLogin(loginRequest(username, 'wrong-password', TEST_IP));
      expect(res.status).toBe(401);
    }

    const blocked = await handleLogin(loginRequest(username, 'wrong-password', TEST_IP));
    expect(blocked.status).toBe(429);
  });

  it('blocks the 31st failed login from the same IP for different usernames', async () => {
    for (let i = 0; i < 30; i += 1) {
      const username = `${TEST_PREFIX}-ip-user-${i}`;
      const res = await handleLogin(loginRequest(username, 'wrong-password', TEST_IP));
      expect(res.status).toBe(401);
    }

    const blocked = await handleLogin(
      loginRequest(`${TEST_PREFIX}-ip-user-30`, 'wrong-password', TEST_IP),
    );
    expect(blocked.status).toBe(429);
  });

  it('resets the per-username counter after a successful login', async () => {
    const username = `${TEST_PREFIX}-user-reset`;
    await seedUser(`${TEST_PREFIX}-student`, username, TEST_PASSWORD);

    for (let i = 0; i < 4; i += 1) {
      const res = await handleLogin(loginRequest(username, 'wrong-password', TEST_IP));
      expect(res.status).toBe(401);
    }

    const success = await handleLogin(loginRequest(username, TEST_PASSWORD, TEST_IP));
    expect(success.status).toBe(200);

    const afterReset = await handleLogin(loginRequest(username, 'wrong-password', TEST_IP));
    expect(afterReset.status).toBe(401);
    expect(afterReset.status).not.toBe(429);
  });

  it('includes captchaRequired: true after the 4th failed login', async () => {
    const username = `${TEST_PREFIX}-user-captcha`;

    for (let i = 0; i < 3; i += 1) {
      const res = await handleLogin(loginRequest(username, 'wrong-password', TEST_IP));
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.captchaRequired).not.toBe(true);
    }

    const fourth = await handleLogin(loginRequest(username, 'wrong-password', TEST_IP));
    expect(fourth.status).toBe(401);
    const body = await fourth.json();
    expect(body.captchaRequired).toBe(true);
  });
});
