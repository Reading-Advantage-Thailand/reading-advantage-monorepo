import { redirect } from 'next/navigation';
import { getCurrentSession } from './session';
import { ROLES, ROLE_ROUTES, roleAtLeast } from '@reading-advantage/auth';
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
 */
export async function requireRole(requiredRole: UserRole): Promise<Session> {
  const session = await requireAuth();
  if (!roleAtLeast(session.user.role, requiredRole)) {
    return redirect(ROLE_ROUTES[session.user.role] || '/signin');
  }
  return session;
}

/**
 * Check if user has specific role or higher
 */
export function hasRole(session: Session, requiredRole: UserRole): boolean {
  return roleAtLeast(session.user.role, requiredRole);
}

/**
 * Get current session (returns null if not authenticated, doesn't redirect)
 */
export async function getSession(): Promise<Session | null> {
  return getCurrentSession();
}
