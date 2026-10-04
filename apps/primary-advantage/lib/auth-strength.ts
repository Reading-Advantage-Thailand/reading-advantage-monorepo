import type { SessionAuthStrength } from "@reading-advantage/auth";

/**
 * Route prefixes that need a `full` session (spec Design 6). Nothing calls
 * `requiresFullAuth` yet: Lane F wires the Reedy routes and the profile page to this list.
 */
export const FULL_AUTH_ONLY_ROUTES: readonly string[] = [
  "/student/reedy",
  "/api/reedy",
  "/settings/user-profile",
];

/**
 * Tells whether a session may use a feature that needs full authentication.
 * @param session The current session, or null when nobody is signed in.
 * @returns True only when the session strength is `full`.
 */
export function canUseFullAuthFeature(
  session: { authStrength?: SessionAuthStrength } | null,
): boolean {
  return session?.authStrength === "full";
}

/**
 * Tells whether a path needs a `full` session.
 * @param pathname The request path without a locale prefix.
 * @returns True when the path equals or sits under a full-auth-only prefix.
 */
export function requiresFullAuth(pathname: string): boolean {
  return FULL_AUTH_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}
