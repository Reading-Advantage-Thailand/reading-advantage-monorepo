import { redirect } from 'next/navigation';
import { AuthError, ROLE_ROUTES, roleAtLeast, type Role, type Session } from '@reading-advantage/auth';
import { getCurrentSession } from './session';

/**
 * Require authentication - redirect to login if not authenticated.
 *
 * Intended for RSC / page rendering paths. For JSON API routes, use
 * {@link requireApiAuth} so a missing session returns a structured
 * 401 response instead of a Next.js redirect digest.
 */
export async function requireAuth(): Promise<Session> {
  const session = await getCurrentSession();
  if (!session) {
    return redirect('/signin');
  }
  return session;
}

/**
 * Require authentication inside a JSON API route.
 *
 * Throws {@link AuthError} with code `"UNAUTHORIZED"` if no session is present
 * so the route's `catch` block can return a structured JSON 401 response
 * (`{ error: "Authentication required" }`) instead of bubbling a
 * `NEXT_REDIRECT` digest that Next.js renders as a non-JSON redirect.
 *
 * @throws {AuthError} `"UNAUTHORIZED"` when no session is present.
 */
export async function requireApiAuth(): Promise<Session> {
  const session = await getCurrentSession();
  if (!session) {
    throw new AuthError('Authentication required', 'UNAUTHORIZED');
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
 * Require a role inside a JSON API route.
 *
 * Like {@link requireApiAuth}, throws {@link AuthError} instead of redirecting
 * when the caller lacks the required role so the route can return a typed
 * JSON 403 response.
 *
 * @throws {AuthError} `"UNAUTHORIZED"` when no session is present.
 * @throws {AuthError} `"FORBIDDEN"` when the session role is below the required role.
 */
export async function requireApiRole(requiredRole: Role): Promise<Session> {
  const session = await requireApiAuth();
  if (!roleAtLeast(session.user.role, requiredRole)) {
    throw new AuthError(`Requires role ${requiredRole} or higher`, 'FORBIDDEN');
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
