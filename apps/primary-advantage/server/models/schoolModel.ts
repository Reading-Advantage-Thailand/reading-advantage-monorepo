import {
  db,
  eq,
  and,
  desc,
  gte,
  lte,
  inArray,
  sql,
} from '@reading-advantage/db';
import {
  schools,
  users,
  xpLogs,
  leaderboards,
  userRoles,
  roles,
  classroomStudents,
  classrooms,
  schoolAdmins,
} from '@reading-advantage/db';

interface LeaderboardResult {
  classroom: string;
  name: string;
  rank: number;
  xp: number;
  userId: string;
}

interface SchoolLeaderboardData {
  schoolName: string;
  results: LeaderboardResult[];
}

/**
 * Look up the role id for "student" once and reuse it for the leaderboard
 * aggregation. The Prisma model kept the role name as a string, so this
 * helper bridges to the new Drizzle roles/userRoles tables.
 */
async function getStudentRoleId(): Promise<string | null> {
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, "student"))
    .limit(1);
  return role?.id ?? null;
}

export const updateSchoolRankingModel = async () => {
  try {
    // Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    // Fetch all schools
    const schoolsRows = await db.select({ id: schools.id, name: schools.name }).from(schools);

    const studentRoleId = await getStudentRoleId();

    // Process each school
    const leaderboardUpdates = await Promise.all(
      schoolsRows.map(async (school) => {
        // Build a set of student user ids for this school via the
        // M:N userRoles table + users.schoolId filter. We do this in two
        // queries because the Drizzle relations API is not in use yet.
        let studentUserIds: string[] = [];
        if (studentRoleId) {
          const studentRows = await db
            .select({ id: users.id })
            .from(users)
            .innerJoin(userRoles, eq(userRoles.userId, users.id))
            .where(
              and(
                eq(users.schoolId, school.id),
                eq(userRoles.roleId, studentRoleId),
              ),
            );
          studentUserIds = studentRows.map((row) => row.id);
        }

        // Get XP logs for current month for students in this school
        const xpLogRows = studentUserIds.length
          ? await db
              .select({
                userId: xpLogs.userId,
                xpEarned: xpLogs.xpEarned,
                userName: users.name,
              })
              .from(xpLogs)
              .innerJoin(users, eq(users.id, xpLogs.userId))
              .where(
                and(
                  gte(xpLogs.createdAt, startOfMonth),
                  lte(xpLogs.createdAt, endOfMonth),
                  inArray(xpLogs.userId, studentUserIds),
                ),
              )
          : [];

        // Aggregate XP by user. We also look up the student's classroom
        // name separately (the Prisma include nested this join).
        const userXpMap = new Map<
          string,
          { name: string; xp: number; classroom: string }
        >();

        // Pre-compute classroom names per user (one round-trip via JOIN).
        const classroomByUser = new Map<string, string>();
        if (studentUserIds.length) {
          const csRows = await db
            .select({
              studentId: classroomStudents.studentId,
              classroomName: classrooms.name,
            })
            .from(classroomStudents)
            .innerJoin(classrooms, eq(classrooms.id, classroomStudents.classroomId))
            .where(inArray(classroomStudents.studentId, studentUserIds));
          for (const row of csRows) {
            if (!classroomByUser.has(row.studentId)) {
              classroomByUser.set(row.studentId, row.classroomName);
            }
          }
        }

        for (const log of xpLogRows) {
          const userId = log.userId;
          const userName = log.userName || "Unknown";
          const classroom = classroomByUser.get(userId) ?? "No Classroom";

          if (userXpMap.has(userId)) {
            const existing = userXpMap.get(userId)!;
            userXpMap.set(userId, {
              ...existing,
              xp: existing.xp + log.xpEarned,
            });
          } else {
            userXpMap.set(userId, {
              name: userName,
              xp: log.xpEarned,
              classroom: classroom,
            });
          }
        }

        // Convert to array and sort by XP (descending)
        let sortedUsers = Array.from(userXpMap.entries())
          .map(([userId, data]) => ({
            userId,
            name: data.name,
            xp: data.xp,
            classroom: data.classroom,
          }))
          .sort((a, b) => b.xp - a.xp);

        // If no data, randomly select 5 students from the school
        if (sortedUsers.length === 0 && studentUserIds.length > 0) {
          const randomStudents = await db
            .select({
              id: users.id,
              name: users.name,
              xp: users.xp,
            })
            .from(users)
            .where(inArray(users.id, studentUserIds))
            .limit(5);

          sortedUsers = randomStudents.map((student) => ({
            userId: student.id,
            name: student.name || "Unknown",
            xp: 0,
            classroom: classroomByUser.get(student.id) ?? "No Classroom",
          }));
        }

        // Limit to top 5 students only
        const top5Users = sortedUsers.slice(0, 5);

        // Assign ranks
        const results: LeaderboardResult[] = top5Users.map((user, index) => ({
          classroom: user.classroom,
          name: user.name,
          rank: index + 1,
          xp: user.xp,
          userId: user.userId,
        }));

        const leaderboardData: SchoolLeaderboardData = {
          schoolName: school.name,
          results,
        };

        // Check if leaderboard entry exists for this school
        const [existingLeaderboard] = await db
          .select({ id: leaderboards.id })
          .from(leaderboards)
          .where(eq(leaderboards.schoolId, school.id))
          .limit(1);

        if (existingLeaderboard) {
          // Update existing leaderboard
          const [updated] = await db
            .update(leaderboards)
            .set({
              details: leaderboardData as any,
              updatedAt: new Date(),
            })
            .where(eq(leaderboards.id, existingLeaderboard.id))
            .returning();
          return updated;
        } else {
          // Create new leaderboard entry
          const [created] = await db
            .insert(leaderboards)
            .values({
              schoolId: school.id,
              details: leaderboardData as any,
            })
            .returning();
          return created;
        }
      }),
    );

    return { success: true, data: leaderboardUpdates };
  } catch (error) {
    console.error("School Model: Error updating school ranking:", error);
    return { success: false, error: "Failed to update school ranking" };
  }
};

export const getSchoolLeaderboardModel = async (
  schoolId?: string,
  userId?: string,
) => {
  try {
    const [leaderboard] = await db
      .select({
        id: leaderboards.id,
        details: leaderboards.details,
        updatedAt: leaderboards.updatedAt,
      })
      .from(leaderboards)
      .where(eq(leaderboards.schoolId, schoolId as string))
      .limit(1);

    if (!leaderboard) {
      return { success: false, error: "Leaderboard not found for this school" };
    }

    const leaderboardData =
      leaderboard.details as unknown as SchoolLeaderboardData;

    // If userId is provided, check if student is in top 5
    if (userId) {
      const isInTop5 = leaderboardData.results.some(
        (result) => result.userId === userId,
      );

      // If student is not in top 5, calculate their current rank
      if (!isInTop5) {
        // Get current month date range
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        );

        // Build student ids list for this school (same query as above, cached
        // would be nicer — for parity with the original we re-query).
        const studentRoleId = await getStudentRoleId();
        let studentUserIds: string[] = [];
        if (studentRoleId) {
          const studentRows = await db
            .select({ id: users.id })
            .from(users)
            .innerJoin(userRoles, eq(userRoles.userId, users.id))
            .where(
              and(
                eq(users.schoolId, schoolId as string),
                eq(userRoles.roleId, studentRoleId),
              ),
            );
          studentUserIds = studentRows.map((row) => row.id);
        }

        // Get all students' XP for current month in this school
        const xpLogRows = studentUserIds.length
          ? await db
              .select({
                userId: xpLogs.userId,
                xpEarned: xpLogs.xpEarned,
              })
              .from(xpLogs)
              .where(
                and(
                  gte(xpLogs.createdAt, startOfMonth),
                  lte(xpLogs.createdAt, endOfMonth),
                  inArray(xpLogs.userId, studentUserIds),
                ),
              )
          : [];

        // Aggregate XP by user
        const userXpMap = new Map<string, number>();

        for (const log of xpLogRows) {
          const currentXp = userXpMap.get(log.userId) || 0;
          userXpMap.set(log.userId, currentXp + log.xpEarned);
        }

        // Convert to array and sort by XP (descending)
        const sortedUsers = Array.from(userXpMap.entries())
          .map(([userId, xp]) => ({ userId, xp }))
          .sort((a, b) => b.xp - a.xp);

        // Find student's rank
        const studentRank =
          sortedUsers.findIndex((user) => user.userId === userId) + 1;

        if (studentRank > 0) {
          // Get student's details
          const [student] = await db
            .select({
              id: users.id,
              name: users.name,
            })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

          // Look up the student's classroom via the join table
          const [csRow] = await db
            .select({ classroomName: classrooms.name })
            .from(classroomStudents)
            .innerJoin(classrooms, eq(classrooms.id, classroomStudents.classroomId))
            .where(eq(classroomStudents.studentId, userId))
            .limit(1);

          if (student) {
            const studentXp = userXpMap.get(userId) || 0;
            const studentResult: LeaderboardResult = {
              userId,
              name: student.name || "You",
              rank: studentRank,
              xp: studentXp,
              classroom: csRow?.classroomName ?? "No Classroom",
            };

            // Add student's rank to the results
            leaderboardData.results = [
              ...leaderboardData.results,
              studentResult,
            ];
          }
        }
      }
    }

    return {
      success: true,
      data: leaderboardData,
    };
  } catch (error) {
    console.error("School Model: Error fetching school leaderboard:", error);
    return { success: false, error: "Failed to fetch school leaderboard" };
  }
};

// Note: `sql` is imported for future column-based aggregation work; left here
// to keep parity with the existing migration rule patterns. The current
// translation does not require raw SQL but we keep the symbol to avoid an
// unused-import lint failure should the package adopt such rules later.
void sql;