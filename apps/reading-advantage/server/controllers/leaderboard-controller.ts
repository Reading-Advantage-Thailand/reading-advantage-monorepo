import { ExtendedNextRequest } from "./auth-controller";
import { NextRequest, NextResponse } from "next/server";
import { db, eq, and, gte, lte, ne, inArray, sql } from "@reading-advantage/db";
import {
  licenses,
  licenseOnUsers,
  users,
  xpLogs,
  classroomStudents,
  classrooms,
} from "@reading-advantage/db/schema";

interface RequestContext {
  params: Promise<{
    id: string;
  }>;
}

export async function getAllRankingLeaderboard(req: NextRequest) {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    const allLicenses = await db.select().from(licenses);

    const allLeaderboards = await Promise.all(
      allLicenses.map(async (license) => {
        // Get all users for this license
        const licenseUserRows = await db
          .select({ userId: licenseOnUsers.userId })
          .from(licenseOnUsers)
          .where(eq(licenseOnUsers.licenseId, license.id));

        const userIds = licenseUserRows.map((r) => r.userId);
        if (userIds.length === 0) {
          return { license_id: license.id, schoolName: license.schoolName, ranking: [] };
        }

        const userRows = await db
          .select({ id: users.id, name: users.name, email: users.email, role: users.role })
          .from(users)
          .where(inArray(users.id, userIds));

        // Filter to students only
        const studentRows = userRows.filter(
          (u) => u.role !== "TEACHER" && u.role !== "ADMIN" && u.role !== "SYSTEM"
        );
        if (studentRows.length === 0) {
          return { license_id: license.id, schoolName: license.schoolName, ranking: [] };
        }

        const studentIds = studentRows.map((u) => u.id);

        // Get monthly XP for each student
        const monthlyXpRows = await db
          .select({
            userId: xpLogs.userId,
            xpEarned: xpLogs.xpEarned,
          })
          .from(xpLogs)
          .where(
            and(
              inArray(xpLogs.userId, studentIds),
              gte(xpLogs.createdAt, startOfMonth),
              lte(xpLogs.createdAt, endOfMonth),
              ne(xpLogs.activityType, "LEVEL_TEST")
            )
          );

        const xpByUser: Record<string, number> = {};
        for (const row of monthlyXpRows) {
          xpByUser[row.userId] = (xpByUser[row.userId] ?? 0) + row.xpEarned;
        }

        // Get classroom name for each student (first classroom)
        const classroomRows = await db
          .select({
            studentId: classroomStudents.studentId,
            classroomName: classrooms.name,
          })
          .from(classroomStudents)
          .leftJoin(classrooms, eq(classroomStudents.classroomId, classrooms.id))
          .where(inArray(classroomStudents.studentId, studentIds));

        const classroomByUser: Record<string, string> = {};
        for (const row of classroomRows) {
          if (!classroomByUser[row.studentId]) {
            classroomByUser[row.studentId] = row.classroomName ?? "No Classroom";
          }
        }

        const leaderboardData = studentRows
          .map((u) => ({
            rank: 0,
            name: u.name || u.email || "Unknown User",
            xp: xpByUser[u.id] ?? 0,
            classroom: classroomByUser[u.id] ?? "No Classroom",
            userId: u.id,
          }))
          .filter((u) => u.xp > 0)
          .sort((a, b) => b.xp - a.xp)
          .slice(0, 10)
          .map((u, index) => ({ ...u, rank: index + 1 }));

        return { license_id: license.id, schoolName: license.schoolName, ranking: leaderboardData };
      })
    );

    return NextResponse.json({ results: allLeaderboards });
  } catch (error) {
    console.error("Error getting all leaderboards:", error);
    return NextResponse.json(
      { message: "Internal server error", results: [] },
      { status: 500 }
    );
  }
}

export async function getRankingLeaderboardById(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  const { id } = await ctx.params;
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    // Users belonging to this license who are not staff
    const licenseUserRows = await db
      .select({ userId: licenseOnUsers.userId })
      .from(licenseOnUsers)
      .where(eq(licenseOnUsers.licenseId, id));

    const allUserIds = licenseUserRows.map((r) => r.userId);
    if (allUserIds.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const userRows = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, xp: users.xp })
      .from(users)
      .where(inArray(users.id, allUserIds));

    const studentRows = userRows.filter(
      (u) => u.role !== "TEACHER" && u.role !== "ADMIN" && u.role !== "SYSTEM"
    );
    if (studentRows.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const studentIds = studentRows.map((u) => u.id);

    const monthlyXpRows = await db
      .select({ userId: xpLogs.userId, xpEarned: xpLogs.xpEarned })
      .from(xpLogs)
      .where(
        and(
          inArray(xpLogs.userId, studentIds),
          gte(xpLogs.createdAt, startOfMonth),
          lte(xpLogs.createdAt, endOfMonth),
          ne(xpLogs.activityType, "LEVEL_TEST")
        )
      );

    const xpByUser: Record<string, number> = {};
    for (const row of monthlyXpRows) {
      xpByUser[row.userId] = (xpByUser[row.userId] ?? 0) + row.xpEarned;
    }

    const classroomRows = await db
      .select({
        studentId: classroomStudents.studentId,
        classroomName: classrooms.name,
      })
      .from(classroomStudents)
      .leftJoin(classrooms, eq(classroomStudents.classroomId, classrooms.id))
      .where(inArray(classroomStudents.studentId, studentIds));

    const classroomByUser: Record<string, string> = {};
    for (const row of classroomRows) {
      if (!classroomByUser[row.studentId]) {
        classroomByUser[row.studentId] = row.classroomName ?? "No Classroom";
      }
    }

    const leaderboardData = studentRows
      .map((u) => ({
        rank: 0,
        name: u.name || u.email || "Unknown User",
        xp: xpByUser[u.id] ?? 0,
        classroom: classroomByUser[u.id] ?? "No Classroom",
        userId: u.id,
      }))
      .filter((u) => u.xp > 0)
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 10)
      .map((u, index) => ({ ...u, rank: index + 1 }));

    return NextResponse.json({ results: leaderboardData });
  } catch (error) {
    console.error("Error getting leaderboard:", error);
    return NextResponse.json(
      { message: "Internal server error", results: [] },
      { status: 500 }
    );
  }
}
