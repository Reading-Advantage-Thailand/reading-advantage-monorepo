import { z } from "zod";
import { recordAuditEvent } from "@reading-advantage/auth";
import { logger } from "@/lib/observability/logger";
import { resolveCreationSchoolId } from "@/server/utils/auth";

/** Form field `schoolId` of an import upload: an optional UUID string. */
export const importSchoolFieldSchema = z.string().uuid().optional();

/** The part of the session user that picks the import school. */
export interface ImportCaller {
  id: string;
  role?: string | null;
  schoolId?: string | null;
}

/**
 * Picks the school that receives the rows of an import. A SYSTEM caller must send
 * a `schoolId` form value of an existing school. Every other role gets the school of the
 * session, and the form value is ignored.
 * @param authUser The verified session user.
 * @param formSchoolId The raw `schoolId` form value, if any.
 * @returns The school id, or an error message for a response with status 400.
 */
export async function resolveImportSchool(
  authUser: ImportCaller,
  formSchoolId: unknown,
): Promise<{ schoolId: string } | { error: string }> {
  if (String(authUser.role ?? "").toUpperCase() !== "SYSTEM") {
    return authUser.schoolId
      ? { schoolId: authUser.schoolId }
      : { error: "School association required" };
  }
  if (formSchoolId === undefined || formSchoolId === null || formSchoolId === "") {
    return { error: "School selection required" };
  }
  const parsed = importSchoolFieldSchema.safeParse(formSchoolId);
  if (!parsed.success || !parsed.data) return { error: "School not found" };
  const resolved = await resolveCreationSchoolId(
    { schoolId: authUser.schoolId ?? null, role: "SYSTEM", roles: [], SchoolAdmins: [] },
    parsed.data,
  );
  if ("error" in resolved || !resolved.schoolId) return { error: "School not found" };
  return { schoolId: resolved.schoolId };
}

/**
 * Records the audit event of a SYSTEM import. A failed audit write is logged and does not
 * fail the import, which already committed.
 * @param authUser The SYSTEM session user.
 * @param schoolId The target school of the import.
 * @param details The file name and the row counts.
 */
export async function recordSystemImportAudit(
  authUser: ImportCaller,
  schoolId: string,
  details: { fileName: string; counts: Record<string, number> },
): Promise<void> {
  if (String(authUser.role ?? "").toUpperCase() !== "SYSTEM") return;
  try {
    await recordAuditEvent(
      { actorUserId: authUser.id, actorRole: "SYSTEM", ipAddress: null, userAgent: null },
      { action: "import:system", targetType: "school", targetId: schoolId, metadata: details },
    );
  } catch (error) {
    logger.error("system_import_audit_failed", { message: error instanceof Error ? error.message : "Unknown" });
  }
}
