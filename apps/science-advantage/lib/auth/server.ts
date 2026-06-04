import { redirect } from 'next/navigation';
import { getCurrentSession } from './session';
import { ROLE_ROUTES, roleAtLeast, type Role } from '@reading-advantage/auth';
import type { Session } from '@reading-advantage/auth';

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
 */
export async function requireRole(requiredRole: Role): Promise<Session> {
  const session = await requireAuth();
  if (!roleAtLeast(session.user.role, requiredRole)) {
    return redirect(ROLE_ROUTES[session.user.role] || '/signin');
  }
  return session;
}

/**
 * Check if user has specific role or higher
 */
export function hasRole(session: Session, requiredRole: Role): boolean {
  return roleAtLeast(session.user.role, requiredRole);
}

/**
 * Get current session (returns null if not authenticated, doesn't redirect)
 */
export async function getSession(): Promise<Session | null> {
  return getCurrentSession();
}
