import { eq } from "drizzle-orm";
import { licenses, licenseOnUsers } from "@reading-advantage/db/schema";
import { assertCan, type UserContext, type Tenant } from "@reading-advantage/auth";
import type { TenantDB } from "../db-contract.js";

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
