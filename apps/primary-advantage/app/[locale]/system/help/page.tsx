import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { db } from "@reading-advantage/db";
import { helpEventReport } from "@reading-advantage/domain/primary-help";
import { Panel } from "@/components/rpg/chrome";
import { Scene } from "@/components/rpg/scene";
import { Button } from "@/components/ui/button";
import { redirect } from "@/i18n/navigation";
import { HELP_VIDEOS } from "@/lib/help/videos";
import { logger } from "@/lib/observability/logger";
import { currentUser } from "@/lib/session";

/**
 * Page title for the system help report.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("SystemHelp");
  return { title: t("title") };
}

/** One table of the report: a heading, the column names, and the rows (or the empty text). */
function ReportTable({ heading, columns, rows, empty }: { heading: string; columns: string[]; rows: (string | number)[][]; empty: string }) {
  return (
    <Panel aria-label={heading} className="min-w-0">
      <h2 className="text-xl font-bold">{heading}</h2>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[15px]">
            <thead>
              <tr className="text-[13px]">
                {columns.map((column, i) => (
                  <th key={column} scope="col" className={i ? "px-1.5 text-right" : "py-1 pr-2"}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([first, ...rest]) => (
                <tr key={`${first}|${rest[0]}`} className="border-t border-[rgba(107,84,56,0.35)]">
                  <th scope="row" className="py-2 pr-2 font-bold break-all">
                    {first}
                  </th>
                  {rest.map((cell, i) => (
                    <td key={i} className="px-1.5 text-right tabular-nums">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>{empty}</p>
      )}
    </Panel>
  );
}

/**
 * System help report (track primary_in_app_help_20261023, FR-12): plays per video and role, opens
 * per page, and the pages where users opened help with no video, for 7 and 30 days, with a school
 * filter. SYSTEM only: the proxy refuses other roles, and `helpEventReport` checks the permission again.
 * @param props.searchParams `school`: an optional school id.
 * @returns The report page.
 */
export default async function SystemHelpPage({ searchParams }: { searchParams: Promise<{ school?: string }> }) {
  const user = await currentUser();
  const locale = await getLocale();
  if (!user) return redirect({ href: "/auth/signin", locale });
  const { school } = await searchParams;
  const schoolId = z.string().uuid().safeParse(school).success ? school : undefined;

  let report;
  try {
    report = await helpEventReport({ db, user, input: { schoolId } });
  } catch (error) {
    logger.error("system_help_report_failed", { error, userId: user.id });
    throw error;
  }

  const t = await getTranslations("SystemHelp");
  const title = (id: string) => {
    const video = HELP_VIDEOS.find((v) => v.id === id);
    return video ? `${id} · ${locale === "th" ? video.title.th : video.title.en}` : id;
  };
  const pages = (rows: typeof report.opens) => rows.map((row) => [row.routePattern, row.last7, row.last30]);

  return (
    <Scene place="observatory" contained className="px-1 py-4 sm:px-3">
      <header className="cq-on-scene flex flex-col gap-1">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-lg">{t("intro")}</p>
      </header>
      <form method="get" className="cq-on-scene flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span>{t("school")}</span>
          <select name="school" defaultValue={schoolId ?? ""} className="bg-background min-h-11 rounded-md border px-2">
            <option value="">{t("allSchools")}</option>
            {report.schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" className="min-h-11 cursor-pointer">
          {t("show")}
        </Button>
      </form>
      <ReportTable
        heading={t("plays")}
        columns={[t("video"), t("role"), t("last7"), t("last30")]}
        rows={report.plays.map((row) => [title(row.videoId), t("roleName", { role: row.role }), row.last7, row.last30])}
        empty={t("empty")}
      />
      <ReportTable heading={t("opens")} columns={[t("page"), t("last7"), t("last30")]} rows={pages(report.opens)} empty={t("empty")} />
      <ReportTable heading={t("unmatched")} columns={[t("page"), t("last7"), t("last30")]} rows={pages(report.unmatched)} empty={t("emptyUnmatched")} />
    </Scene>
  );
}
