import { NextRequest, NextResponse } from "next/server";
import { db, eq, and, gte, lte, sql } from "@reading-advantage/db";
import { articles } from "@reading-advantage/db/schema";
import { requireRole } from "@/server/middleware/guards";

export async function getSystemDashboard(req: NextRequest) {
  try {
    const authResult = await requireRole(["SYSTEM"] as any)(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    const articlesByLevel: { [key: string]: number } = {};

    let startFilter: Date | undefined;
    let endFilter: Date | undefined;
    if (startDate) {
      const start = new Date(startDate);
      start.setDate(start.getDate() - 1);
      start.setHours(23, 59, 59, 999);
      startFilter = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      endFilter = end;
    }

    for (const level of levels) {
      try {
        const [row] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(articles)
          .where(
            and(
              eq(articles.raLevel, level),
              startFilter ? gte(articles.createdAt, startFilter) : undefined,
              endFilter ? lte(articles.createdAt, endFilter) : undefined
            )
          );
        articlesByLevel[level] = row?.count ?? 0;
      } catch (error) {
        console.error(`Error fetching count for level ${level}`, error);
        articlesByLevel[level] = 0;
      }
    }

    return NextResponse.json(
      {
        data: articlesByLevel,
        dataRange: { start_date: startDate, end_date: endDate },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching system dashboard data:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
