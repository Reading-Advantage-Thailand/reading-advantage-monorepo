import { getScopedI18n } from "@/locales/server";
import StudentDashboardView from "@/components/dashboard/student-dashboard-view";

export default async function StudentDashboardPage() {
  const t = await getScopedI18n("pages.student.dashboard");
  return <StudentDashboardView heading={t("title")} />;
}
