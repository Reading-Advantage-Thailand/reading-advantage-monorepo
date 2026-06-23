import {
  db,
  eq,
  and,
  desc,
  ilike,
  count,
  or,
} from '@reading-advantage/db';
import {
  assignments,
  articles,
  classrooms,
  studentAssignments,
} from '@reading-advantage/db';
import { NextRequest, NextResponse } from "next/server";
import getAssignmentById, {
  createAssignment,
  getStudentAssignments,
  getUserLessonProgress,
  updateUserLessonProgress,
  getAssignmentActivityById,
} from "../models/assignmentModel";
import { currentUser } from "@/lib/session";

export async function fetchAssignments(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classroomId = searchParams.get("classroomId");
    const articleId = searchParams.get("articleId");
    const assignmentId = searchParams.get("id");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (articleId || assignmentId) {
      // Get assignment for specific article and classroom
      console.log("Do we get here?");

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
        studentName: studentAssignments.studentId,
      })
        .from(assignments)
        .leftJoin(articles, eq(articles.id, assignments.articleId))
        .leftJoin(classrooms, eq(classrooms.id, assignments.classroomId))
        .leftJoin(
          studentAssignments,
          eq(studentAssignments.assignmentId, assignments.id),
        )
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

      // Stitch AssignmentStudent rows (with studentId → user mapping deferred).
      const students = assignmentRows
        .filter((row) => row.studentAssignmentId)
        .map((sa) => ({
          id: sa.studentAssignmentId,
          studentId: sa.studentAssignmentStudentId,
          status:
            sa.studentAssignmentStatus === "NOT_STARTED"
              ? 0
              : sa.studentAssignmentStatus === "IN_PROGRESS"
                ? 1
                : sa.studentAssignmentStatus === "COMPLETED"
                  ? 2
                  : 0,
          displayName: undefined as string | undefined,
        }));

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
        studentName: studentAssignments.studentId,
      })
        .from(assignments)
        .leftJoin(articles, eq(articles.id, assignments.articleId))
        .leftJoin(
          studentAssignments,
          eq(studentAssignments.assignmentId, assignments.id),
        )
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
          students: rows.map((sa) => ({
            id: sa.studentAssignmentId,
            studentId: sa.studentAssignmentStudentId,
            status:
              sa.studentAssignmentStatus === "NOT_STARTED"
                ? 0
                : sa.studentAssignmentStatus === "IN_PROGRESS"
                  ? 1
                  : sa.studentAssignmentStatus === "COMPLETED"
                    ? 2
                    : 0,
            displayName: undefined as string | undefined,
          })),
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
    console.error("Error fetching assignments:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function postAssignment(req: NextRequest) {
  try {
    const { classroomId, articleId, students, name, description, dueDate } =
      await req.json();

    await createAssignment({
      classroomId,
      articleId,
      students,
      name,
      description,
      dueDate,
    });

    return NextResponse.json(
      { message: "Assignment created successfully" },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { message: error.message || "Internal server error" },
        { status: 500 },
      );
    }
  }
}

export async function fetchStudentAssignments(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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
    console.error(
      "Student Controller: Error in fetchStudentAssignments:",
      error,
    );
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
    const { id } = await params;
    const assignment = await getAssignmentById(id);

    return NextResponse.json(assignment, { status: 200 });
  } catch (error) {
    console.error("Error fetching assignment by ID:", error);
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
    const { articleId, progress, timeSpent } = await request.json();

    await updateUserLessonProgress(
      user.id,
      assignmentId,
      articleId,
      progress,
      timeSpent,
    );

    return NextResponse.json(
      { message: "User lesson progress updated successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating assignment by ID:", error);
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
    console.error("Error fetching user lesson progress:", error);
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
    const { id } = await params;
    const assignmentActivity = await getAssignmentActivityById(id, user.id);
    return NextResponse.json({ assignmentActivity }, { status: 200 });
  } catch (error) {
    console.error("Error fetching assignment activity by ID:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}