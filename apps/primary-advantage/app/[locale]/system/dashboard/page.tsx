import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { db } from "@reading-advantage/db";
import { getPlatformOverview } from "@reading-advantage/domain/primary-dashboards";
import { intlLocale } from "@/lib/intl-locale";
import { currentUser } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { logger } from "@/lib/observability/logger";
import { Scene } from "@/components/rpg/scene";
import { PlatformTotalsPanel } from "@/components/system/platform-totals";
import { SchoolsTable } from "@/components/system/schools-table";

/**
 * Page title for the system dashboard.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("SystemDashboard");
  return { title: t("title") };
}

/**
 * System dashboard (SYS-01): the platform totals and one row for each school. SYSTEM only: the
 * proxy refuses other roles, and `getPlatformOverview` checks the permission again. A load
 * failure is logged and goes to the route error boundary (error.tsx).
 * @returns The dashboard page.
 */
export default async function SystemDashboardPage() {
  const user = await currentUser();
  if (!user) return redirect({ href: "/auth/signin", locale: await getLocale() });

  let data;
  try {
    data = await getPlatformOverview({ db, user });
  } catch (error) {
    logger.error("system_dashboard_failed", { error, userId: user.id });
    throw error;
  }

  const [t, format] = await Promise.all([getTranslations("SystemDashboard"), getFormatter({ locale: intlLocale(await getLocale()) })]);
  // The days are Bangkok calendar days, so they print in UTC without a shift.
  const day = (value: string) => format.dateTime(new Date(`${value}T00:00:00Z`), { day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <Scene place="observatory" contained className="px-1 py-4 sm:px-3">
      <header className="cq-on-scene flex flex-col gap-1">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-lg">{t("week", { start: day(data.startDay), end: day(data.endDay) })}</p>
      </header>
      {data.schools.length ? <PlatformTotalsPanel totals={data.totals} /> : null}
      <SchoolsTable rows={data.schools} />
    </Scene>
  );
}
