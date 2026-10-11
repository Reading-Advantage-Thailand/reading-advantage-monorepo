import { NextRequest, NextResponse } from "next/server";
import { fetchUserActivity } from "@/server/controllers/userController";
import { currentUser } from "@/lib/session";
import { eq } from 'drizzle-orm';
import { users } from '@reading-advantage/db/schema';
import { getTenantDB, getUnscopedDB } from "@reading-advantage/domain";
import { assertCan, AuthError } from "@reading-advantage/auth";
import { canReadUserResource } from "@/lib/authorization";
import { logger } from "@/lib/observability/logger";

/**
 * Reads the activity rows and XP logs of a user for the teacher per-student report. The caller
 * must be allowed to read that user (the user, same-school staff, or SYSTEM), as for the article
 * records route. The response has only these two lists, never the users row.
 * @param _request The request.
 * @param context The route params with the target user id.
 * @returns `{ activity, xpLogs }`, or 401/403/500.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      assertCan(user, "user:read", { schoolId: user.schoolId ?? null });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      throw error;
    }

    const { id } = await params;
    const tenantDb = getTenantDB({ schoolId: user.schoolId ?? null });
    // SYSTEM has no schoolId; TenantDB fails closed on FLAT tables, so the
    // target lookup runs through unscoped for SYSTEM callers.
    const usersDb = user.schoolId
      ? tenantDb
      : getUnscopedDB("SYSTEM has no schoolId; resolve target user by id");
    const [target] = await usersDb.select({ id: users.id, schoolId: users.schoolId })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (
      !target ||
      !canReadUserResource(
        { id: user.id, role: user.role, schoolId: user.schoolId },
        { id: target.id, schoolId: target.schoolId },
      )
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await fetchUserActivity(id);
    if (!result) {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    return NextResponse.json({ activity: result.activity, xpLogs: result.xpLogs });
  } catch (error) {
    logger.error("user_activity_read_failed", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
