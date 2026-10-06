import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { currentUser } from "@/lib/session";
import AuthErrorPage from "@/app/[locale]/auth/error/page";
import StudentAssignmentList, { type AssignmentStudent } from "@/components/student/assignment-list";
import { AssignmentListSkeleton } from "@/components/student/assignment-list-skeleton";
import { getStudentAssignments } from "@/server/models/assignmentModel";
import { Banner } from "@/components/rpg/chrome";
import { Scene } from "@/components/rpg/scene";

/**
 * Page title for the student assignments.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("StudentAssignments");
  return { title: t("title") };
}

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
 * Fetches the first assignments page on the server and renders the card list. A load failure
 * goes to the route error boundary (error.tsx), which offers a retry.
 * @returns The assignment list with server-fetched initial data.
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
    <StudentAssignmentList
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
  const t = await getTranslations("StudentAssignments");
  // The notices on the guild hall board (docs/primary-rpg-skin.md §4).
  return (
    <Scene place="guild-hall">
      <Banner>
        <h1 className="m-0 text-[length:inherit] font-bold">{t("title")}</h1>
      </Banner>
      <Suspense fallback={<AssignmentListSkeleton />}>
        <AssignmentsData />
      </Suspense>
    </Scene>
  );
}
