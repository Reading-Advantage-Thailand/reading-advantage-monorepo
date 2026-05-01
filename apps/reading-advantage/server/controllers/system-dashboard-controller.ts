import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { requireRole } from "@/server/middleware/guards";

export async function getSystemDashboard(req: NextRequest) {
  try {
    // Use the new guard system
    const authResult = await requireRole([Role.SYSTEM])(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Define the levels array
    const levels = [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
    ];

    // Initialize the result object
    const articlesByLevel: { [key: string]: number } = {};

    // Build the where clause for date filtering
    const whereClause: any = {};
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setDate(start.getDate() - 1);
        start.setHours(23, 59, 59, 999);
        whereClause.createdAt.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = end;
      }
    }

    // Get article counts for each level
    for (const level of levels) {
      try {
        const count = await prisma.article.count({
          where: {
            raLevel: level,
            ...whereClause,
          },
        });
        articlesByLevel[level] = count;
      } catch (error) {
        console.error(`Error fetching count for level ${level}`, error);
        articlesByLevel[level] = 0;
      }
    }

    return NextResponse.json(
      {
        data: articlesByLevel,
        dataRange: {
          start_date: startDate,
          end_date: endDate,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching system dashboard data:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
