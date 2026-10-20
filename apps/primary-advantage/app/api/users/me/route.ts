import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { canUseFullAuthFeature } from "@/lib/auth-strength";
import { updateOwnDisplayNameBodySchema } from "@/lib/zod";
import { getTenantDB, getUnscopedDB, users as usersDomain } from "@reading-advantage/domain";
import { logger } from "@/lib/observability/logger";

/**
 * PATCH /api/users/me — the signed-in user changes their own display name.
 * Uses the session user only. Never changes `username` or `display_username`.
 * A `code_only` session gets 403 because profile changes need a `full` sign-in.
 * @param request The request with the JSON body `{ name }`.
 * @returns 200 with the new name, or 400, 401, 403, 404, or 500 with an `error` text.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    const user = session?.user;
    if (!session || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canUseFullAuthFeature(session)) {
      return NextResponse.json({ error: "Full sign-in required" }, { status: 403 });
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const parsed = updateOwnDisplayNameBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const tenant = { schoolId: user.schoolId ?? null };
    const db = user.schoolId
      ? getTenantDB(tenant)
      : getUnscopedDB("user without a school; self-record update by id");
    const updated = await usersDomain.updateUser({
      db: db as Parameters<typeof usersDomain.updateUser>[0]["db"],
      user,
      tenant,
      input: { id: user.id, name: parsed.data.name },
    });
    return NextResponse.json({ message: "Display name updated", name: updated.name }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.name === "UserNotFoundError") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    logger.error("user_display_name_update_failed", { error });
    return NextResponse.json({ error: "Failed to update display name" }, { status: 500 });
  }
}
