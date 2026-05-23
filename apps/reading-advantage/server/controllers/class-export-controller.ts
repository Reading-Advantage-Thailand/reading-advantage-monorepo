/**
 * Class Export Controller
 * Handles exporting class data in various formats
 */

import { NextResponse } from "next/server";
import { ExtendedNextRequest } from "./auth-controller";
import { db, eq, and, inArray, sql } from "@reading-advantage/db";
import { classroomTeachers, classrooms, classroomStudents, users, studentAssignments, assignments } from "@reading-advantage/db/schema";

interface RequestContext {
  params: Promise<{
    classroomId: string;
  }>;
}

async function verifyClassAccess(classroomId: string, userId: string, userRole: string): Promise<boolean> {
  if (userRole === "SYSTEM" || userRole === "ADMIN") {
    return true;
  }

  const [ct] = await db
    .select()
    .from(classroomTeachers)
    .where(and(eq(classroomTeachers.classroomId, classroomId), eq(classroomTeachers.teacherId, userId)))
    .limit(1);

  return !!ct;
}

function convertToCSV(data: any[], headers: string[]): string {
  const csvRows = [];
  csvRows.push(headers.join(","));
  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? "";
    });
    csvRows.push(values.join(","));
  }
  return csvRows.join("\n");
}

export async function exportClassData(req: ExtendedNextRequest, ctx: RequestContext) {
  try {
    const { classroomId } = await ctx.params;
    const session = req.session;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "csv";

    const hasAccess = await verifyClassAccess(classroomId, user.id, user.role as string);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const [classroom] = await db
      .select()
      .from(classrooms)
      .where(eq(classrooms.id, classroomId))
      .limit(1);

    if (!classroom) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const csRows = await db
      .select({ studentId: classroomStudents.studentId, createdAt: classroomStudents.joinedAt })
      .from(classroomStudents)
      .where(eq(classroomStudents.classroomId, classroomId));

    const studentIds = csRows.map((cs) => cs.studentId);

    const studentRows = studentIds.length > 0
      ? await db
          .select({ id: users.id, email: users.email, name: users.name, level: users.level, cefrLevel: users.cefrLevel, xp: users.xp })
          .from(users)
          .where(inArray(users.id, studentIds))
      : [];

    // Get assignment IDs for this classroom
    const assignmentRows = studentIds.length > 0
      ? await db
          .select({ id: assignments.id })
          .from(assignments)
          .where(eq(assignments.classroomId, classroomId))
      : [];
    const assignmentIds = assignmentRows.map((a) => a.id);

    // Group student assignment counts
    const saRows = studentIds.length > 0 && assignmentIds.length > 0
      ? await db
          .select({ studentId: studentAssignments.studentId, status: studentAssignments.status })
          .from(studentAssignments)
          .where(
            and(
              inArray(studentAssignments.studentId, studentIds),
              inArray(studentAssignments.assignmentId, assignmentIds)
            )
          )
      : [];

    const exportData = studentRows.map((student) => {
      const joinedAt = csRows.find((cs) => cs.studentId === student.id)?.createdAt;
      const completed = saRows.filter((sa) => sa.studentId === student.id && sa.status === "COMPLETED").length;
      const inProgress = saRows.filter((sa) => sa.studentId === student.id && sa.status === "IN_PROGRESS").length;

      return {
        studentId: student.id,
        name: student.name || "N/A",
        email: student.email,
        level: student.level,
        cefrLevel: student.cefrLevel,
        xp: student.xp,
        joinedAt: joinedAt?.toISOString() || "",
        assignmentsCompleted: completed,
        assignmentsPending: inProgress,
      };
    });

    if (format === "csv") {
      const headers = ["studentId", "name", "email", "level", "cefrLevel", "xp", "joinedAt", "assignmentsCompleted", "assignmentsPending"];
      const csv = convertToCSV(exportData, headers);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="class-${classroom.classCode}-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    } else {
      return NextResponse.json({
        classroom: { id: classroom.id, name: classroom.name, classCode: classroom.classCode },
        exportedAt: new Date().toISOString(),
        students: exportData,
      });
    }
  } catch (error) {
    console.error("Error exporting class data:", error);
    return NextResponse.json({ error: "Failed to export class data" }, { status: 500 });
  }
}
