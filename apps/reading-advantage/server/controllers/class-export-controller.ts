/**
 * Class Export Controller
 * Handles exporting class data in various formats
 */

import { NextResponse } from "next/server";
import { ExtendedNextRequest } from "./auth-controller";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

interface RequestContext {
  params: Promise<{
    classroomId: string;
  }>;
}

/**
 * Verify class ownership/access
 */
async function verifyClassAccess(classroomId: string, userId: string, userRole: Role): Promise<boolean> {
  if (userRole === Role.SYSTEM || userRole === Role.ADMIN) {
    return true;
  }

  const classroomTeacher = await prisma.classroomTeacher.findFirst({
    where: {
      classroomId,
      teacherId: userId,
    },
  });

  return !!classroomTeacher;
}

/**
 * Convert data to CSV format
 */
function convertToCSV(data: any[], headers: string[]): string {
  const csvRows = [];
  
  // Add header row
  csvRows.push(headers.join(','));
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Escape values containing commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

/**
 * GET /api/v1/teacher/class/[classroomId]/export
 * Export class data
 */
export async function exportClassData(
  req: ExtendedNextRequest,
  ctx: RequestContext
) {
  try {
    const { classroomId } = await ctx.params;
    const session = req.session;

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = session.user;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'csv';

    // Verify access
    const hasAccess = await verifyClassAccess(classroomId, user.id, user.role as Role);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Get classroom info
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
    });

    if (!classroom) {
      return NextResponse.json(
        { error: "Class not found" },
        { status: 404 }
      );
    }

    // Get students with their basic info
    const classroomStudents = await prisma.classroomStudent.findMany({
      where: { classroomId },
      select: {
        studentId: true,
        createdAt: true,
      },
    });

    const studentIds = classroomStudents.map(cs => cs.studentId);

    const students = await prisma.user.findMany({
      where: {
        id: {
          in: studentIds,
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        level: true,
        cefrLevel: true,
        xp: true,
      },
    });

    // Get assignment completion counts
    const studentAssignments = await prisma.studentAssignment.groupBy({
      by: ['studentId', 'status'],
      where: {
        studentId: {
          in: studentIds,
        },
        assignment: {
          classroomId,
        },
      },
      _count: true,
    });

    // Prepare export data
    const exportData = students.map(student => {
      const joinedAt = classroomStudents.find(cs => cs.studentId === student.id)?.createdAt;
      const completed = studentAssignments.find(
        sa => sa.studentId === student.id && sa.status === 'COMPLETED'
      )?._count || 0;
      const inProgress = studentAssignments.find(
        sa => sa.studentId === student.id && sa.status === 'IN_PROGRESS'
      )?._count || 0;

      return {
        studentId: student.id,
        name: student.name || 'N/A',
        email: student.email,
        level: student.level,
        cefrLevel: student.cefrLevel,
        xp: student.xp,
        joinedAt: joinedAt?.toISOString() || '',
        assignmentsCompleted: completed,
        assignmentsPending: inProgress,
      };
    });

    if (format === 'csv') {
      const headers = [
        'studentId',
        'name',
        'email',
        'level',
        'cefrLevel',
        'xp',
        'joinedAt',
        'assignmentsCompleted',
        'assignmentsPending',
      ];
      
      const csv = convertToCSV(exportData, headers);
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="class-${classroom.classCode}-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else {
      // JSON export
      return NextResponse.json({
        classroom: {
          id: classroom.id,
          name: classroom.classroomName,
          classCode: classroom.classCode,
        },
        exportedAt: new Date().toISOString(),
        students: exportData,
      });
    }
  } catch (error) {
    console.error("Error exporting class data:", error);
    return NextResponse.json(
      { error: "Failed to export class data" },
      { status: 500 }
    );
  }
}
