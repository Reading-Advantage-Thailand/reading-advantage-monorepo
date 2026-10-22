import {
  db,
  eq,
  and,
  desc,
  ilike,
  count,
  or,
  inArray,
} from '@reading-advantage/db';
import {
  assignments,
  articles,
  classrooms,
  classroomStudents,
  studentAssignments,
  users,
} from '@reading-advantage/db';
import { recordLessonStep } from "./classBookController";
import { NextRequest, NextResponse } from "next/server";
import getAssignmentById, {
  AssignmentForbiddenError,
  createAssignment,
  getStudentAssignments,
  getUserLessonProgress,
  updateUserLessonProgress,
  getAssignmentActivityById,
} from "../models/assignmentModel";
import { currentUser } from "@/lib/session";
import { studentViewModeFor } from "@/lib/student-view";
import { logger } from "@/lib/observability/logger";
import {
  canManageClassroom,
  canReadStudentRecords,
  isAssignmentManager,
} from "../utils/assignment-access";
import { CreateAssignmentBodySchema, LessonProgressBodySchema, uuidText } from "./assignment-schemas";

/**
 * Maps one joined student-assignment row to the student entry of the assignment dashboard.
 * A missing status (rows made by the app before 2026-10-21) counts as not started.
 * @param row The row with the student assignment id, student id, status, name, and username.
 * @returns The entry with the status code (0 not started, 1 in progress, 2 completed) and the name.
 */
export function toAssignmentStudent(row: {
  studentAssignmentId: string | null;
  studentAssignmentStudentId: string | null;
  studentAssignmentStatus: string | null;
  studentName: string | null;
  studentUsername: string | null;
}) {
  const status = row.studentAssignmentStatus === "IN_PROGRESS" ? 1 : row.studentAssignmentStatus === "COMPLETED" ? 2 : 0;
  return {
    id: row.studentAssignmentId,
    studentId: row.studentAssignmentStudentId,
    status,
    displayName: row.studentName || row.studentUsername || undefined,
  };
}

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

/**
 * Lists the assignments of a class, or reads one assignment by id, for the staff of the class.
 * @param req The request with the `classroomId`, `articleId`, `id`, `search`, `page`, and `limit` query.
 * @returns 401 without a session, 403 for a non-staff role or a class the caller does not manage,
 *   400 without a class or an assignment id (except SYSTEM), else the assignment list.
 */
export async function fetchAssignments(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    if (!isAssignmentManager(user)) return forbidden();
    const role = String(user.role ?? "").toUpperCase();
    const { searchParams } = new URL(req.url);
    const classroomId = searchParams.get("classroomId");
    const articleId = searchParams.get("articleId");
    const assignmentId = searchParams.get("id");

    if (!classroomId && !assignmentId && role !== "SYSTEM") {
      return NextResponse.json({ error: "classroomId or id is required" }, { status: 400 });
    }
    if (assignmentId) {
      const [owner] = await db
        .select({ classroomId: assignments.classroomId })
        .from(assignments)
        .where(eq(assignments.id, assignmentId))
        .limit(1);
      if (owner && !(await canManageClassroom(user, owner.classroomId))) return forbidden();
      if (!owner && role !== "SYSTEM" && !classroomId) {
        return NextResponse.json({ meta: {}, students: [] }, { status: 200 });
      }
    }
    if (classroomId && !(await canManageClassroom(user, classroomId))) return forbidden();
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (articleId || assignmentId) {
      // Get assignment for specific article and classroom

      // Build the where clause incrementally so we keep parity with the
      // Prisma `where: { classroomId: ? , articleId: ?, id: ? }` semantics.
      const conditions: any[] = [];
      if (classroomId) conditions.push(eq(assignments.classroomId, classroomId));
      if (articleId) conditions.push(eq(assignments.articleId, articleId));
      if (assignmentId) conditions.push(eq(assignments.id, assignmentId));

      const assignmentRows = await db.select({
        id: assignments.id,
        title: assignments.title,
        description: assignments.description,
        dueDate: assignments.dueDate,
        classroomId: assignments.classroomId,
        articleId: assignments.articleId,
        createdAt: assignments.createdAt,
        articleTitle: articles.title,
        articleSummary: articles.summary,
        classroomName: classrooms.name,
        studentAssignmentId: studentAssignments.id,
        studentAssignmentStudentId: studentAssignments.studentId,
        studentAssignmentStatus: studentAssignments.status,
        studentName: users.name,
        studentUsername: users.displayUsername,
      })
        .from(assignments)
        .leftJoin(articles, eq(articles.id, assignments.articleId))
        .leftJoin(classrooms, eq(classrooms.id, assignments.classroomId))
        .leftJoin(
          studentAssignments,
          eq(studentAssignments.assignmentId, assignments.id),
        )
        .leftJoin(users, eq(users.id, studentAssignments.studentId))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(assignments.createdAt));

      if (!assignmentRows.length) {
        return NextResponse.json({ meta: {}, students: [] }, { status: 200 });
      }

      // The original Prisma `include` would have returned nested arrays.
      // We mimic that by stitching across the rows that share an assignment id.
      const first = assignmentRows[0];
      const meta = {
        id: first.id,
        title: first.title,
        description: first.description,
        dueDate: first.dueDate,
        classroomId: first.classroomId,
        articleId: first.articleId,
        createdAt: first.createdAt,
        articleTitle: first.articleTitle,
      };

      // Stitch AssignmentStudent rows with the student name.
      const students = assignmentRows
        .filter((row) => row.studentAssignmentId)
        .map(toAssignmentStudent);

      return NextResponse.json({ meta, students }, { status: 200 });
    } else {
      // Get all assignments for classroom
      const whereConditions: any[] = [];
      if (classroomId) whereConditions.push(eq(assignments.classroomId, classroomId));

      let searchTerm: string | null = null;
      if (search && search.trim() !== "") {
        searchTerm = search.trim().toLowerCase();
      }

      const [countRow] = await db.select({ value: count() })
        .from(assignments)
        .where(whereConditions.length ? and(...whereConditions) : undefined);
      const totalCount = Number(countRow?.value ?? 0);

      const assignmentRows = await db.select({
        id: assignments.id,
        title: assignments.title,
        description: assignments.description,
        dueDate: assignments.dueDate,
        classroomId: assignments.classroomId,
        articleId: assignments.articleId,
        createdAt: assignments.createdAt,
        articleTitle: articles.title,
        articleSummary: articles.summary,
        studentAssignmentId: studentAssignments.id,
        studentAssignmentStudentId: studentAssignments.studentId,
        studentAssignmentStatus: studentAssignments.status,
        studentName: users.name,
        studentUsername: users.displayUsername,
      })
        .from(assignments)
        .leftJoin(articles, eq(articles.id, assignments.articleId))
        .leftJoin(
          studentAssignments,
          eq(studentAssignments.assignmentId, assignments.id),
        )
        .leftJoin(users, eq(users.id, studentAssignments.studentId))
        .where(whereConditions.length ? and(...whereConditions) : undefined)
        .orderBy(desc(assignments.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

      // Apply search filter on title/description (mirrors Prisma's
      // OR + contains + mode: 'insensitive' on the joined assignment row).
      let filteredRows = assignmentRows;
      if (searchTerm) {
        filteredRows = assignmentRows.filter((row) => {
          const t = (row.title ?? "").toLowerCase();
          const d = (row.description ?? "").toLowerCase();
          return t.includes(searchTerm!) || d.includes(searchTerm!);
        });
      }

      // Stitch assignment → students mapping. Group by assignment id.
      const groupedByAssignment = new Map<string, any[]>();
      for (const row of filteredRows) {
        if (!groupedByAssignment.has(row.id)) {
          groupedByAssignment.set(row.id, []);
        }
        if (row.studentAssignmentId) {
          groupedByAssignment.get(row.id)!.push(row);
        }
      }

      // Transform assignments to include student data
      const result = Array.from(groupedByAssignment.entries()).map(([assignmentIdValue, rows]) => {
        const row = rows[0];
        return {
          articleId: row.articleId,
          meta: {
            id: row.id,
            title: row.title,
            description: row.description,
            dueDate: row.dueDate,
            classroomId: row.classroomId,
            articleId: row.articleId,
            createdAt: row.createdAt,
            articleTitle: row.articleTitle,
          },
          students: rows.map(toAssignmentStudent),
          article: {
            id: row.articleId,
            title: row.articleTitle,
            summary: row.articleSummary,
          },
        };
      });

      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return NextResponse.json(
        {
          assignments: result,
          pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            hasNextPage,
            hasPrevPage,
            limit,
          },
        },
        { status: 200 },
      );
    }
  } catch (error) {
    logger.error("assignments_fetch_failed", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Creates an article assignment. Only the teacher of the class, an ADMIN of its school, or SYSTEM may.
 * @param req The request with the assignment body.
 * @returns 401 without a session, 403 for another role or class, 400 for a bad body or a student
 *   outside the class, 200 on success, 500 on a model failure.
 */
export async function postAssignment(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    if (!isAssignmentManager(user)) return forbidden();

    const parsed = CreateAssignmentBodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
    }
    const data = parsed.data;
    if (!(await canManageClassroom(user, data.classroomId))) return forbidden();

    const students = [...new Set(data.students)];
    const enrolled = await db
      .select({ studentId: classroomStudents.studentId })
      .from(classroomStudents)
      .where(and(eq(classroomStudents.classroomId, data.classroomId), inArray(classroomStudents.studentId, students)));
    if (enrolled.length !== students.length) {
      return NextResponse.json({ error: "A student is not in the class" }, { status: 400 });
    }

    await createAssignment({ ...data, students });

    return NextResponse.json(
      { message: "Assignment created successfully" },
      { status: 200 },
    );
  } catch (error) {
    logger.error("assignment_create_failed", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Lists the assignments of one student. The student, SYSTEM, or staff of a class of the student may read.
 * @param request The request with the paging and filter query.
 * @param context The route params with the student id.
 * @returns 401 without a session, 403 for another student or an unrelated staff member, else the list.
 */
export async function fetchStudentAssignments(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    if (!(await canReadStudentRecords(user, id))) return forbidden();
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const dueDateFilter = searchParams.get("dueDateFilter");
    const search = searchParams.get("search");

    const result = await getStudentAssignments({
      studentId: id,
      page,
      limit,
      status,
      dueDateFilter,
      search,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    logger.error("student_assignments_fetch_failed", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function fetchAssignmentById(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) return unauthorized();
    const { id } = await params;
    const assignment = await getAssignmentById(id);

    return NextResponse.json(assignment, { status: 200 });
  } catch (error) {
    if (error instanceof AssignmentForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    logger.error("assignment_fetch_failed", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function postUserLessonProgress(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: assignmentId } = await params;
    if (!uuidText.safeParse(assignmentId).success) {
      return NextResponse.json({ error: "Invalid assignment id" }, { status: 400 });
    }
    const parsed = LessonProgressBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
    }
    const { articleId, progress, timeSpent } = parsed.data;

    const [assigned] = await db
      .select({ id: studentAssignments.id, articleId: assignments.articleId })
      .from(studentAssignments)
      .innerJoin(assignments, eq(assignments.id, studentAssignments.assignmentId))
      .where(and(eq(studentAssignments.assignmentId, assignmentId), eq(studentAssignments.studentId, user.id)))
      .limit(1);
    if (!assigned) return forbidden();
    // The progress must be for the article of this assignment.
    if (assigned.articleId !== articleId) {
      return NextResponse.json({ error: "Article is not part of this assignment" }, { status: 400 });
    }

    await updateUserLessonProgress(
      user.id,
      assignmentId,
      articleId,
      progress,
      timeSpent,
    );

    if (typeof articleId === "string" && typeof progress === "number") {
      await recordLessonStep(user, articleId, progress, Number(timeSpent), "assignment lesson");
    }

    return NextResponse.json(
      { message: "User lesson progress updated successfully" },
      { status: 200 },
    );
  } catch (error) {
    logger.error("assignment_progress_save_failed", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function fetchUserLessonProgress(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: assignmentId } = await params;

    const userLessonProgress = await getUserLessonProgress(
      user.id,
      assignmentId,
    );

    return NextResponse.json({ userLessonProgress }, { status: 200 });
  } catch (error) {
    logger.error("assignment_progress_fetch_failed", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function fetchAssignmentActivityById(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Staff in a preview have no activity row of their own: the empty model.
    if (studentViewModeFor(user.role) === "preview") return NextResponse.json({ assignmentActivity: null }, { status: 200 });
    const { id } = await params;
    const assignmentActivity = await getAssignmentActivityById(id, user.id);
    return NextResponse.json({ assignmentActivity }, { status: 200 });
  } catch (error) {
    logger.error("assignment_activity_fetch_failed", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}