import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { eq, desc } from 'drizzle-orm';
import { auditEvents, users } from '@reading-advantage/db/schema';
import { getTenantDB, getUnscopedDB } from '@reading-advantage/domain';
import { assertCan, AuthError } from '@reading-advantage/auth';

/** Activity type rendered by the admin recent-activity panel. */
type ActivityType =
  | "user_created"
  | "article_created"
  | "class_created"
  | "teacher_added"
  | "system_update";

/** One recent-activity row returned to the admin panel. */
interface RecentActivityItem {
  id: string;
  type: ActivityType;
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
  description: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/** Query params accepted by GET /api/admin/recent-activity. */
const recentActivityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

/**
 * Maps an audit action string to the panel's activity type.
 * @param action The audit event action, for example "auth:login".
 * @returns The closest panel activity type, defaulting to system_update.
 */
function mapActionToType(action: string): ActivityType {
  if (
    action.includes("user_created") ||
    action.includes("account_created") ||
    action.includes("register")
  ) {
    return "user_created";
  }
  if (action.includes("article")) return "article_created";
  if (action.includes("class")) return "class_created";
  if (action.includes("teacher")) return "teacher_added";
  return "system_update";
}

/**
 * Builds a human-readable description from an audit event.
 * @param action The audit event action, for example "auth:login".
 * @param targetType The audited resource type, or null.
 * @param targetId The audited resource id, or null.
 * @returns A capitalized description, with the target appended when present.
 */
function describeAction(
  action: string,
  targetType: string | null,
  targetId: string | null,
): string {
  const humanized = action.replace(/[:_]/g, " ").replace(/\s+/g, " ").trim();
  const label = humanized.charAt(0).toUpperCase() + humanized.slice(1);
  if (targetType && targetId) {
    return `${label} (${targetType} ${targetId})`;
  }
  return label;
}

/**
 * Returns the most recent audit events for the admin dashboard panel.
 * @param request The incoming GET request with an optional limit query param.
 * @returns A JSON response with the activities array, or an error response.
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authorization decision via the central policy (replaces the inline
    // isAdminOrSystem gate). Runs before any DB read so denied callers issue
    // no queries.
    try {
      assertCan(currentUser, "admin:dashboard", { schoolId: currentUser.schoolId ?? null });
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      throw error;
    }

    const parsed = recentActivityQuerySchema.safeParse({
      limit: new URL(request.url).searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters" },
        { status: 400 },
      );
    }

    // audit_events is intentionally global (EXEMPT); ADMIN/SYSTEM may read it.
    const tenantDb = getTenantDB({ schoolId: currentUser.schoolId ?? null });
    const rows = await tenantDb
      .unscoped("audit_events is EXEMPT by design; ADMIN/SYSTEM may read it")
      .select({
        id: auditEvents.id,
        action: auditEvents.action,
        targetType: auditEvents.targetType,
        targetId: auditEvents.targetId,
        metadata: auditEvents.metadata,
        createdAt: auditEvents.createdAt,
        actorName: users.name,
        actorEmail: users.email,
        actorImage: users.image,
      })
      .from(auditEvents)
      .leftJoin(users, eq(users.id, auditEvents.actorUserId))
      .orderBy(desc(auditEvents.createdAt))
      .limit(parsed.data.limit);

    const activities: RecentActivityItem[] = rows.map((row) => ({
      id: row.id,
      type: mapActionToType(row.action),
      user: {
        name: row.actorName ?? "System",
        email: row.actorEmail ?? "",
        ...(row.actorImage ? { avatar: row.actorImage } : {}),
      },
      description: describeAction(row.action, row.targetType, row.targetId),
      timestamp: row.createdAt,
      ...(row.metadata ? { metadata: row.metadata } : {}),
    }));

    return NextResponse.json({ activities });
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}