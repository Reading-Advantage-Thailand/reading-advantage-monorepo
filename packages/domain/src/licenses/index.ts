import { eq } from "drizzle-orm";
import { licenses, licenseOnUsers } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";

/**
 * Creates a new license key scoped to the current tenant (school), with
 * optional expiry date and type. Requires license:create permission.
 *
 * @param db - Database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Must include `key`, `schoolName`, `maxUsers`, and optional `licenseType` and `expiresAt`
 * @returns The newly created license record
 */
export async function createLicense({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { key: string; schoolName: string; maxUsers: number; licenseType?: string; expiresAt?: Date };
}) {
  assertCan(user, "license:create", tenant);

  const [created] = await db
    .insert(licenses)
    .values({
      key: input.key,
      schoolName: input.schoolName,
      maxUsers: input.maxUsers,
      licenseType: input.licenseType ?? "BASIC",
      schoolId: tenant.schoolId ?? undefined,
      expiresAt: input.expiresAt,
    })
    .returning();

  return created;
}

/**
 * Attaches a user to a license by creating a license-on-user association.
 * Requires license:manage permission.
 *
 * @param db - Database client
 * @param user - Authenticated user context
 * @param tenant - Tenant (school) scope
 * @param input - Must include `userId` and `licenseId`
 * @returns The newly created license-on-user association record
 */
export async function attachUserToLicense({
  db,
  user,
  tenant,
  input,
}: {
  db: TenantDB;
  user: UserContext;
  tenant: Tenant;
  input: { userId: string; licenseId: string };
}) {
  assertCan(user, "license:manage", tenant);

  const [created] = await db
    .insert(licenseOnUsers)
    .values({
      userId: input.userId,
      licenseId: input.licenseId,
    })
    .returning();

  return created;
}

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
    .select()
    .from(licenseOnUsers)
    .where(eq(licenseOnUsers.userId, input.userId));
}
