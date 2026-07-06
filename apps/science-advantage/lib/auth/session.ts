import { cookies } from 'next/headers';
import { db } from '@reading-advantage/db';
import {
  getSession as sharedGetSession,
  createSession as sharedCreateSession,
  SESSION_COOKIE_NAME,
} from '@reading-advantage/auth';
import type { Session, CreateSessionResult } from '@reading-advantage/auth';
import { env } from '@/lib/env';
import { setRequestContextUserId } from '@/lib/observability/context';

const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60;

export { SESSION_COOKIE_NAME };

/**
 * Create a new session for a user (delegates to shared auth with local db).
 *
 * Exempted from the SP-3 TenantDB-adoption guard: the `sessions` table is
 * registered as EXEMPT in `packages/domain/src/tenant-registry.ts` (auth
 * infrastructure is intentionally global — sessions are not school-scoped).
 * The raw `db` import is the documented bypass for this EXEMPT table.
 */
export async function createSession(userId: string): Promise<CreateSessionResult> {
  return sharedCreateSession(db, userId);
}

/**
 * Set session cookie.
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_SECONDS,
    path: '/',
  });
}

/**
 * Get session token from cookie.
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
}

/**
 * Delete session cookie.
 */
export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Get current session from cookie (Next.js convenience wrapper).
 */
export async function getCurrentSession(): Promise<Session | null> {
  const token = await getSessionToken();
  const session = await sharedGetSession(db, token ?? undefined);
  if (session) {
    setRequestContextUserId(session.user.id);
  }
  return session;
}