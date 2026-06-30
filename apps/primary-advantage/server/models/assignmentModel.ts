import {
  db,
  eq,
  and,
  desc,
  count,
} from '@reading-advantage/db';
import {
  classrooms,
  articles,
  assignments,
  studentAssignments,
  lessonProgress,
  articleActivityLogs,
} from '@reading-advantage/db';
import { currentUser } from "@/lib/session";

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
    const [classroom] = await db.select({ id: classrooms.id })
      .from(classrooms)
      .where(eq(classrooms.id, classroomId))
      .limit(1);

    if (!classroom) {
      throw new Error("Classroom not found");
    }

    // Check if article exists
    const [article] = await db.select({ id: articles.id })
      .from(articles)
      .where(eq(articles.id, articleId))
      .limit(1);

    if (!article) {
      throw new Error("Article not found");
    }

    // Check if assignment already exists for this classroom and article
    const [existingAssignment] = await db.select({ id: assignments.id })
      .from(assignments)
      .where(
        and(
          eq(assignments.classroomId, classroomId),
          eq(assignments.articleId, articleId),
        ),
      )
      .limit(1);

    if (existingAssignment) {
      console.log("Assignment already exists");
      throw new Error("Assignment already exists");
    }

    // Create assignment if it doesn't exist
    if (!existingAssignment) {
      await db.transaction(async (tx) => {
        const [assignment] = await tx.insert(assignments).values({
          classroomId,
          articleId,
          title: name,
          teacherId: user.id,
          teacherName: user.name,
          description,
          dueDate: endOfDay(new Date(dueDate)),
        }).returning();

        const studentAssignmentsData = students.map((studentId: string) => ({
          assignmentId: assignment.id,
          studentId,
        }));

        await tx.insert(studentAssignments).values(studentAssignmentsData);
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
    const whereConditions: any[] = [eq(studentAssignments.studentId, studentId)];

    // Apply status filter
    if (status && status !== "all") {
      const statusValue = parseInt(status);
      if (statusValue === 0) {
        whereConditions.push(eq(studentAssignments.status, "NOT_STARTED"));
      } else if (statusValue === 1) {
        whereConditions.push(eq(studentAssignments.status, "IN_PROGRESS"));
      } else if (statusValue === 2) {
        whereConditions.push(eq(studentAssignments.status, "COMPLETED"));
      }
    }

    // Apply search filter on assignment name/description — implemented as
    // a manual post-filter to preserve Prisma's nested-where semantics.
    let searchTerm: string | null = null;
    if (search && search.trim() !== "") {
      searchTerm = search.trim();
    }

    // Get total count
    const [countRow] = await db.select({ value: count() })
      .from(studentAssignments)
      .where(and(...whereConditions));
    const totalCount = Number(countRow?.value ?? 0);

    // Get paginated assignments
    const assignmentsRows = await db.select({
      id: studentAssignments.id,
      assignmentId: studentAssignments.assignmentId,
      studentId: studentAssignments.studentId,
      status: studentAssignments.status,
      score: studentAssignments.score,
      startedAt: studentAssignments.startedAt,
      completedAt: studentAssignments.completedAt,
      createdAt: studentAssignments.createdAt,
      updatedAt: studentAssignments.updatedAt,
      // join assignment columns
      assignmentIdJoin: assignments.id,
      assignmentTitle: assignments.title,
      assignmentDescription: assignments.description,
      assignmentDueDate: assignments.dueDate,
      assignmentClassroomId: assignments.classroomId,
      assignmentTeacherId: assignments.teacherId,
      assignmentTeacherName: assignments.teacherName,
      assignmentArticleId: assignments.articleId,
      assignmentLessonId: assignments.lessonId,
      assignmentType: assignments.type,
      assignmentCreatedAt: assignments.createdAt,
      assignmentUpdatedAt: assignments.updatedAt,
    })
      .from(studentAssignments)
      .leftJoin(assignments, eq(assignments.id, studentAssignments.assignmentId))
      .where(and(...whereConditions))
      .orderBy(desc(studentAssignments.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    // Stitch nested assignment object for downstream code that depends on
    // the original Prisma `include: { assignment: true }` shape.
    let stitched = assignmentsRows.map((row) => ({
      id: row.id,
      assignmentId: row.assignmentId,
      studentId: row.studentId,
      status: row.status,
      score: row.score,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      assignment: row.assignmentIdJoin
        ? {
            id: row.assignmentIdJoin,
            title: row.assignmentTitle,
            description: row.assignmentDescription,
            dueDate: row.assignmentDueDate,
            classroomId: row.assignmentClassroomId,
            teacherId: row.assignmentTeacherId,
            teacherName: row.assignmentTeacherName,
            articleId: row.assignmentArticleId,
            lessonId: row.assignmentLessonId,
            type: row.assignmentType,
            createdAt: row.assignmentCreatedAt,
            updatedAt: row.assignmentUpdatedAt,
          }
        : null,
    }));

    // Apply search filter on assignment name/description
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      stitched = stitched.filter((sa) => {
        const a = sa.assignment;
        if (!a) return false;
        const title = (a.title ?? "").toLowerCase();
        const desc = (a.description ?? "").toLowerCase();
        return title.includes(term) || desc.includes(term);
      });
    }

    // Apply due date filter (client-side filter since it requires date comparison)
    if (dueDateFilter && dueDateFilter !== "all") {
      const now = new Date();
      stitched = stitched.filter((sa) => {
        const dueDate = sa.assignment?.dueDate
          ? new Date(sa.assignment.dueDate)
          : null;
        if (!dueDate) return false;
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
      assignments: stitched,
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

    const [assignment] = await db.select().from(assignments)
      .where(eq(assignments.id, id))
      .limit(1);

    if (!assignment) {
      return null;
    }

    // Attach related entities that the Prisma include used to nest.
    const [article, classroom, saRows] = await Promise.all([
      db.select().from(articles).where(eq(articles.id, assignment.articleId as string)).limit(1),
      db.select().from(classrooms).where(eq(classrooms.id, assignment.classroomId)).limit(1),
      db.select().from(studentAssignments).where(
        and(
          eq(studentAssignments.assignmentId, id),
          eq(studentAssignments.studentId, user.id),
        ),
      ),
    ]);

    // Compose `article` with its sentence/word + question children — same
    // shape the Prisma include produced.
    let articleWithChildren: any = article[0] ?? null;
    if (articleWithChildren) {
      const aId = articleWithChildren.id;
      const [sentRows, mcRows, saQuestionRows, laRows] = await Promise.all([
        db.select().from(sentencsAndWordsForFlashcardsLocal).where(eq(sentencsAndWordsForFlashcardsLocal.articleId, aId)).limit(1),
        db.select().from(multipleChoiceQuestionsLocal).where(eq(multipleChoiceQuestionsLocal.articleId, aId)),
        db.select().from(shortAnswerQuestionsLocal).where(eq(shortAnswerQuestionsLocal.articleId, aId)),
        db.select().from(longAnswerQuestionsLocal).where(eq(longAnswerQuestionsLocal.articleId, aId)),
      ]);
      articleWithChildren = {
        ...articleWithChildren,
        sentencsAndWordsForFlashcard: sentRows[0] ?? null,
        multipleChoiceQuestions: mcRows,
        shortAnswerQuestions: saQuestionRows,
        longAnswerQuestions: laRows,
      };
    }

    return {
      ...assignment,
      article: articleWithChildren,
      classroom: classroom[0] ?? null,
      AssignmentStudent: saRows,
    };
  } catch (error) {
    console.error("Model Error - getAssignmentById:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to get assignment by ID");
  }
}

// Local table aliases for the join tables used by getAssignmentById.
import {
  sentencsAndWordsForFlashcards as sentencsAndWordsForFlashcardsLocal,
  multipleChoiceQuestions as multipleChoiceQuestionsLocal,
  shortAnswerQuestions as shortAnswerQuestionsLocal,
  longAnswerQuestions as longAnswerQuestionsLocal,
} from '@reading-advantage/db';

export async function updateUserLessonProgress(
  userId: string,
  assignmentId: string,
  articleId: string,
  progress: number,
  timeSpent: number,
) {
  try {
    const [existingUserLessonProgress] = await db.select().from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, userId),
          eq(lessonProgress.articleId, articleId),
          eq(lessonProgress.assignmentId, assignmentId),
        ),
      )
      .limit(1);

    if (existingUserLessonProgress) {
      if (progress !== 100) {
        await db.update(lessonProgress)
          .set({
            progress,
            timeSpent,
            updatedAt: new Date(),
          })
          .where(eq(lessonProgress.id, existingUserLessonProgress.id));
      } else {
        await db.transaction(async (tx) => {
          await tx.update(lessonProgress)
            .set({
              progress,
              timeSpent,
              updatedAt: new Date(),
            })
            .where(eq(lessonProgress.id, existingUserLessonProgress.id));

          await tx.update(studentAssignments)
            .set({ status: "COMPLETED" })
            .where(
              and(
                eq(studentAssignments.assignmentId, assignmentId),
                eq(studentAssignments.studentId, userId),
              ),
            );
        });
      }
    } else {
      await db.transaction(async (tx) => {
        await tx.insert(lessonProgress).values({
          userId,
          articleId,
          assignmentId,
          progress,
          timeSpent,
        });

        await tx.update(studentAssignments)
          .set({ status: "IN_PROGRESS" })
          .where(
            and(
              eq(studentAssignments.assignmentId, assignmentId),
              eq(studentAssignments.studentId, userId),
            ),
          );

        await tx.insert(articleActivityLogs).values({
          articleId,
          userId,
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
    const [userLessonProgress] = await db.select().from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, userId),
          eq(lessonProgress.assignmentId, assignmentId),
        ),
      )
      .limit(1);

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
    const [assignmentActivity] = await db.select({
      isSentenceMatchingCompleted: articleActivityLogs.isSentenceMatchingCompleted,
      isSentenceOrderingCompleted: articleActivityLogs.isSentenceOrderingCompleted,
      isSentenceWordOrderingCompleted: articleActivityLogs.isSentenceWordOrderingCompleted,
      isSentenceClozeTestCompleted: articleActivityLogs.isSentenceClozeTestCompleted,
    })
      .from(articleActivityLogs)
      .where(
        and(
          eq(articleActivityLogs.articleId, id),
          eq(articleActivityLogs.userId, userId),
        ),
      )
      .limit(1);

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

// `endOfDay` is preserved via date-fns for parity with the Prisma version.
// The original file imported `endOfDay` directly; we keep that here.
import { endOfDay } from "date-fns";