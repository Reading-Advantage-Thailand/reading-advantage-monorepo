import { NextRequest, NextResponse } from "next/server";
import { fetchUserActivity } from "@/server/controllers/userController";
import { currentUser } from "@/lib/session";
import { eq } from 'drizzle-orm';
import { users } from '@reading-advantage/db/schema';
import { getTenantDB, getUnscopedDB } from "@reading-advantage/domain";
import { assertCan, AuthError } from "@reading-advantage/auth";
import { canReadUserResource } from "@/lib/authorization";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authorization decision via the central policy. Reading a user's records
    // is a user:read operation; the owner/school gate below still runs.
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

    const data = await fetchUserActivity(id);

    if (!data) {
      return NextResponse.json(
        { error: "User activity not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching user activity:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
