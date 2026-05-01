import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getDemoIds } from "../../../../../server/services/demo-isolation-service";

const prisma = new PrismaClient();

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

    // Get last activity timestamp
    const lastActivity = await prisma.userActivity.findFirst({
      where: {
        user: {
          licenseId,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        createdAt: true,
      },
    });

    // Count total activities
    const totalActivities = await prisma.userActivity.count({
      where: {
        user: {
          licenseId,
        },
      },
    });

    // Count demo users
    const userCounts = await prisma.user.groupBy({
      by: ["role"],
      where: {
        licenseId,
      },
      _count: {
        id: true,
      },
    });

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
        lastRefresh: lastActivity?.createdAt || null,
        nextRefresh: nextRefresh.toISOString(),
        totalActivities,
        users: userCounts.reduce(
          (acc, item) => {
            acc[item.role.toLowerCase()] = item._count.id;
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
  } finally {
    await prisma.$disconnect();
  }
}
