import { prisma } from "@/lib/prisma";

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
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    // Process each school
    const leaderboardUpdates = await Promise.all(
      schools.map(async (school) => {
        // Get XP logs for current month for students in this school
        const xpLogs = await prisma.xPLogs.findMany({
          where: {
            createdAt: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
            user: {
              schoolId: school.id,
              roles: {
                some: {
                  role: {
                    name: "student",
                  },
                },
              },
            },
          },
          select: {
            userId: true,
            xpEarned: true,
            user: {
              select: {
                id: true,
                name: true,
                studentClassroom: {
                  select: {
                    classroom: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        // Aggregate XP by user
        const userXpMap = new Map<
          string,
          { name: string; xp: number; classroom: string }
        >();

        for (const log of xpLogs) {
          const userId = log.userId;
          const userName = log.user.name || "Unknown";
          const classroom =
            log.user.studentClassroom.length > 0
              ? log.user.studentClassroom[0].classroom.name
              : "No Classroom";

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
        if (sortedUsers.length === 0) {
          const randomStudents = await prisma.user.findMany({
            where: {
              schoolId: school.id,
              roles: {
                some: {
                  role: {
                    name: "student",
                  },
                },
              },
            },
            select: {
              id: true,
              name: true,
              xp: true,
              studentClassroom: {
                select: {
                  classroom: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
            take: 5,
          });

          sortedUsers = randomStudents.map((student) => ({
            userId: student.id,
            name: student.name || "Unknown",
            xp: 0,
            classroom:
              student.studentClassroom.length > 0
                ? student.studentClassroom[0].classroom.name
                : "No Classroom",
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
        const existingLeaderboard = await prisma.leaderboard.findFirst({
          where: { schoolId: school.id },
        });

        if (existingLeaderboard) {
          // Update existing leaderboard
          return await prisma.leaderboard.update({
            where: { id: existingLeaderboard.id },
            data: {
              details: leaderboardData as any,
              updatedAt: new Date(),
            },
          });
        } else {
          // Create new leaderboard entry
          return await prisma.leaderboard.create({
            data: {
              schoolId: school.id,
              details: leaderboardData as any,
            },
          });
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
    const leaderboard = await prisma.leaderboard.findFirst({
      where: { schoolId },
      select: {
        id: true,
        details: true,
        updatedAt: true,
      },
    });

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

        // Get all students' XP for current month in this school
        const xpLogs = await prisma.xPLogs.findMany({
          where: {
            createdAt: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
            user: {
              schoolId: schoolId,
              roles: {
                some: {
                  role: {
                    name: "student",
                  },
                },
              },
            },
          },
          select: {
            userId: true,
            xpEarned: true,
          },
        });

        // Aggregate XP by user
        const userXpMap = new Map<string, number>();

        for (const log of xpLogs) {
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
          const student = await prisma.user.findUnique({
            where: { id: userId },
            select: {
              name: true,
              studentClassroom: {
                select: {
                  classroom: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          });

          if (student) {
            const studentXp = userXpMap.get(userId) || 0;
            const studentResult: LeaderboardResult = {
              userId,
              name: student.name || "You",
              rank: studentRank,
              xp: studentXp,
              classroom:
                student.studentClassroom.length > 0
                  ? student.studentClassroom[0].classroom.name
                  : "No Classroom",
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
