import { redirect } from "next/navigation";
import { Role } from "@/lib/enums";
import { getCurrentUser, SessionUser } from "@/lib/session";

/**
 * Returns the current user or redirects to sign in.
 * @returns The authenticated session user.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin");
  }
  return user;
}

/**
 * Redirects expired non-system users to the contact page.
 * @param user The authenticated session user.
 */
export function assertActiveSubscription(user: SessionUser): void {
  if (new Date(user.expired_date) < new Date() && user.role !== Role.SYSTEM) {
    redirect("/contact");
  }
}

/**
 * Requires an authenticated, unexpired user with one of the given roles.
 * @param roles The roles permitted to access the guarded route group.
 * @returns The authenticated session user.
 */
export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  assertActiveSubscription(user);
  if (!roles.includes(user.role)) {
    redirect("/");
  }
  return user;
}
