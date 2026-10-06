import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchUserArticleRecords } from "@/server/controllers/userController";
import { currentUser } from "@/lib/session";
import { eq } from 'drizzle-orm';
import { users } from '@reading-advantage/db/schema';
import { getTenantDB, getUnscopedDB } from "@reading-advantage/domain";
import { assertCan, AuthError } from "@reading-advantage/auth";
import { canReadUserResource } from "@/lib/authorization";

/** Query of the article records list; bad values fall back to the first page of 10. */
const recordsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(100).catch(10),
  search: z
    .string()
    .trim()
    .max(100)
    .optional()
    .catch(undefined)
    .transform((value) => value || undefined),
});

/**
 * Lists the article records (one row per article read) of a user for the history page, with
 * paging and a title search. The caller must be allowed to read that user (same school or SYSTEM).
 * @param request The request; query `page`, `limit`, `search`.
 * @param context The route params with the target user id.
 * @returns `{ success, data, pagination }`, or 401/403/500.
 */
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

    // This route used to return fetchUserActivity (activity, XP logs, and the full users row),
    // so the history table found no `data` and the response exposed user columns.
    const { searchParams } = new URL(request.url);
    const query = recordsQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });
    const records = await fetchUserArticleRecords({ userId: id, ...query });

    return NextResponse.json(records);
  } catch (error) {
    console.error("Error fetching article records:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
