import { NextResponse } from "next/server";
import { db, eq, desc, count } from "@reading-advantage/db";
import { users, userActivity } from "@reading-advantage/db/schema";
import { getDemoIds } from "../../../../../server/services/demo-isolation-service";

/**
 * GET /api/v1/demo/status
 * Returns demo system status
 */
export async function GET() {
  try {
    // Get demo IDs
    const demoIds = await getDemoIds();

    if (!demoIds) {
      return NextResponse.json(
        {
          success: false,
          error: "Demo system not initialized. Please run demo seed first.",
        },
        { status: 404 }
      );
    }

    const { licenseId, schoolId } = demoIds;

    // Get last activity timestamp (most recent activity for any user with this license)
    const lastActivityRows = await db
      .select({ createdAt: userActivity.createdAt })
      .from(userActivity)
      .innerJoin(users, eq(users.id, userActivity.userId))
      .where(eq(users.licenseId, licenseId))
      .orderBy(desc(userActivity.createdAt))
      .limit(1);
    const lastActivity = lastActivityRows[0] ?? null;

    // Count total activities for users with this license
    const totalActivitiesRows = await db
      .select({ value: count() })
      .from(userActivity)
      .innerJoin(users, eq(users.id, userActivity.userId))
      .where(eq(users.licenseId, licenseId));
    const totalActivities = Number(totalActivitiesRows[0]?.value ?? 0);

    // Count demo users grouped by role
    const userCounts = await db
      .select({ role: users.role, count: count() })
      .from(users)
      .where(eq(users.licenseId, licenseId))
      .groupBy(users.role);

    // Calculate next refresh time (daily at 02:00 UTC)
    const now = new Date();
    const nextRefresh = new Date(now);
    nextRefresh.setUTCHours(2, 0, 0, 0);
    if (nextRefresh <= now) {
      nextRefresh.setUTCDate(nextRefresh.getUTCDate() + 1);
    }

    return NextResponse.json({
      success: true,
      data: {
        licenseId,
        schoolId,
        lastRefresh: lastActivity?.createdAt ?? null,
        nextRefresh: nextRefresh.toISOString(),
        totalActivities,
        users: userCounts.reduce(
          (acc, item) => {
            acc[item.role.toLowerCase()] = Number(item.count);
            return acc;
          },
          {} as Record<string, number>
        ),
        isolationStatus: "OK", // This would need actual isolation check
      },
      message: "Demo status retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching demo status:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch demo status",
      },
      { status: 500 }
    );
  }
}
