import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ActivityType } from "@/types/enum";
import bcrypt from "bcryptjs";

export const createUser = async (data: {
  name: string;
  email: string;
  password: string;
}) => {
  try {
    const existingUser = await getUserByEmail(data.email);

    if (existingUser) {
      return {
        error: "User already exists",
      };
    }

    const hashedPassword = bcrypt.hashSync(data.password, 10);

    // Find the User role
    const userRole = await prisma.role.findFirst({
      where: { name: "user" },
    });

    if (!userRole) {
      return {
        error: "Default user role not found",
      };
    }

    // Create user with transaction to ensure role assignment
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: hashedPassword,
        },
      });

      // Assign the User role to the new user
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: userRole.id,
        },
      });

      return user;
    });

    return {
      success: "User created successfully",
      user: newUser,
    };
  } catch (error) {
    console.error("Error creating user:", error);
    return {
      error: "Error creating user",
    };
  }
};

export const updateUserActivity = async (
  activityType: ActivityType,
  details: {
    responses?: string[];
    progress?: number[];
    timer: number;
  },
  targetId?: string,
  xpEarned?: number,
) => {
  try {
    const session = await auth();
    const userId = session?.user.id;

    if (!userId) {
      throw new Error("Plase login");
    }

    return await prisma.userActivity.create({
      data: {
        userId: userId,
        activityType,
        targetId: targetId,
        details,
        completed: true,
      },
    });
  } catch (error) {
    console.log(error);
  }
};

export const getUserByEmail = async (email: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (user?.roles.length === 0) {
      return await prisma.$transaction(async (tx) => {
        const role = await tx.role.findFirst({
          where: { name: "user" },
        });

        if (!role) {
          throw new Error("Default user role not found");
        }

        await tx.userRole.create({
          data: { userId: user.id, roleId: role.id },
        });

        // Return updated user
        return await tx.user.findUnique({
          where: { email },
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        });
      });
    }

    return user;
  } catch (error) {
    console.log(error);
  }
};
export const getUserById = async (id: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: id,
      },
    });
    return user;
  } catch (error) {
    console.log(error);
  }
};

export const getUserActivity = async (id: string) => {
  try {
    const user = await getUserById(id);

    if (!user) {
      throw new Error("User not found");
    }

    const activity = await prisma.userActivity.findMany({
      where: {
        userId: id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const xpLogs = await prisma.xPLogs.findMany({
      where: {
        userId: id,
      },
    });

    return { activity, xpLogs, user };
  } catch (error) {
    console.log(error);
  }
};

export const getUserArticleRecords = async (
  userId: string,
  page: number = 1,
  limit: number = 10,
  search?: string,
) => {
  try {
    const offset = (page - 1) * limit;

    // Get all article activities for the user
    const articleActivities = await prisma.userActivity.findMany({
      where: {
        userId: userId,
        activityType: {
          in: [
            ActivityType.ARTICLE_READ,
            ActivityType.MC_QUESTION,
            ActivityType.SA_QUESTION,
            ActivityType.LA_QUESTION,
            ActivityType.ARTICLE_RATING,
          ],
        },
        ...(search && {
          OR: [
            {
              details: {
                path: ["title"],
                string_contains: search,
              },
            },
          ],
        }),
      },
      include: {
        user: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Group activities by article
    const articleMap = new Map();

    for (const activity of articleActivities) {
      const articleId = activity.targetId;
      if (!articleId) continue;

      if (!articleMap.has(articleId)) {
        articleMap.set(articleId, {
          id: articleId,
          activities: [],
          lastUpdated: activity.updatedAt,
        });
      }

      articleMap.get(articleId).activities.push(activity);

      // Keep track of most recent update
      if (activity.updatedAt > articleMap.get(articleId).lastUpdated) {
        articleMap.get(articleId).lastUpdated = activity.updatedAt;
      }
    }

    // Get article details for each unique article
    const articleIds = Array.from(articleMap.keys());
    const articles = await prisma.article.findMany({
      where: {
        id: {
          in: articleIds,
        },
        ...(search && {
          title: {
            contains: search,
            mode: "insensitive",
          },
        }),
      },
    });

    // Create article map for quick lookup
    const articleDetailMap = new Map();
    articles.forEach((article) => {
      articleDetailMap.set(article.id, article);
    });

    // Process and format the data
    const records = Array.from(articleMap.entries())
      .map(([articleId, data]) => {
        const article = articleDetailMap.get(articleId);
        if (!article) return null;

        const activities = data.activities;

        // Determine status based on completed activities
        let status = "READ";
        const hasRead = activities.some(
          (a: any) => a.activityType === ActivityType.ARTICLE_READ,
        );
        const hasMCQ = activities.some(
          (a: any) =>
            a.activityType === ActivityType.MC_QUESTION && a.completed,
        );
        const hasSAQ = activities.some(
          (a: any) =>
            a.activityType === ActivityType.SA_QUESTION && a.completed,
        );
        const hasLAQ = activities.some(
          (a: any) =>
            a.activityType === ActivityType.LA_QUESTION && a.completed,
        );
        const hasRating = activities.some(
          (a: any) =>
            a.activityType === ActivityType.ARTICLE_RATING && a.completed,
        );

        if (hasLAQ) {
          status = "COMPLETED_LAQ";
        } else if (hasSAQ) {
          status = "COMPLETED_SAQ";
        } else if (hasMCQ) {
          status = "COMPLETED_MCQ";
        } else if (hasRead && !hasRating) {
          status = "UNRATED";
        }

        // Calculate score based on question activities
        let scores = "N/A";
        const questionActivities = activities.filter(
          (a: any) =>
            [
              ActivityType.MC_QUESTION,
              ActivityType.SA_QUESTION,
              ActivityType.LA_QUESTION,
            ].includes(a.activityType) && a.completed,
        );

        if (questionActivities.length > 0) {
          // For MC questions, calculate percentage from progress array
          const mcActivity = questionActivities.find(
            (a: any) => a.activityType === ActivityType.MC_QUESTION,
          );
          if (mcActivity?.details?.progress) {
            const progress = mcActivity.details.progress as number[];
            const totalQuestions = progress.length;
            const correctAnswers = progress.reduce(
              (sum, score) => sum + score,
              0,
            );
            scores = `${Math.round((correctAnswers / totalQuestions) * 100)}%`;
          } else {
            scores = "Completed";
          }
        }

        return {
          id: articleId,
          title: article.title,
          scores: scores,
          updated_at: data.lastUpdated.toISOString(),
          rated: article.rating || 0,
          status: status,
        };
      })
      .filter(Boolean)
      .sort(
        (a: any, b: any) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );

    // Apply pagination
    const paginatedRecords = records.slice(offset, offset + limit);
    const totalRecords = records.length;

    return {
      data: paginatedRecords,
      pagination: {
        page,
        limit,
        total: totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
      },
    };
  } catch (error) {
    console.error("Error fetching article records:", error);
    throw error;
  }
};

export const getUserReminderReread = async (userId: string) => {
  try {
    // Get all article activities for the user
    const articleActivities = await prisma.userActivity.findMany({
      where: {
        userId: userId,
        activityType: {
          in: [
            ActivityType.ARTICLE_READ,
            ActivityType.MC_QUESTION,
            ActivityType.SA_QUESTION,
            ActivityType.LA_QUESTION,
            ActivityType.ARTICLE_RATING,
          ],
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Group activities by article
    const articleMap = new Map();

    for (const activity of articleActivities) {
      const articleId = activity.targetId;
      if (!articleId) continue;

      if (!articleMap.has(articleId)) {
        articleMap.set(articleId, {
          id: articleId,
          activities: [],
          lastUpdated: activity.updatedAt,
        });
      }

      articleMap.get(articleId).activities.push(activity);

      if (activity.updatedAt > articleMap.get(articleId).lastUpdated) {
        articleMap.get(articleId).lastUpdated = activity.updatedAt;
      }
    }

    // Filter articles that need re-reading based on criteria
    const reminderArticleIds: string[] = [];
    const currentDate = new Date();
    const sevenDaysAgo = new Date(
      currentDate.getTime() - 7 * 24 * 60 * 60 * 1000,
    );

    articleMap.forEach((data, articleId) => {
      const activities = data.activities;

      const hasRead = activities.some(
        (a: any) => a.activityType === ActivityType.ARTICLE_READ,
      );
      const mcActivity = activities.find(
        (a: any) => a.activityType === ActivityType.MC_QUESTION && a.completed,
      );
      const hasRating = activities.some(
        (a: any) =>
          a.activityType === ActivityType.ARTICLE_RATING && a.completed,
      );
      const hasSAQ = activities.some(
        (a: any) => a.activityType === ActivityType.SA_QUESTION && a.completed,
      );
      const hasLAQ = activities.some(
        (a: any) => a.activityType === ActivityType.LA_QUESTION && a.completed,
      );

      let shouldReread = false;

      // Criteria 1: Low MC question scores
      if (mcActivity?.details?.progress) {
        const progress = mcActivity.details.progress as number[];
        const totalQuestions = progress.length;
        const correctAnswers = progress.reduce((sum, score) => sum + score, 0);
        const scorePercentage = (correctAnswers / totalQuestions) * 100;
        if (scorePercentage < 60) {
          shouldReread = true;
        }
      }

      // Criteria 2: Read but not rated
      if (hasRead && !hasRating) {
        shouldReread = true;
      }

      // Criteria 3: Incomplete question progression
      if (mcActivity && !hasSAQ && !hasLAQ) {
        shouldReread = true;
      }

      // Criteria 4: Not accessed recently but had some activity
      if (data.lastUpdated < sevenDaysAgo && hasRead) {
        shouldReread = true;
      }

      if (shouldReread) {
        reminderArticleIds.push(articleId);
      }
    });

    // Get article details for reminder articles
    const articles = await prisma.article.findMany({
      where: {
        id: {
          in: reminderArticleIds,
        },
      },
    });

    // Create article map for quick lookup
    const articleDetailMap = new Map();
    articles.forEach((article) => {
      articleDetailMap.set(article.id, article);
    });

    // Format the reminder data
    const reminderRecords = reminderArticleIds
      .map((articleId) => {
        const article = articleDetailMap.get(articleId);
        const data = articleMap.get(articleId);

        if (!article || !data) return null;

        const activities = data.activities;

        // Determine status
        let status = "READ";
        const hasRead = activities.some(
          (a: any) => a.activityType === ActivityType.ARTICLE_READ,
        );
        const hasMCQ = activities.some(
          (a: any) =>
            a.activityType === ActivityType.MC_QUESTION && a.completed,
        );
        const hasSAQ = activities.some(
          (a: any) =>
            a.activityType === ActivityType.SA_QUESTION && a.completed,
        );
        const hasLAQ = activities.some(
          (a: any) =>
            a.activityType === ActivityType.LA_QUESTION && a.completed,
        );
        const hasRating = activities.some(
          (a: any) =>
            a.activityType === ActivityType.ARTICLE_RATING && a.completed,
        );

        if (hasLAQ) {
          status = "COMPLETED_LAQ";
        } else if (hasSAQ) {
          status = "COMPLETED_SAQ";
        } else if (hasMCQ) {
          status = "COMPLETED_MCQ";
        } else if (hasRead && !hasRating) {
          status = "UNRATED";
        }

        // Calculate score
        let scores = "N/A";
        const mcActivity = activities.find(
          (a: any) =>
            a.activityType === ActivityType.MC_QUESTION && a.completed,
        );
        if (mcActivity?.details?.progress) {
          const progress = mcActivity.details.progress as number[];
          const totalQuestions = progress.length;
          const correctAnswers = progress.reduce(
            (sum, score) => sum + score,
            0,
          );
          scores = `${Math.round((correctAnswers / totalQuestions) * 100)}%`;
        } else if (
          activities.some(
            (a: any) =>
              [ActivityType.SA_QUESTION, ActivityType.LA_QUESTION].includes(
                a.activityType,
              ) && a.completed,
          )
        ) {
          scores = "Completed";
        }

        return {
          id: articleId,
          title: article.title,
          scores: scores,
          updated_at: data.lastUpdated.toISOString(),
          rated: article.rating || 0,
          status: status,
        };
      })
      .filter(Boolean)
      .sort(
        (a: any, b: any) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );

    return {
      data: reminderRecords,
    };
  } catch (error) {
    console.error("Error fetching reminder reread data:", error);
    throw error;
  }
};
