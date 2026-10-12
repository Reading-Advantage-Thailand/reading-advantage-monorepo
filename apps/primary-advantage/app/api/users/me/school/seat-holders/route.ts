import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@reading-advantage/db";
import { licenses } from "@reading-advantage/domain";
import { AuthError } from "@reading-advantage/auth";
import { getCurrentUser } from "@/lib/session";
import { logger } from "@/lib/observability/logger";

const pageSchema = z.coerce.number().int().min(1);

/**
 * GET /api/users/me/school/seat-holders?page=N lists 50 students of the caller's school (school admins only).
 * @param request The request with an optional `page` query (default 1).
 * @returns 200 with the page, 400 for a bad page or a caller without a school, 401 without a session, 403 for a non-admin.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const page = pageSchema.safeParse(new URL(request.url).searchParams.get("page") ?? "1");
    if (!page.success) return NextResponse.json({ error: "Invalid page" }, { status: 400 });
    if (!user.schoolId) return NextResponse.json({ error: "School association required" }, { status: 400 });
    const result = await licenses.listSeatHolders({ db, user, schoolId: user.schoolId, page: page.data });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    logger.error("seat_holders_failed", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
