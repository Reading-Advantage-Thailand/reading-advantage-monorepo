import { eq } from "drizzle-orm";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";
import { licenseOnUsers } from "@reading-advantage/db/schema";

/**
 * Lists all license associations for a given user. Users can view their own
 * licenses without a permission check; viewing others requires license:manage.
 *
 * @param db - Database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Must include `userId`
 * @returns Array of license-on-user association records
 */
export async function listUserLicenses({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { userId: string };
}) {
  if (input.userId !== user.id) {
    assertCan(user, "license:manage", tenant);
  }

  return db
    .unscoped("licenseOnUsers is REFERENTIAL, scoped via user/license FK")
    .select()
    .from(licenseOnUsers)
    .where(eq(licenseOnUsers.userId, input.userId));
}
