import { cookies } from 'next/headers';
import { eq } from '@reading-advantage/db';
import { db } from '@reading-advantage/db';
import { users } from '@reading-advantage/db/schema';
import {
  createSession as sharedCreateSession,
  validateSession as sharedValidateSession,
  deleteSession as sharedDeleteSession,
  SESSION_COOKIE_NAME,
} from '@reading-advantage/auth';
import type { Session } from './types';

const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60;

/**
 * Create a new session for a user (uses shared auth + Drizzle)
 */
export async function createSession(userId: string): Promise<Session> {
  const shared = await sharedCreateSession(db, userId);

  // Fetch full user data including email/image for local Session type
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      role: users.role,
      image: users.image,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return {
    id: shared.id,
    token: shared.token,
    userId: shared.userId,
    expiresAt: shared.expiresAt,
    user: user ?? {
      id: shared.user.id,
      name: shared.user.name,
      username: shared.user.username,
      email: null,
      role: shared.user.role,
      image: null,
    },
  };
}

/**
 * Validate a session token (uses shared auth + Drizzle)
 */
export async function validateSession(token: string): Promise<Session | null> {
  const shared = await sharedValidateSession(db, token);
  if (!shared) return null;

  // Fetch full user data including email/image for local Session type
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      role: users.role,
      image: users.image,
    })
    .from(users)
    .where(eq(users.id, shared.userId))
    .limit(1);

  if (!user) return null;

  return {
    id: shared.id,
    token: shared.token,
    userId: shared.userId,
    expiresAt: shared.expiresAt,
    user,
  };
}

/**
 * Delete a session (uses shared auth)
 */
export async function deleteSession(token: string): Promise<void> {
  await sharedDeleteSession(db, token);
}

/**
 * Set session cookie
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_SECONDS,
    path: '/',
  });
}

/**
 * Get session token from cookie
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
}

/**
 * Delete session cookie
 */
export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Get current session from cookie
 */
export async function getCurrentSession(): Promise<Session | null> {
  const token = await getSessionToken();
  if (!token) return null;
  return validateSession(token);
}
