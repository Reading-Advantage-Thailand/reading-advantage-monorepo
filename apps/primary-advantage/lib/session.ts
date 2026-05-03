import { cookies } from "next/headers";
import { db } from "@reading-advantage/db";
import { validateSession, SESSION_COOKIE_NAME } from "@reading-advantage/auth";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await validateSession(db, token);
  if (!session) return null;

  return session.user;
}

export const currentUser = getCurrentUser;

export async function currentRole() {
  const user = await getCurrentUser();
  return user?.role ?? null;
}
