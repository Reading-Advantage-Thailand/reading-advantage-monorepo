import { Header } from "@/components/header";
import { getTranslations } from "next-intl/server";
import UserRecentActivity from "@/components/dashboard/user-recent-activity";
import { fetchUserActivity } from "@/server/controllers/userController";
import { currentUser } from "@/lib/session";
import AuthErrorPage from "@/app/[locale]/auth/error/page";
import CEFRLevels from "@/components/dashboard/user-level-indicator";
import { UserActivityChart } from "@/components/dashboard/user-activity-chart";
import UserActivityHeatMap from "@/components/dashboard/user-heatmap-chart";
import { UserXpOverAllChart } from "@/components/dashboard/user-xpoverall-chart";
import ReadingStatsChart from "@/components/dashboard/user-reading-chart";

export default async function ReportsPage() {
  const user = await currentUser();

  if (!user) {
    return <AuthErrorPage />;
  }

  const t = await getTranslations("Reports");

  const data = await fetchUserActivity(user.id);

  if (!data?.activity || !data?.xpLogs) {
    return <AuthErrorPage />;
  }

  return (
    <>
      <Header heading={t("title")} />
      <UserRecentActivity data={data.activity || []} />
      <div className="mt-4 mb-10 grid gap-4 md:grid-cols-3 lg:grid-cols-3">
        <div className="col-span-2 flex flex-col gap-4">
          <UserActivityChart
            data={data.activity || []}
            xpLogs={data.xpLogs || []}
          />
          <UserXpOverAllChart data={data.xpLogs || []} />
          <ReadingStatsChart data={data.activity || []} />
        </div>
        <div className="flex flex-col gap-4">
          <CEFRLevels currentLevel={user.cefrLevel || "A0"} />
          <UserActivityHeatMap data={data.activity || []} />
        </div>
      </div>
    </>
  );
}
