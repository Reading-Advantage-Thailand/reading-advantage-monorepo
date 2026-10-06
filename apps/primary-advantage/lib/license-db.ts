import { eq } from "drizzle-orm";
import { schools } from "@reading-advantage/db/schema";
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves the school fields of a license insert or update.
 * SYSTEM picks the school (or none), and the school must exist. Every other
 * role keeps its own school: its client schoolId is ignored and the tenant
 * scope applies. licenses.school_name is NOT NULL, so it follows the school.
 * @param db The handle from licenseDbFor for the same caller.
 * @param user The signed-in caller's role and school.
 * @param requestedSchoolId The schoolId from the request body.
 * @returns The fields to write, or null when SYSTEM names a school that does not exist.
 */
export async function licenseSchoolFields(
  db: ReturnType<typeof licenseDbFor>,
  user: { role: string; schoolId?: string | null },
  requestedSchoolId: string | null | undefined,
): Promise<{ schoolId?: string | null; schoolName: string } | null> {
  const isSystem = user.role === "SYSTEM";
  const targetSchoolId = isSystem ? requestedSchoolId || null : (user.schoolId ?? null);
  let schoolName = "";
  if (targetSchoolId) {
    // A malformed id would make the uuid cast fail with a 500; treat it as unknown.
    if (!UUID.test(targetSchoolId)) return null;
    const [school] = await db
      .select({ name: schools.name })
      .from(schools)
      .where(eq(schools.id, targetSchoolId))
      .limit(1);
    if (!school) return null;
    schoolName = school.name ?? "";
  }
  return isSystem ? { schoolId: targetSchoolId, schoolName } : { schoolName };
}
