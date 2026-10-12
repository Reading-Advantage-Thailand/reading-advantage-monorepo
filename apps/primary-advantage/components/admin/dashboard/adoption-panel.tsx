import { useTranslations } from "next-intl";
import { Meter, Panel, Sign } from "@/components/rpg/chrome";
import { Link } from "@/i18n/navigation";
import { dashboardHref, type AdoptionView } from "./href";
import type { AdoptionRow, DashboardRange } from "@reading-advantage/domain/primary-dashboards";

/**
 * The adoption panel (FR-4, FR-5): a table by CEFR main level or by class grade, with Sign tabs.
 * @param props.cefr The rows by CEFR main level.
 * @param props.grade The rows by class grade.
 * @param props.by The open view.
 * @param props.range The range in days (for the note and the tab links).
 * @param props.school The SYSTEM school id for the tab links.
 * @param props.schoolEmpty True when the school has no students.
 * @returns The panel.
 */
export function AdoptionPanel(props: {
  cefr: AdoptionRow[];
  grade: AdoptionRow[];
  by: AdoptionView;
  range: DashboardRange;
  school?: string | null;
  schoolEmpty: boolean;
}) {
  const t = useTranslations("AdminDashboard.adoption");
  const rows = (props.by === "cefr" ? props.cefr : props.grade).filter((row) => row.students > 0);
  const tab = (view: AdoptionView, label: string) => (
    <Link
      href={dashboardHref({ range: props.range, by: view, school: props.school })}
      aria-current={props.by === view ? "true" : undefined}
      className="inline-flex min-h-12 items-center"
    >
      <Sign small active={props.by === view}>
        {label}
      </Sign>
    </Link>
  );
  return (
    <Panel aria-labelledby="admin-dash-adoption">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="admin-dash-adoption" className="text-xl font-bold">
          {t("heading")}
        </h2>
        <nav aria-label={t("heading")} className="cq-signs !p-0">
          {tab("cefr", t("byCefr"))}
          {tab("grade", t("byGrade"))}
        </nav>
      </div>
      {props.schoolEmpty || rows.length === 0 ? (
        <p className="text-[var(--cq-ink-soft)]">{t("empty")}</p>
      ) : (
        <>
          <table className="w-full text-left text-[15px]">
            <thead>
              <tr className="text-[13px] text-[var(--cq-ink-soft)]">
                <th className="py-1 pr-2 font-semibold">{props.by === "cefr" ? t("level") : t("grade")}</th>
                <th className="px-2 text-right font-semibold">{t("students")}</th>
                <th className="px-2 text-right font-semibold">{t("active")}</th>
                <th className="px-2 text-right font-semibold sm:w-[34%] sm:text-left">{t("share")}</th>
                <th className="hidden pl-2 text-right font-semibold sm:table-cell">{t("averageXp")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const label = row.key === "none" ? t("noGrade") : row.key;
                return (
                  <tr key={row.key} className="border-t border-[rgba(107,84,56,0.35)]">
                    <th scope="row" className="py-2 pr-2 font-bold">
                      {label}
                    </th>
                    <td className="px-2 text-right tabular-nums">{row.students}</td>
                    <td className="px-2 text-right tabular-nums">{row.active}</td>
                    <td className="px-2">
                      <div className="flex items-center justify-end gap-2 sm:justify-start">
                        <Meter value={row.active} max={row.students} label={`${label}: ${t("share")}`} tone="green" thin className="hidden w-full sm:block" />
                        <span className="w-10 text-right font-bold tabular-nums">{row.percent}%</span>
                      </div>
                    </td>
                    <td className="hidden pl-2 text-right tabular-nums sm:table-cell">{row.averageXp.toLocaleString("en-US")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[13px] text-[var(--cq-ink-soft)]">{t("note", { days: props.range })}</p>
        </>
      )}
    </Panel>
  );
}
