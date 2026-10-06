import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TriangleAlertIcon } from "lucide-react";
import { ErrorState } from "@reading-advantage/ui";
import { fetchUserActivity } from "@/server/controllers/userController";
import { currentUser } from "@/lib/session";
import AuthErrorPage from "@/app/[locale]/auth/error/page";
import { ReportPanels } from "@/components/dashboard/report-panels";
import { RetryButton } from "@/components/shared/retry-button";
import { Scene } from "@/components/rpg/scene";

/**
 * Page title for the student reports.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Reports");
  return { title: t("title") };
}

/**
 * Student reports: recent activity, XP charts, reading stats, the level gauge, and the activity
 * heatmap. When the activity fails to load, the page shows an error with a retry (it showed the
 * sign-in error page before).
 * @returns The reports page.
 */
export default async function ReportsPage() {
  const user = await currentUser();

  if (!user) {
    return <AuthErrorPage />;
  }

  const [t, data] = await Promise.all([getTranslations("Reports"), fetchUserActivity(user.id)]);

  const header = (
    <header className="cq-on-scene flex flex-col gap-1">
      <h1 className="text-2xl font-bold md:text-3xl">{t("title")}</h1>
    </header>
  );

  if (!data?.activity || !data?.xpLogs) {
    return (
      <Scene place="observatory">
        {header}
        <ErrorState
          className="cq-panel"
          icon={<TriangleAlertIcon />}
          title={t("loadError")}
          description={t("loadErrorHint")}
          action={<RetryButton />}
        />
      </Scene>
    );
  }

  const activity = data.activity.map((row) => ({
    ...row,
    completed: row.completed ?? false,
    details: row.details ?? {},
  }));

  // Charts on parchment in the observatory (docs/primary-rpg-skin.md §4).
  return (
    <Scene place="observatory" className="gap-2">
      {header}
      <ReportPanels activity={activity} xpLogs={data.xpLogs} cefrLevel={user.cefrLevel || "A0"} />
    </Scene>
  );
}
