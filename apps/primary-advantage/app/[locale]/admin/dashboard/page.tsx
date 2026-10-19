import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@reading-advantage/db";
import { dashboardRangeSchema, getSchoolDashboard } from "@reading-advantage/domain/primary-dashboards";
import { intlFormatter } from "@/lib/intl-locale";
import { currentUser } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { logger } from "@/lib/observability/logger";
import { resolveCreationSchoolId } from "@/server/utils/auth";
import { Scene } from "@/components/rpg/scene";
import { Panel } from "@/components/rpg/chrome";
import { ActivityByDay } from "@/components/admin/dashboard/activity-by-day";
import { AdoptionPanel } from "@/components/admin/dashboard/adoption-panel";
import { AlertList } from "@/components/admin/dashboard/alert-list";
import { KeyNumbers } from "@/components/admin/dashboard/key-numbers";
import { RangeSigns } from "@/components/admin/dashboard/range-signs";
import { SchoolPicker } from "@/components/admin/dashboard/school-picker";
import { TeachersTable } from "@/components/admin/dashboard/teachers-table";

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Page title for the school dashboard.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminDashboard");
  return { title: t("title") };
}

/**
 * Reads one URL value as a single string.
 * @param value The raw search param.
 * @returns The string, or undefined when the value is missing or repeated.
 */
function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * School admin dashboard (FR-12): the key numbers, alerts, adoption, teachers, and activity by day
 * of one school for 7, 30, or 90 days. The school comes from `resolveCreationSchoolId`: an ADMIN
 * always gets the session school, and a SYSTEM user names the school with `?school=`. A SYSTEM
 * user without a valid school sees the selector and no numbers. A load failure goes to the route
 * error boundary (error.tsx).
 * @param props.searchParams The URL values `range`, `by`, and `school`.
 * @returns The dashboard page.
 */
export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await currentUser();
  if (!user) return redirect({ href: "/auth/signin", locale: await getLocale() });

  const query = await searchParams;
  const range = dashboardRangeSchema.parse(single(query.range));
  const by = single(query.by) === "grade" ? "grade" : "cefr";
  const isSystem = user.role === "SYSTEM";
  // SYSTEM names the school with ?school= only, so its own school never fills in (AC-4).
  // The session role wins in resolveCreationSchoolId, so the legacy role rows stay empty.
  const resolved = await resolveCreationSchoolId({ schoolId: isSystem ? null : user.schoolId, role: user.role, roles: [], SchoolAdmins: [] }, single(query.school));
  const schoolId = "schoolId" in resolved ? resolved.schoolId : null;

  let data = null;
  if (schoolId) {
    try {
      data = await getSchoolDashboard({ db, user, input: { schoolId, range } });
    } catch (error) {
      logger.error("admin_dashboard_failed", { error, userId: user.id, schoolId, range });
      throw error;
    }
  }

  const [t, format] = await Promise.all([getTranslations("AdminDashboard"), getLocale().then(intlFormatter)]);
  const day = (value: string) => format.dateTime(new Date(`${value}T00:00:00Z`), { day: "numeric", month: "short", timeZone: "UTC" });
  const schoolEmpty = !!data && data.kpis.activeStudents.total === 0;
  const schoolParam = isSystem ? schoolId : null;

  return (
    <Scene place="observatory" contained className="px-1 py-4 sm:px-3">
      <header className="cq-on-scene flex flex-col gap-1">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        {data ? <p className="text-lg">{t("period", { start: day(data.startDay), end: day(data.endDay) })}</p> : null}
      </header>

      {isSystem ? <SchoolPicker value={schoolId ?? ""} range={range} by={by} /> : null}

      {!data || !schoolId ? (
        <Panel pinned className="items-center gap-2 py-8 text-center">
          <h2 className="text-2xl font-bold">{t("chooseSchool")}</h2>
          <p className="text-[var(--cq-ink-soft)]">{t("chooseSchoolHint")}</p>
        </Panel>
      ) : (
        <>
          <RangeSigns range={data.range} by={by} school={schoolParam} />
          <KeyNumbers kpis={data.kpis} />
          <AlertList alerts={data.alerts} schoolEmpty={schoolEmpty} />
          <AdoptionPanel cefr={data.adoptionByCefr} grade={data.adoptionByGrade} by={by} range={data.range} school={schoolParam} schoolEmpty={schoolEmpty} />
          <TeachersTable teachers={data.teachers} />
          <ActivityByDay activity={data.activityByDay} endDay={data.endDay} schoolEmpty={schoolEmpty} />
        </>
      )}
    </Scene>
  );
}
