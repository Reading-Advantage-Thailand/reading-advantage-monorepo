import { Suspense } from "react";
import { currentUser } from "@/lib/session";
import React from "react";
import AuthErrorPage from "@/app/[locale]/auth/error/page";
import StudentAssignmentTable, {
  type AssignmentStudent,
} from "@/components/student-assignment-table";
import { getStudentAssignments } from "@/server/models/assignmentModel";

/**
 * Serializes a model date to an ISO string.
 * @param value The date value from the model.
 * @returns The ISO string, or null when absent.
 */
function toIso(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/**
 * Fetches the first assignments page on the server and renders the table.
 * @returns The assignment table with server-fetched initial data.
 */
async function AssignmentsData() {
  const user = await currentUser();

  if (!user) {
    return <AuthErrorPage />;
  }

  const { assignments, pagination } = await getStudentAssignments({
    studentId: user.id,
    page: 1,
    limit: 10,
  });

  const initialAssignments: AssignmentStudent[] = assignments
    .filter(
      (
        row,
      ): row is typeof row & {
        assignment: NonNullable<typeof row.assignment>;
      } => row.assignment !== null,
    )
    .map((row) => {
      const nested = row.assignment;
      return {
        id: row.id,
        studentId: row.studentId,
        status: (row.status ?? null) as AssignmentStudent["status"],
        score: row.score,
        startedAt: toIso(row.startedAt),
        assignmentId: row.assignmentId,
        createdAt: toIso(row.createdAt) ?? "",
        completedAt: toIso(row.completedAt),
        assignment: {
          id: nested.id ?? "",
          classroomId: nested.classroomId ?? "",
          articleId: nested.articleId,
          lessonId: nested.lessonId,
          title: nested.title ?? "",
          type: nested.type ?? "",
          description: nested.description,
          dueDate: toIso(nested.dueDate),
          createdAt: toIso(nested.createdAt) ?? "",
          teacherId: nested.teacherId ?? "",
          teacherName: nested.teacherName,
        },
      };
    });

  return (
    <StudentAssignmentTable
      initialAssignments={initialAssignments}
      initialPagination={pagination}
    />
  );
}

/**
 * Student assignments page. Streams the server-fetched first page under
 * Suspense while later filtering and paging stay client-side.
 * @returns The assignments page.
 */
export default async function AssignmentsPage() {
  const user = await currentUser();

  if (!user) {
    return <AuthErrorPage />;
  }
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-8" aria-busy="true">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
        </div>
      }
    >
      <AssignmentsData />
    </Suspense>
  );
}
