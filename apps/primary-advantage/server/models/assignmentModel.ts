import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/session";
import { AssignmentStatus } from "@prisma/client";
import { endOfDay } from "date-fns";

interface createAssignmentData {
  classroomId: string;
  articleId: string;
  students: string[];
  name: string;
  description: string;
  dueDate: Date;
}

export async function createAssignment(data: createAssignmentData) {
  try {
    const user = await currentUser();

    if (!user) {
      throw new Error("User is not authenticated");
    }

    const { classroomId, articleId, students, name, description, dueDate } =
      data;
    // Check if classroom exists
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
    });

    if (!classroom) {
      throw new Error("Classroom not found");
    }

    // Check if article exists
    const article = await prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new Error("Article not found");
    }

    // Check if assignment already exists for this classroom and article
    const existingAssignment = await prisma.assignment.findFirst({
      where: {
        classroomId,
        articleId,
      },
    });

    if (existingAssignment) {
      console.log("Assignment already exists");
      throw new Error("Assignment already exists");
    }

    // Create assignment if it doesn't exist
    if (!existingAssignment) {
      await prisma.$transaction(async (tx) => {
        const assignment = await tx.assignment.create({
          data: {
            classroomId,
            articleId,
            name,
            teacherId: user.id,
            teacherName: user.name,
            description,
            dueDate: endOfDay(new Date(dueDate)),
          },
        });

        const studentAssignmentsData = students.map((studentId: string) => ({
          assignmentId: assignment.id,
          studentId,
        }));

        await tx.assignmentStudent.createMany({
          data: studentAssignmentsData,
        });
      });

      return { success: true };
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to create assignment");
  }
}

interface GetStudentAssignmentsParams {
  studentId: string;
  page: number;
  limit: number;
  status?: string | null;
  dueDateFilter?: string | null;
  search?: string | null;
}

export async function getStudentAssignments(
  params: GetStudentAssignmentsParams,
) {
  try {
    const { studentId, page, limit, status, dueDateFilter, search } = params;

    // Build where clause
    const whereClause: any = {
      studentId,
    };

    // Apply status filter
    if (status && status !== "all") {
      const statusValue = parseInt(status);
      if (statusValue === 0) {
        whereClause.status = "NOT_STARTED";
      } else if (statusValue === 1) {
        whereClause.status = "IN_PROGRESS";
      } else if (statusValue === 2) {
        whereClause.status = "COMPLETED";
      }
    }

    // Apply search filter on assignment name/description
    if (search && search.trim() !== "") {
      whereClause.assignment = {
        OR: [
          { name: { contains: search.trim(), mode: "insensitive" } },
          { description: { contains: search.trim(), mode: "insensitive" } },
        ],
      };
    }

    // Get total count
    const totalCount = await prisma.assignmentStudent.count({
      where: whereClause,
    });

    // Get paginated assignments
    let assignments = await prisma.assignmentStudent.findMany({
      where: whereClause,
      include: {
        assignment: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Apply due date filter (client-side filter since it requires date comparison)
    if (dueDateFilter && dueDateFilter !== "all") {
      const now = new Date();
      assignments = assignments.filter((sa) => {
        const dueDate = new Date(sa.assignment.dueDate);

        switch (dueDateFilter) {
          case "overdue":
            return dueDate < now;
          case "today":
            return dueDate.toDateString() === now.toDateString();
          case "upcoming":
            return dueDate > now;
          default:
            return true;
        }
      });
    }

    // Calculate pagination
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      assignments,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage,
        limit,
      },
    };
  } catch (error) {
    console.error("Model Error - getStudentAssignments:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to get student assignments");
  }
}

export default async function getAssignmentById(id: string) {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error("User is not authenticated");
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        article: {
          include: {
            sentencsAndWordsForFlashcard: true,
            multipleChoiceQuestions: true,
            shortAnswerQuestions: true,
            longAnswerQuestions: true,
          },
        },
        classroom: true,
        AssignmentStudent: { where: { studentId: user.id } },
      },
    });

    return assignment;
  } catch (error) {
    console.error("Model Error - getAssignmentById:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to get assignment by ID");
  }
}

export async function updateUserLessonProgress(
  userId: string,
  assignmentId: string,
  articleId: string,
  progress: number,
  timeSpent: number,
) {
  try {
    const existingUserLessonProgress =
      await prisma.userLessonProgress.findFirst({
        where: { userId, articleId, assignmentId },
      });

    if (existingUserLessonProgress) {
      if (progress !== 100) {
        await prisma.userLessonProgress.update({
          where: { id: existingUserLessonProgress.id },
          data: {
            progress,
            timeSpent,
          },
        });
      } else {
        await prisma.$transaction(async (tx) => {
          await tx.userLessonProgress.update({
            where: { id: existingUserLessonProgress.id },
            data: {
              progress,
              timeSpent,
            },
          });

          await tx.assignmentStudent.update({
            where: {
              assignmentId_studentId: { assignmentId, studentId: userId },
            },
            data: {
              status: AssignmentStatus.COMPLETED,
            },
          });
        });
      }
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.userLessonProgress.create({
          data: {
            userId,
            articleId,
            assignmentId,
            progress,
            timeSpent,
          },
        });

        await tx.assignmentStudent.update({
          where: {
            assignmentId_studentId: { assignmentId, studentId: userId },
          },
          data: {
            status: AssignmentStatus.IN_PROGRESS,
          },
        });

        await tx.articleActivityLog.create({
          data: {
            articleId,
            userId,
          },
        });
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Model Error - updateAssignmentById:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to update assignment by ID");
  }
}

export async function getUserLessonProgress(
  userId: string,
  assignmentId: string,
) {
  try {
    const userLessonProgress = await prisma.userLessonProgress.findFirst({
      where: { userId, assignmentId },
    });

    if (!userLessonProgress) {
      throw new Error("User lesson progress not found");
    }

    return userLessonProgress;
  } catch (error) {
    console.error("Model Error - getUserLessonProgress:", error);
    if (error instanceof Error) {
      throw error;
    }
  }
}

export async function getAssignmentActivityById(id: string, userId: string) {
  try {
    const assignmentActivity = await prisma.articleActivityLog.findFirst({
      where: { articleId: id, userId },
      select: {
        isSentenceMatchingCompleted: true,
        isSentenceOrderingCompleted: true,
        isSentenceWordOrderingCompleted: true,
        isSentenceClozeTestCompleted: true,
      },
    });

    if (!assignmentActivity) {
      throw new Error("Assignment activity not found");
    }

    return assignmentActivity;
  } catch (error) {
    console.error("Model Error - getAssignmentActivityById:", error);
    if (error instanceof Error) {
      throw error;
    }
  }
}
