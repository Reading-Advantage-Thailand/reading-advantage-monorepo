import { getTenantDB, getUnscopedDB } from "@reading-advantage/domain";

/**
 * Returns the database handle for license reads and writes.
 * SYSTEM manages licenses for every school, even when its own account has a
 * school; every other role stays inside its own school.
 * @param user The signed-in caller's role and school.
 * @param reason Greppable reason recorded for the unscoped SYSTEM access.
 * @returns The unscoped database for SYSTEM, otherwise the caller's tenant database.
 */
export function licenseDbFor(
  user: { role: string; schoolId?: string | null },
  reason: string,
) {
  return user.role === "SYSTEM"
    ? getUnscopedDB(reason)
    : getTenantDB({ schoolId: user.schoolId ?? null });
}
