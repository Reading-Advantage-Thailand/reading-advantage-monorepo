import { getCurrentUser } from "@/lib/session";
import {
  db,
  eq,
  and,
  desc,
  inArray,
  sql,
} from '@reading-advantage/db';
import {
  users,
  userActivity,
  xpLogs,
  articles,
  roles,
  userRoles,
} from '@reading-advantage/db';
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
    const [userRole] = await db.select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, "user"))
      .limit(1);

    if (!userRole) {
      return {
        error: "Default user role not found",
      };
    }

    // Create user with transaction to ensure role assignment
    const newUser = await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({
        name: data.name,
        email: data.email,
        password: hashedPassword,
      }).returning();

      // Assign the User role to the new user
      await tx.insert(userRoles).values({
        userId: user.id,
        roleId: userRole.id,
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
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Please login");
    }
    const userId = user.id;

    const [activity] = await db.insert(userActivity).values({
      userId: userId,
      activityType,
      targetId: targetId,
      details,
      completed: true,
    }).returning();

    return activity;
  } catch (error) {
    console.log(error);
  }
};

export const getUserByEmail = async (email: string) => {
  try {
    const [user] = await db.select().from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      return null;
    }

    // Stitch the `roles: { include: { role: true } }` shape manually.
    const userRoleRows = await db.select({
      roleId: userRoles.roleId,
      roleName: roles.name,
    })
      .from(userRoles)
      .leftJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, user.id));

    const rolesForUser = userRoleRows.map((row) => ({
      role: {
        id: row.roleId,
        name: row.roleName,
      },
    }));

    const userWithRoles = { ...user, roles: rolesForUser };

    if (userWithRoles.roles.length === 0) {
      return await db.transaction(async (tx) => {
        const [role] = await tx.select({ id: roles.id })
          .from(roles)
          .where(eq(roles.name, "user"))
          .limit(1);

        if (!role) {
          throw new Error("Default user role not found");
        }

        await tx.insert(userRoles).values({
          userId: user.id,
          roleId: role.id,
        });

        // Return updated user
        const [updated] = await tx.select().from(users)
          .where(eq(users.email, email))
          .limit(1);

        const updatedRoleRows = await tx.select({
          roleId: userRoles.roleId,
          roleName: roles.name,
        })
          .from(userRoles)
          .leftJoin(roles, eq(roles.id, userRoles.roleId))
          .where(eq(userRoles.userId, user.id));

        const updatedRoles = updatedRoleRows.map((row) => ({
          role: {
            id: row.roleId,
            name: row.roleName,
          },
        }));

        return { ...updated, roles: updatedRoles };
      });
    }

    return userWithRoles;
  } catch (error) {
    console.log(error);
  }
};

export const getUserById = async (id: string) => {
  try {
    const [user] = await db.select().from(users)
      .where(eq(users.id, id))
      .limit(1);
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

    const activity = await db.select().from(userActivity)
      .where(eq(userActivity.userId, id))
      .orderBy(desc(userActivity.createdAt));

    const xpLogRows = await db.select().from(xpLogs)
      .where(eq(xpLogs.userId, id));

    return { activity, xpLogs: xpLogRows, user };
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

    // Build where clause for the activity fetch.
    const activityConditions: any[] = [
      eq(userActivity.userId, userId),
      inArray(userActivity.activityType, [
        ActivityType.ARTICLE_READ,
        ActivityType.MC_QUESTION,
        ActivityType.SA_QUESTION,
        ActivityType.LA_QUESTION,
        ActivityType.ARTICLE_RATING,
      ]),
    ];

    // Prisma used a JSON path + string_contains filter on the search
    // term. We replicate it via a SQL `details->>'title' ILIKE` clause.
    if (search) {
      activityConditions.push(
        sql`${userActivity.details}->>'title' ILIKE ${`%${search}%`}`,
      );
    }

    // Get all article activities for the user
    const articleActivities = await db.select().from(userActivity)
      .where(and(...activityConditions))
      .orderBy(desc(userActivity.updatedAt));

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
    let articleRows: any[] = [];
    if (articleIds.length) {
      const articleConditions: any[] = [inArray(articles.id, articleIds)];
      if (search) {
        // ilike matches Prisma's `contains` + `mode: 'insensitive'`.
        articleConditions.push(sql`${articles.title} ILIKE ${`%${search}%`}`);
      }
      articleRows = await db.select().from(articles).where(and(...articleConditions));
    }

    // Create article map for quick lookup
    const articleDetailMap = new Map();
    articleRows.forEach((article) => {
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
    const articleActivities = await db.select().from(userActivity)
      .where(
        and(
          eq(userActivity.userId, userId),
          inArray(userActivity.activityType, [
            ActivityType.ARTICLE_READ,
            ActivityType.MC_QUESTION,
            ActivityType.SA_QUESTION,
            ActivityType.LA_QUESTION,
            ActivityType.ARTICLE_RATING,
          ]),
        ),
      )
      .orderBy(desc(userActivity.updatedAt));

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
    let articleRows: any[] = [];
    if (reminderArticleIds.length) {
      articleRows = await db.select().from(articles)
        .where(inArray(articles.id, reminderArticleIds));
    }

    // Create article map for quick lookup
    const articleDetailMap = new Map();
    articleRows.forEach((article) => {
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