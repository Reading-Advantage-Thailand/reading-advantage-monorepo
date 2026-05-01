import { ExtendedNextRequest } from "./auth-controller";
import { NextRequest, NextResponse } from "next/server";
import db from "@/configs/firestore-config";
import { prisma } from "@/lib/prisma";

interface RequestContext {
  params: Promise<{
    id: string;
  }>;
}

type User = {
  id: string;
  display_name: string;
  license_id: string;
};

type Classroom = {
  classroomName: string;
  license_id: string;
  student: { studentId: string }[];
};

type ActivityLog = {
  userId: string;
  xpEarned: number;
  timestamp: Date;
  activityStatus: string;
};

type RankingEntry = {
  rank: number;
  name: string;
  xp: number;
  classroom: string;
};

export async function getAllRankingLeaderboard(req: NextRequest) {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    const licenses = await prisma.license.findMany({
      select: {
        id: true,
        key: true,
        schoolName: true,
        licenseUsers: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                xpLogs: {
                  where: {
                    createdAt: {
                      gte: startOfMonth,
                      lte: endOfMonth,
                    },
                    activityType: {
                      not: "LEVEL_TEST",
                    },
                  },
                  select: {
                    xpEarned: true,
                  },
                },
                studentClassrooms: {
                  select: {
                    classroom: {
                      select: {
                        classroomName: true,
                      },
                    },
                  },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    const allLeaderboards = licenses.map((license) => {
      const leaderboardData = license.licenseUsers
        .filter((licenseUser) => {
          const userRole = licenseUser.user.role;
          return userRole !== "TEACHER" && userRole !== "ADMIN" && userRole !== "SYSTEM";
        })
        .map((licenseUser) => {
          const user = licenseUser.user;
          const monthlyXP = user.xpLogs.reduce((sum, log) => sum + log.xpEarned, 0);
          const classroomName = user.studentClassrooms[0]?.classroom?.classroomName || "No Classroom";
          
          return {
            rank: 0,
            name: user.name || user.email || "Unknown User",
            xp: monthlyXP,
            classroom: classroomName,
            userId: user.id,
          };
        })
        .filter((user) => user.xp > 0)
        .sort((a, b) => b.xp - a.xp)
        .slice(0, 10)
        .map((user, index) => ({
          ...user,
          rank: index + 1,
        }));

      return {
        license_id: license.id,
        schoolName: license.schoolName,
        ranking: leaderboardData,
      };
    });

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

    const usersWithXP = await prisma.user.findMany({
      where: {
        licenseOnUsers: {
          some: {
            licenseId: id,
          },
        },
        role: {
          notIn: ["TEACHER", "ADMIN", "SYSTEM"],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        xp: true,
        xpLogs: {
          where: {
            createdAt: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
            activityType: {
              not: "LEVEL_TEST",
            },
          },
          select: {
            xpEarned: true,
          },
        },
        studentClassrooms: {
          select: {
            classroom: {
              select: {
                classroomName: true,
              },
            },
          },
          take: 1,
        },
      },
    });
    const leaderboardData = usersWithXP
      .map((user) => {
        const monthlyXP = user.xpLogs.reduce((sum, log) => sum + log.xpEarned, 0);
        const classroomName = user.studentClassrooms[0]?.classroom?.classroomName || "No Classroom";
        
        return {
          rank: 0,
          name: user.name || user.email || "Unknown User",
          xp: monthlyXP,
          classroom: classroomName,
          userId: user.id,
        };
      })
      .filter((user) => user.xp > 0)
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 10)
      .map((user, index) => ({
        ...user,
        rank: index + 1,
      }));

    return NextResponse.json({ results: leaderboardData });
  } catch (error) {
    console.error("Error getting leaderboard:", error);
    return NextResponse.json(
      { message: "Internal server error", results: [] },
      { status: 500 }
    );
  }
}




