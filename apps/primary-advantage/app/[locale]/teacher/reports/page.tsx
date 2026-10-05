import { TriangleAlertIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ErrorState } from "@reading-advantage/ui";
import { currentUser } from "@/lib/session";
import AuthErrorPage from "@/app/[locale]/auth/error/page";
import TeacherProgressReports from "@/components/teacher/teacher-progress-reports";
import { TeacherPageHeader } from "@/components/teacher/teacher-shell";
import { RetryButton } from "@/components/shared/retry-button";
import { fetchClassrooms, fetchStudentsByRole } from "@/server/controllers/classroomController";

/**
 * Teacher reports: the classes and students of the teacher, with the class of the class page
 * link (`?classroomId=`) open first. A failed read shows an error with a retry, not an empty
 * list.
 * @param props.searchParams The query, with an optional `classroomId`.
 * @returns The reports page.
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ classroomId?: string | string[] }>;
}) {
  const user = await currentUser();

  if (!user) {
    return <AuthErrorPage />;
  }

  const t = await getTranslations("Reports");
  const ts = await getTranslations("TeacherStudents");
  const query = (await searchParams) ?? {};
  const initialClassroomId = typeof query.classroomId === "string" ? query.classroomId : undefined;

  const [classroomsResponse, studentsResponse] = await Promise.all([fetchClassrooms(), fetchStudentsByRole()]);
  const loaded = classroomsResponse.ok && studentsResponse.ok;
  const classrooms = loaded ? ((await classroomsResponse.json()).classrooms ?? []) : [];
  const students = loaded ? ((await studentsResponse.json()).students ?? []) : [];

  return (
    <div className="flex flex-col gap-6">
      <TeacherPageHeader title={t("title")} description={t("description")} />
      {loaded ? (
        <TeacherProgressReports
          classrooms={classrooms}
          students={students}
          currentUser={user}
          initialClassroomId={initialClassroomId}
        />
      ) : (
        <ErrorState
          className="bg-card border"
          icon={<TriangleAlertIcon />}
          title={ts("reportsLoadError")}
          description={ts("loadErrorHint")}
          action={<RetryButton />}
        />
      )}
    </div>
  );
}
