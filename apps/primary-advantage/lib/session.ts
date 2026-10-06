import { cookies } from "next/headers";
import { db } from "@reading-advantage/db";
import { validateSession, SESSION_COOKIE_NAME } from "@reading-advantage/auth";

/**
 * Reads the validated session from the session cookie.
 * @returns The session with its user and `authStrength`, or null when absent or invalid.
 */
export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  return validateSession(db, token);
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

export const currentUser = getCurrentUser;

export async function currentRole() {
  const user = await getCurrentUser();
  return user?.role ?? null;
}
