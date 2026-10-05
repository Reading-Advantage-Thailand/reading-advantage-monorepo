import { ArrowLeft, TriangleAlertIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ErrorState } from "@reading-advantage/ui";
import { fetchUserActivity } from "@/server/controllers/userController";
import { getUserById } from "@/server/models/userModel";
import { currentUser } from "@/lib/session";
import { canReadUserResource } from "@/lib/authorization";
import AuthErrorPage from "@/app/[locale]/auth/error/page";
import { ReportPanels } from "@/components/dashboard/report-panels";
import { RetryButton } from "@/components/shared/retry-button";
import { TEACHER_BACK_LINK, TeacherPageHeader } from "@/components/teacher/teacher-shell";
import { Link } from "@/i18n/navigation";

/** A class id from the query: letters, digits, and dashes only (it only builds the back link). */
const CLASS_ID = /^[A-Za-z0-9-]{1,64}$/;

/**
 * Progress of one student for a teacher: a back link (to the class when the class page opened
 * the page with `?classroomId=`, otherwise to the reports), the heading "Progress for {name}",
 * and the report panels for a teacher. When the activity cannot load, the page shows an error
 * with a retry, not the sign-in error. A user who may not read the student gets the sign-in
 * error before any activity read.
 * @param props.params The route parameters, with the student id.
 * @param props.searchParams The query, with an optional `classroomId`.
 * @returns The student progress page.
 */
export default async function StudentProgressPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ classroomId?: string | string[] }>;
}) {
  const userId = (await params).id;

  const user = await currentUser();

  if (!user) {
    return <AuthErrorPage />;
  }

  const target = await getUserById(userId);

  if (
    !target ||
    !canReadUserResource(
      { id: user.id, role: user.role, schoolId: user.schoolId },
      { id: target.id, schoolId: target.schoolId },
    )
  ) {
    return <AuthErrorPage />;
  }

  const t = await getTranslations("TeacherStudents");
  const query = (await searchParams) ?? {};
  const classroomId = typeof query.classroomId === "string" && CLASS_ID.test(query.classroomId) ? query.classroomId : null;
  const data = await fetchUserActivity(userId);
  const name = data?.user ? (data.user.name ?? data.user.username) : (target.name ?? target.username);

  const back = classroomId ? (
    <Link href={`/teacher/class-roster/${classroomId}`} className={TEACHER_BACK_LINK}>
      <ArrowLeft aria-hidden="true" />
      {t("backToClass")}
    </Link>
  ) : (
    <Link href="/teacher/reports" className={TEACHER_BACK_LINK}>
      <ArrowLeft aria-hidden="true" />
      {t("backToReports")}
    </Link>
  );
  const header = <TeacherPageHeader back={back} title={name ? t("progressHeading", { name }) : t("progressTitle")} />;

  if (!data?.activity || !data?.xpLogs) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorState
          className="bg-card border"
          icon={<TriangleAlertIcon />}
          title={t("activityLoadError")}
          description={t("loadErrorHint")}
          action={<RetryButton />}
        />
      </div>
    );
  }

  const activity = data.activity.map((row) => ({
    ...row,
    completed: row.completed ?? false,
    details: row.details ?? {},
  }));

  return (
    <div className="flex flex-col gap-6">
      {header}
      <div className="min-w-0">
        <ReportPanels
          activity={activity}
          xpLogs={data.xpLogs}
          cefrLevel={data.user.cefrLevel || "A0"}
          audience="teacher"
        />
      </div>
    </div>
  );
}
