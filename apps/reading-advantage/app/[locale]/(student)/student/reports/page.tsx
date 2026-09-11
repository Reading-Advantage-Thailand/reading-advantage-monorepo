import { getScopedI18n } from "@/locales/server";
import StudentDashboardView from "@/components/dashboard/student-dashboard-view";

export default async function ReportsPage() {
  const t = await getScopedI18n("pages.student.reportpage");
  return <StudentDashboardView heading={t("title")} />;
}
