/**
 * Reusable Auth Module - Session Management
 * Copy this entire auth/ folder to any Next.js project
 */

import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import prisma from '@/lib/prisma';
import type { Session } from './types';

const SESSION_COOKIE_NAME = 'session_token';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Generate a secure random session token
 */
function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Create a new session for a user
 */
export async function createSession(userId: string): Promise<Session> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt,
      token,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          image: true,
        },
      },
    },
  });

  return {
    id: session.id,
    token: session.token,
    userId: session.userId,
    expiresAt: session.expiresAt,
    user: session.user,
  };
}

/**
 * Validate a session token and return the session
 */
export async function validateSession(token: string): Promise<Session | null> {
  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          image: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  // Check if session is expired
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  return {
    id: session.id,
    userId: session.userId,
    expiresAt: session.expiresAt,
    user: session.user,
  };
}

/**
 * Delete a session
 */
export async function deleteSession(token: string): Promise<void> {
  await prisma.session.delete({ where: { token } }).catch(() => {});
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
    maxAge: SESSION_DURATION / 1000, // Convert to seconds
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
  if (!token) {
    return null;
  }
  return validateSession(token);
}
