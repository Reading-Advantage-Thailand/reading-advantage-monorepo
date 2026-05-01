/**
 * Reusable Auth Module - Server-side Helpers
 * Copy this entire auth/ folder to any Next.js project
 */

import { redirect } from 'next/navigation';
import { getCurrentSession } from './session';
import { ROLE_HIERARCHY, ROLE_ROUTES } from './constants';
import type { Session, UserRole } from './types';

/**
 * Require authentication - redirect to login if not authenticated
 */
export async function requireAuth(): Promise<Session> {
  const session = await getCurrentSession();

  if (!session) {
    return redirect('/signin');
  }

  return session;
}

/**
 * Require specific role - redirect if user doesn't have required role level
 * Uses role hierarchy: higher roles can access lower role routes
 */
export async function requireRole(requiredRole: UserRole): Promise<Session> {
  const session = await requireAuth();

  const userLevel = ROLE_HIERARCHY[session.user.role];
  const requiredLevel = ROLE_HIERARCHY[requiredRole];

  if (userLevel < requiredLevel) {
    // User doesn't have sufficient permissions - redirect to their dashboard
    return redirect(ROLE_ROUTES[session.user.role] || '/signin');
  }

  return session;
}

/**
 * Check if user has specific role or higher
 */
export function hasRole(session: Session, requiredRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY[session.user.role];
  const requiredLevel = ROLE_HIERARCHY[requiredRole];

  return userLevel >= requiredLevel;
}

/**
 * Get current session (returns null if not authenticated, doesn't redirect)
 */
export async function getSession(): Promise<Session | null> {
  return getCurrentSession();
}
