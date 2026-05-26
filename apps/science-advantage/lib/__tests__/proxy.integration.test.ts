import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { db, eq, sql } from '@reading-advantage/db';
import { sessions, users } from '@reading-advantage/db/schema';
import { createSession } from '@reading-advantage/auth';
import { NextRequest } from 'next/server';
import { proxy } from '../../proxy';

const FIXTURE_IDS = {
  student: 'proxy-itest-student',
  teacher: 'proxy-itest-teacher',
  admin: 'proxy-itest-admin',
};

async function cleanupFixtures(): Promise<void> {
  await db.execute(
    sql`DELETE FROM sessions WHERE user_id IN (${FIXTURE_IDS.student}, ${FIXTURE_IDS.teacher}, ${FIXTURE_IDS.admin})`
  );
  await db.execute(
    sql`DELETE FROM users WHERE id IN (${FIXTURE_IDS.student}, ${FIXTURE_IDS.teacher}, ${FIXTURE_IDS.admin})`
  );
}

async function seedUser(id: string, role: 'STUDENT' | 'TEACHER' | 'ADMIN'): Promise<string> {
  await db.insert(users).values({
    id,
    name: `Proxy Test ${role}`,
    username: id,
    displayUsername: id,
    email: `${id}@example.com`,
    role,
  });
  const session = await createSession(db, id);
  return session.token;
}

function createRequest(pathname: string, sessionToken?: string) {
  const url = new URL(pathname, 'http://localhost:3000');
  const req = new NextRequest(url);
  if (sessionToken) {
    req.cookies.set('session_token', sessionToken);
  }
  return req;
}

describe('proxy role enforcement (integration)', () => {
  beforeEach(async () => {
    await cleanupFixtures();
  });

  afterAll(async () => {
    await cleanupFixtures();
  });

  it('STUDENT cookie is rejected at /admin (FORBIDDEN -> /dashboard?error=forbidden)', async () => {
    const token = await seedUser(FIXTURE_IDS.student, 'STUDENT');

    const res = await proxy(createRequest('/admin', token));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/dashboard');
    expect(res.headers.get('location')).toContain('error=forbidden');
  });

  it('ADMIN cookie passes /admin', async () => {
    const token = await seedUser(FIXTURE_IDS.admin, 'ADMIN');

    const res = await proxy(createRequest('/admin/users', token));

    expect(res.status).toBe(200);
  });

  it('TEACHER cookie passes /student (hierarchy)', async () => {
    const token = await seedUser(FIXTURE_IDS.teacher, 'TEACHER');

    const res = await proxy(createRequest('/student/lessons', token));

    expect(res.status).toBe(200);
  });

  it('STUDENT cookie is rejected at /teacher (FORBIDDEN)', async () => {
    const token = await seedUser(FIXTURE_IDS.student, 'STUDENT');

    const res = await proxy(createRequest('/teacher', token));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/dashboard');
    expect(res.headers.get('location')).toContain('error=forbidden');
  });

  it('expired/missing session token is cleared and user is redirected to /signin', async () => {
    const res = await proxy(createRequest('/admin', 'nonexistent-token-12345'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/signin');
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toMatch(/session_token=;.*Max-Age=0/i);
  });

  it('valid session token at /signin is redirected to /dashboard', async () => {
    const token = await seedUser(FIXTURE_IDS.student, 'STUDENT');

    const res = await proxy(createRequest('/signin', token));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/dashboard');
  });
});
