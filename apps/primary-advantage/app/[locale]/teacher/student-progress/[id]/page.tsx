import { Header } from "@/components/header";
import { getTranslations } from "next-intl/server";
import UserRecentActivity from "@/components/dashboard/user-recent-activity";
import { fetchUserActivity } from "@/server/controllers/userController";
import { getUserById } from "@/server/models/userModel";
import { currentUser } from "@/lib/session";
import { canReadUserResource } from "@/lib/authorization";
import AuthErrorPage from "@/app/[locale]/auth/error/page";
import CEFRLevels from "@/components/dashboard/user-level-indicator";
import { UserActivityChart } from "@/components/dashboard/user-activity-chart";
import UserActivityHeatMap from "@/components/dashboard/user-heatmap-chart";
import { UserXpOverAllChart } from "@/components/dashboard/user-xpoverall-chart";
import ReadingStatsChart from "@/components/dashboard/user-reading-chart";

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
      <UserRecentActivity data={activity} />
      <div className="mt-4 mb-10 grid gap-4 md:grid-cols-3 lg:grid-cols-3">
        <div className="col-span-2 flex flex-col gap-4">
          <UserActivityChart
            data={activity}
            xpLogs={data.xpLogs}
          />
          <UserXpOverAllChart data={data.xpLogs} />
          <ReadingStatsChart data={activity} />
        </div>
        <div className="flex flex-col gap-4">
          <CEFRLevels currentLevel={data.user.cefrLevel || "A0"} />
          <UserActivityHeatMap data={activity} />
        </div>
      </div>
    </>
  );
}
