import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { currentUser } from "@/lib/session";
import { normalizeRole } from "./authorization";

/**
 * Asserts the signed-in user holds one layout role, else redirects.
 * @param allowedRoles The uppercase session roles admitted to the layout.
 */
export async function assertLayoutRole(
  allowedRoles: readonly string[],
): Promise<void> {
  const user = await currentUser();
  const locale = await getLocale();
  if (!user) {
    redirect(`/${locale}/auth/signin`);
  }
  if (!allowedRoles.includes(normalizeRole(user.role))) {
    redirect(`/${locale}/unauthorized`);
  }
}
