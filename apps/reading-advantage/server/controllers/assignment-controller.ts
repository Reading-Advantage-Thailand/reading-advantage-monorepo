import { NextResponse } from "next/server";
import { ExtendedNextRequest, assertSelfOrAllowedStaff } from "./auth-controller";
import {
  AssignmentMetrics,
  MetricsAssignmentsResponse,
} from "@/types/dashboard";
import {
  db,
  eq,
  and,
  or,
  gte,
  lt,
  lte,
  inArray,
  desc,
  ilike,
  sql,
} from "@reading-advantage/db";
import {
  users,
  classrooms,
  classroomTeachers,
  classroomStudents,
  assignments,
  studentAssignments,
  articles,
} from "@reading-advantage/db/schema";

interface StudentAssignment {
  id: string;
  assignmentId?: string;
  classroomId: string;
  articleId: string;
  title: string | null;
  description: string | null;
  dueDate: string;
  status: number;
  createdAt: string;
  userId: string | null;
  displayName?: string;
  teacherDisplayName?: string;
}

async function checkClassroomAccess(classroomId: string, user: any) {
  if (!user || !user.role) return false;
  if (user.role === "SYSTEM") return true;

  if (user.role === "TEACHER") {
    const [row] = await db
      .select({ teacherId: classroomTeachers.teacherId })
      .from(classroomTeachers)
      .where(
        and(
          eq(classroomTeachers.classroomId, classroomId),
          eq(classroomTeachers.teacherId, user.id),
        ),
      )
      .limit(1);
    return !!row;
  } else if (user.role === "ADMIN") {
    const [[dbUser], [classroom]] = await Promise.all([
      db
        .select({ schoolId: users.schoolId })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1),
      db
        .select({ schoolId: classrooms.schoolId })
        .from(classrooms)
        .where(eq(classrooms.id, classroomId))
        .limit(1),
    ]);
    return !!(
      dbUser?.schoolId &&
      classroom?.schoolId &&
      dbUser.schoolId === classroom.schoolId
    );
  }

  return false;
}

const statusToInt = (status: string | null | undefined): number => {
  if (status === "COMPLETED") return 2;
  if (status === "IN_PROGRESS") return 1;
  return 0;
};

export async function getAssignments(req: ExtendedNextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classroomId = searchParams.get("classroomId");
    const articleId = searchParams.get("articleId");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!classroomId) {
      return NextResponse.json(
        { message: "Missing classroomId in query parameters" },
        { status: 400 },
      );
    }

    const sessionUser = req.session?.user;
    if (!sessionUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await checkClassroomAccess(classroomId, sessionUser);
    if (!hasAccess) {
      return NextResponse.json(
        { message: "Forbidden - You do not have access to this classroom" },
        { status: 403 },
      );
    }

    if (articleId) {
      // Get assignment for specific article and classroom
      const [assignment] = await db
        .select({
          id: assignments.id,
          title: assignments.title,
          description: assignments.description,
          dueDate: assignments.dueDate,
          classroomId: assignments.classroomId,
          articleId: assignments.articleId,
          createdAt: assignments.createdAt,
        })
        .from(assignments)
        .where(
          and(
            eq(assignments.classroomId, classroomId),
            eq(assignments.articleId, articleId),
          ),
        )
        .orderBy(desc(assignments.createdAt))
        .limit(1);

      if (!assignment) {
        return NextResponse.json({ meta: {}, students: [] }, { status: 200 });
      }

      const saRows = await db
        .select({
          id: studentAssignments.id,
          studentId: studentAssignments.studentId,
          status: studentAssignments.status,
          studentName: users.name,
        })
        .from(studentAssignments)
        .leftJoin(users, eq(studentAssignments.studentId, users.id))
        .where(eq(studentAssignments.assignmentId, assignment.id));

      const meta = {
        title: assignment.title,
        description: assignment.description,
        dueDate: assignment.dueDate,
        classroomId: assignment.classroomId,
        articleId: assignment.articleId,
        createdAt: assignment.createdAt,
      };

      const students = saRows.map((sa) => ({
        id: sa.id,
        studentId: sa.studentId,
        status: statusToInt(sa.status),
        displayName: sa.studentName,
      }));

      return NextResponse.json({ meta, students }, { status: 200 });
    } else {
      // Get all assignments for classroom
      const searchLower = search?.toLowerCase().trim();

      const baseWhere = and(
        eq(assignments.classroomId, classroomId),
        searchLower
          ? or(
              ilike(assignments.title, `%${searchLower}%`),
              ilike(assignments.description, `%${searchLower}%`),
            )
          : undefined,
      );

      const [[{ count: totalCount }], assignmentRows] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(assignments)
          .where(baseWhere),
        db
          .select({
            id: assignments.id,
            title: assignments.title,
            description: assignments.description,
            dueDate: assignments.dueDate,
            classroomId: assignments.classroomId,
            articleId: assignments.articleId,
            createdAt: assignments.createdAt,
            articleTitle: articles.title,
            articleSummary: articles.summary,
          })
          .from(assignments)
          .leftJoin(articles, eq(assignments.articleId, articles.id))
          .where(baseWhere)
          .orderBy(desc(assignments.createdAt))
          .limit(limit)
          .offset((page - 1) * limit),
      ]);

      const assignmentIds = assignmentRows.map((a) => a.id);
      const saRows =
        assignmentIds.length > 0
          ? await db
              .select({
                id: studentAssignments.id,
                assignmentId: studentAssignments.assignmentId,
                studentId: studentAssignments.studentId,
                status: studentAssignments.status,
                studentName: users.name,
              })
              .from(studentAssignments)
              .leftJoin(users, eq(studentAssignments.studentId, users.id))
              .where(inArray(studentAssignments.assignmentId, assignmentIds))
          : [];

      const saByAssignment = new Map<string, typeof saRows>();
      saRows.forEach((sa) => {
        if (!saByAssignment.has(sa.assignmentId))
          saByAssignment.set(sa.assignmentId, []);
        saByAssignment.get(sa.assignmentId)!.push(sa);
      });

      const result = assignmentRows.map((a) => ({
        articleId: a.articleId,
        meta: {
          title: a.title,
          description: a.description,
          dueDate: a.dueDate,
          classroomId: a.classroomId,
          articleId: a.articleId,
          createdAt: a.createdAt,
        },
        students: (saByAssignment.get(a.id) || []).map((sa) => ({
          id: sa.id,
          studentId: sa.studentId,
          status: statusToInt(sa.status),
          displayName: sa.studentName,
        })),
        article: a.articleId
          ? { id: a.articleId, title: a.articleTitle, summary: a.articleSummary }
          : null,
      }));

      const totalPages = Math.ceil(totalCount / limit);

      return NextResponse.json(
        {
          assignments: result,
          pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            limit,
          },
        },
        { status: 200 },
      );
    }
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function postAssignment(req: ExtendedNextRequest) {
  try {
    const data = await req.json();

    const {
      classroomId,
      articleId,
      title,
      description,
      dueDate,
      selectedStudents,
    } = data;

    if (
      !classroomId ||
      !articleId ||
      !selectedStudents ||
      !Array.isArray(selectedStudents)
    ) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 },
      );
    }

    const sessionUser = req.session?.user;
    if (!sessionUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await checkClassroomAccess(classroomId, sessionUser);
    if (!hasAccess) {
      return NextResponse.json(
        { message: "Forbidden - You do not have access to this classroom" },
        { status: 403 },
      );
    }

    // Verify all selectedStudents belong to the classroom
    const [{ count: validStudentsCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(classroomStudents)
      .where(
        and(
          eq(classroomStudents.classroomId, classroomId),
          inArray(classroomStudents.studentId, selectedStudents),
        ),
      );

    if (validStudentsCount !== selectedStudents.length) {
      return NextResponse.json(
        {
          message:
            "One or more selected students do not belong to the target classroom",
        },
        { status: 400 },
      );
    }

    // Check if classroom and article exist
    const [[classroom], [article]] = await Promise.all([
      db
        .select({ id: classrooms.id })
        .from(classrooms)
        .where(eq(classrooms.id, classroomId))
        .limit(1),
      db
        .select({ id: articles.id })
        .from(articles)
        .where(eq(articles.id, articleId))
        .limit(1),
    ]);

    if (!classroom) {
      return NextResponse.json(
        { message: "Classroom not found" },
        { status: 404 },
      );
    }

    if (!article) {
      return NextResponse.json(
        { message: "Article not found" },
        { status: 404 },
      );
    }

    // Find or create assignment
    let [assignment] = await db
      .select({ id: assignments.id })
      .from(assignments)
      .where(
        and(
          eq(assignments.classroomId, classroomId),
          eq(assignments.articleId, articleId),
        ),
      )
      .limit(1);

    if (!assignment) {
      [assignment] = await db
        .insert(assignments)
        .values({
          classroomId,
          articleId,
          title: title || null,
          description: description || null,
          dueDate: dueDate ? new Date(dueDate) : null,
        })
        .returning({ id: assignments.id });
    }

    // Get existing student assignments
    const existingRows = await db
      .select({ studentId: studentAssignments.studentId })
      .from(studentAssignments)
      .where(eq(studentAssignments.assignmentId, assignment.id));

    const existingStudentIds = new Set(existingRows.map((r) => r.studentId));
    const newStudentIds = (selectedStudents as string[]).filter(
      (id) => !existingStudentIds.has(id),
    );

    if (newStudentIds.length === 0) {
      return NextResponse.json(
        { message: "All students already have this assignment" },
        { status: 200 },
      );
    }

    const createdRows = await db
      .insert(studentAssignments)
      .values(
        newStudentIds.map((studentId) => ({
          assignmentId: assignment.id,
          studentId,
          status: "NOT_STARTED",
        })),
      )
      .onConflictDoNothing()
      .returning({ id: studentAssignments.id });

    return NextResponse.json(
      {
        message: `${createdRows.length} student assignments created successfully`,
        assignmentId: assignment.id,
        created: createdRows.length,
        skipped: selectedStudents.length - createdRows.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error creating assignment:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function updateAssignment(req: ExtendedNextRequest) {
  try {
    const data = await req.json();
    const { classroomId, articleId, studentId, updates } = data;

    if (!classroomId || !articleId || !updates) {
      return NextResponse.json(
        {
          message:
            "Missing required fields: classroomId, articleId, or updates",
        },
        { status: 400 },
      );
    }

    const sessionUser = req.session?.user;
    if (!sessionUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await checkClassroomAccess(classroomId, sessionUser);
    if (!hasAccess) {
      return NextResponse.json(
        { message: "Forbidden - You do not have access to this classroom" },
        { status: 403 },
      );
    }

    if (studentId === "meta") {
      const allowedMetaFields = ["title", "description", "dueDate"];
      const filteredUpdates: any = {};

      for (const key of allowedMetaFields) {
        if (Object.prototype.hasOwnProperty.call(updates, key)) {
          if (key === "dueDate" && updates[key]) {
            filteredUpdates[key] = new Date(updates[key]);
          } else {
            filteredUpdates[key] = updates[key];
          }
        }
      }

      if (Object.keys(filteredUpdates).length === 0) {
        return NextResponse.json(
          { message: "No valid metadata fields to update" },
          { status: 400 },
        );
      }

      const updatedRows = await db
        .update(assignments)
        .set(filteredUpdates)
        .where(
          and(
            eq(assignments.classroomId, classroomId),
            eq(assignments.articleId, articleId),
          ),
        )
        .returning({ id: assignments.id });

      return NextResponse.json(
        {
          message: "Assignment metadata updated successfully",
          updatedCount: updatedRows.length,
        },
        { status: 200 },
      );
    } else {
      if (!studentId) {
        return NextResponse.json(
          { message: "Missing studentId for individual assignment update" },
          { status: 400 },
        );
      }

      const [assignment] = await db
        .select({ id: assignments.id })
        .from(assignments)
        .where(
          and(
            eq(assignments.classroomId, classroomId),
            eq(assignments.articleId, articleId),
          ),
        )
        .limit(1);

      if (!assignment) {
        return NextResponse.json(
          { message: "Assignment not found" },
          { status: 404 },
        );
      }

      const studentAssignmentUpdates: any = {};

      if (Object.prototype.hasOwnProperty.call(updates, "status")) {
        studentAssignmentUpdates.status = updates.status as string;

        if (updates.status === "IN_PROGRESS" && !updates.startedAt) {
          studentAssignmentUpdates.startedAt = new Date();
        } else if (updates.status === "COMPLETED" && !updates.completedAt) {
          studentAssignmentUpdates.completedAt = new Date();
        }
      }

      if (Object.prototype.hasOwnProperty.call(updates, "startedAt")) {
        studentAssignmentUpdates.startedAt = updates.startedAt
          ? new Date(updates.startedAt)
          : null;
      }

      if (Object.prototype.hasOwnProperty.call(updates, "completedAt")) {
        studentAssignmentUpdates.completedAt = updates.completedAt
          ? new Date(updates.completedAt)
          : null;
      }

      if (Object.prototype.hasOwnProperty.call(updates, "score")) {
        studentAssignmentUpdates.score = updates.score;
      }

      if (Object.keys(studentAssignmentUpdates).length === 0) {
        return NextResponse.json(
          { message: "No valid fields to update" },
          { status: 400 },
        );
      }

      const [updatedStudentAssignment] = await db
        .insert(studentAssignments)
        .values({
          assignmentId: assignment.id,
          studentId,
          ...studentAssignmentUpdates,
          status: studentAssignmentUpdates.status || "NOT_STARTED",
        })
        .onConflictDoUpdate({
          target: [studentAssignments.assignmentId, studentAssignments.studentId],
          set: studentAssignmentUpdates,
        })
        .returning();

      return NextResponse.json(
        {
          message: "Student assignment updated successfully",
          studentAssignment: updatedStudentAssignment,
        },
        { status: 200 },
      );
    }
  } catch (error) {
    console.error("Error updating assignment:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function getStudentAssignments(req: ExtendedNextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const status = searchParams.get("status");
    const dueDateFilter = searchParams.get("dueDateFilter");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const sessionUser = req.session?.user;
    if (!sessionUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let targetStudentId = studentId;
    if (!targetStudentId || !assertSelfOrAllowedStaff(req, targetStudentId)) {
      targetStudentId = sessionUser.id;
    }

    // Map numeric status to string
    let statusFilter: string | undefined;
    if (status && status !== "all") {
      switch (status) {
        case "0":
          statusFilter = "NOT_STARTED";
          break;
        case "1":
          statusFilter = "IN_PROGRESS";
          break;
        case "2":
          statusFilter = "COMPLETED";
          break;
        default:
          statusFilter = status;
      }
    }

    // Due date conditions
    let dueDateCondition: any = undefined;
    if (dueDateFilter && dueDateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      switch (dueDateFilter) {
        case "overdue":
          dueDateCondition = lt(assignments.dueDate, today);
          break;
        case "today":
          dueDateCondition = and(
            gte(assignments.dueDate, today),
            lt(assignments.dueDate, tomorrow),
          );
          break;
        case "upcoming":
          dueDateCondition = gte(assignments.dueDate, tomorrow);
          break;
      }
    }

    const searchLower = search?.toLowerCase().trim();
    const searchCondition = searchLower
      ? or(
          ilike(assignments.title, `%${searchLower}%`),
          ilike(assignments.description, `%${searchLower}%`),
        )
      : undefined;

    const whereClause = and(
      eq(studentAssignments.studentId, targetStudentId),
      statusFilter ? eq(studentAssignments.status, statusFilter) : undefined,
      searchCondition,
      dueDateCondition,
    );

    const [[{ count: totalCount }], saRows] = await Promise.all([
      db
        .select({ count: sql<number>`count(DISTINCT ${studentAssignments.id})::int` })
        .from(studentAssignments)
        .innerJoin(assignments, eq(studentAssignments.assignmentId, assignments.id))
        .where(whereClause),
      db
        .select({
          id: studentAssignments.id,
          studentId: studentAssignments.studentId,
          status: studentAssignments.status,
          createdAt: studentAssignments.createdAt,
          assignmentId: assignments.id,
          classroomId: assignments.classroomId,
          articleId: assignments.articleId,
          assignmentTitle: assignments.title,
          assignmentDescription: assignments.description,
          dueDate: assignments.dueDate,
          articleTitle: articles.title,
          articleSummary: articles.summary,
          classroomName: classrooms.name,
          studentName: users.name,
        })
        .from(studentAssignments)
        .innerJoin(assignments, eq(studentAssignments.assignmentId, assignments.id))
        .leftJoin(articles, eq(assignments.articleId, articles.id))
        .leftJoin(classrooms, eq(assignments.classroomId, classrooms.id))
        .innerJoin(users, eq(studentAssignments.studentId, users.id))
        .where(whereClause)
        .orderBy(desc(studentAssignments.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
    ]);

    // Get first teacher per classroom
    const classroomIds = [
      ...new Set(saRows.map((r) => r.classroomId).filter(Boolean)),
    ];
    const teacherNameMap = new Map<string, string>();
    if (classroomIds.length > 0) {
      const teacherRows = await db
        .select({
          classroomId: classroomTeachers.classroomId,
          teacherName: users.name,
        })
        .from(classroomTeachers)
        .innerJoin(users, eq(classroomTeachers.teacherId, users.id))
        .where(inArray(classroomTeachers.classroomId, classroomIds));

      teacherRows.forEach((row) => {
        if (!teacherNameMap.has(row.classroomId)) {
          teacherNameMap.set(row.classroomId, row.teacherName || "Unknown Teacher");
        }
      });
    }

    const formattedAssignments: StudentAssignment[] = saRows.map((sa) => ({
      id: sa.id,
      assignmentId: sa.assignmentId,
      classroomId: sa.classroomId,
      articleId: sa.articleId ?? "",
      title: sa.assignmentTitle,
      description: sa.assignmentDescription,
      dueDate: sa.dueDate ? sa.dueDate.toISOString() : "",
      status: statusToInt(sa.status),
      createdAt: sa.createdAt.toISOString(),
      userId: sa.studentId,
      displayName: sa.studentName || "Unknown User",
      teacherDisplayName:
        teacherNameMap.get(sa.classroomId) || "Unknown Teacher",
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json(
      {
        assignments: formattedAssignments,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          limit,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching student assignments:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function deleteAssignment(req: ExtendedNextRequest) {
  try {
    const data = await req.json();
    const { classroomId, articleId, studentIds } = data;

    if (
      !classroomId ||
      !articleId ||
      !studentIds ||
      !Array.isArray(studentIds) ||
      studentIds.length === 0
    ) {
      return NextResponse.json(
        {
          message:
            "Missing required fields: classroomId, articleId, or studentIds array",
        },
        { status: 400 },
      );
    }

    const sessionUser = req.session?.user;
    if (!sessionUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await checkClassroomAccess(classroomId, sessionUser);
    if (!hasAccess) {
      return NextResponse.json(
        { message: "Forbidden - You do not have access to this classroom" },
        { status: 403 },
      );
    }

    const [assignment] = await db
      .select({ id: assignments.id })
      .from(assignments)
      .where(
        and(
          eq(assignments.classroomId, classroomId),
          eq(assignments.articleId, articleId),
        ),
      )
      .limit(1);

    if (!assignment) {
      return NextResponse.json(
        { message: "Assignment not found" },
        { status: 404 },
      );
    }

    const deletedRows = await db
      .delete(studentAssignments)
      .where(
        and(
          eq(studentAssignments.assignmentId, assignment.id),
          inArray(studentAssignments.studentId, studentIds),
        ),
      )
      .returning({ id: studentAssignments.id });

    if (deletedRows.length === 0) {
      return NextResponse.json(
        { message: "No student assignments found to delete" },
        { status: 404 },
      );
    }

    // Check if assignment should be deleted
    const [{ count: remainingCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(studentAssignments)
      .where(eq(studentAssignments.assignmentId, assignment.id));

    if (remainingCount === 0) {
      await db
        .delete(assignments)
        .where(eq(assignments.id, assignment.id));
    }

    return NextResponse.json(
      {
        message: `${deletedRows.length} student assignment(s) deleted successfully`,
        deletedCount: deletedRows.length,
        assignmentDeleted: remainingCount === 0,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting assignments:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function getAssignmentMetrics(req: ExtendedNextRequest) {
  const startTime = Date.now();

  try {
    const session = req.session;
    if (!session) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get("timeframe") || "30d";
    const schoolId = searchParams.get("schoolId");
    const classId = searchParams.get("classId");

    const now = new Date();
    let daysAgo = 30;

    if (timeframe === "7d") daysAgo = 7;
    else if (timeframe === "30d") daysAgo = 30;
    else if (timeframe === "90d") daysAgo = 90;
    else if (timeframe === "365d") daysAgo = 365;
    else if (timeframe === "all") daysAgo = 36500;

    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysAgo);

    const assignmentRows = schoolId
      ? await db
          .select({
            id: assignments.id,
            title: assignments.title,
            dueDate: assignments.dueDate,
            createdAt: assignments.createdAt,
            articleId: assignments.articleId,
          })
          .from(assignments)
          .innerJoin(classrooms, eq(assignments.classroomId, classrooms.id))
          .where(
            and(
              gte(assignments.createdAt, startDate),
              classId ? eq(assignments.classroomId, classId) : undefined,
              eq(classrooms.schoolId, schoolId),
            ),
          )
          .orderBy(desc(assignments.createdAt))
      : await db
          .select({
            id: assignments.id,
            title: assignments.title,
            dueDate: assignments.dueDate,
            createdAt: assignments.createdAt,
            articleId: assignments.articleId,
          })
          .from(assignments)
          .where(
            and(
              gte(assignments.createdAt, startDate),
              classId ? eq(assignments.classroomId, classId) : undefined,
            ),
          )
          .orderBy(desc(assignments.createdAt));

    const assignmentIds = assignmentRows.map((a) => a.id);
    const saRows =
      assignmentIds.length > 0
        ? await db
            .select({
              assignmentId: studentAssignments.assignmentId,
              status: studentAssignments.status,
              score: studentAssignments.score,
            })
            .from(studentAssignments)
            .where(inArray(studentAssignments.assignmentId, assignmentIds))
        : [];

    const saByAssignment = new Map<string, typeof saRows>();
    saRows.forEach((sa) => {
      if (!saByAssignment.has(sa.assignmentId))
        saByAssignment.set(sa.assignmentId, []);
      saByAssignment.get(sa.assignmentId)!.push(sa);
    });

    const assignmentMetrics: AssignmentMetrics[] = assignmentRows.map((a) => {
      const sas = saByAssignment.get(a.id) || [];
      const total = sas.length;
      const completed = sas.filter((sa) => sa.status === "COMPLETED").length;
      const inProgress = sas.filter((sa) => sa.status === "IN_PROGRESS").length;
      const notStarted = sas.filter((sa) => sa.status === "NOT_STARTED").length;

      const scores = sas
        .filter((sa) => sa.score !== null)
        .map((sa) => sa.score!);

      const averageScore =
        scores.length > 0
          ? scores.reduce((sum, score) => sum + score, 0) / scores.length
          : 0;

      const completionRate = total > 0 ? (completed / total) * 100 : 0;

      return {
        assignmentId: a.id,
        articleId: a.articleId,
        title: a.title || "Untitled Assignment",
        dueDate: a.dueDate?.toISOString(),
        assigned: total,
        completed,
        inProgress,
        notStarted,
        averageScore: Math.round(averageScore * 100) / 100,
        completionRate: Math.round(completionRate * 10) / 10,
      };
    });

    const totalAssignments = assignmentMetrics.length;
    const averageCompletionRate =
      totalAssignments > 0
        ? assignmentMetrics.reduce((sum, a) => sum + a.completionRate, 0) /
          totalAssignments
        : 0;

    const allScores = assignmentMetrics
      .filter((a) => a.averageScore > 0)
      .map((a) => a.averageScore);

    const averageScore =
      allScores.length > 0
        ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length
        : 0;

    const response: MetricsAssignmentsResponse = {
      timeframe,
      assignments: assignmentMetrics,
      summary: {
        totalAssignments,
        averageCompletionRate: Math.round(averageCompletionRate * 10) / 10,
        averageScore: Math.round(averageScore * 100) / 100,
      },
      cache: { cached: false, generatedAt: new Date().toISOString() },
    };

    const duration = Date.now() - startTime;

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=240",
        "X-Response-Time": `${duration}ms`,
      },
    });
  } catch (error) {
    console.error("[Controller] getAssignmentMetrics - Error:", error);

    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch assignment metrics",
        details: error instanceof Error ? { error: error.message } : {},
      },
      {
        status: 500,
        headers: { "X-Response-Time": `${Date.now() - startTime}ms` },
      },
    );
  }
}
