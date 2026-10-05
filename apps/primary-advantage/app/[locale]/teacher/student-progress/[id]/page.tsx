import { Header } from "@/components/header";
import { getTranslations } from "next-intl/server";
import { fetchUserActivity } from "@/server/controllers/userController";
import { getUserById } from "@/server/models/userModel";
import { currentUser } from "@/lib/session";
import { canReadUserResource } from "@/lib/authorization";
import AuthErrorPage from "@/app/[locale]/auth/error/page";
import { ReportPanels } from "@/components/dashboard/report-panels";

export default async function StudentProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
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

  const t = await getTranslations("Reports");
  const data = await fetchUserActivity(userId);

  if (!data?.activity || !data?.xpLogs) {
    return <AuthErrorPage />;
  }
  const activity = data.activity.map((row) => ({
    ...row,
    completed: row.completed ?? false,
    details: row.details ?? {},
  }));

  return (
    <>
      <Header heading={`Progress for ${data.user.name ?? data.user.username}`} />
      <ReportPanels activity={activity} xpLogs={data.xpLogs} cefrLevel={data.user.cefrLevel || "A0"} />
    </>
  );
}
